-- Horkos WM - Un client qui a un référent ne réserve que chez son référent
-- Run this in the Supabase SQL Editor. Safe to re-run.
-- Requires 010_booking.sql, 011_appointment_mode.sql et 024_duree_par_etape.sql.
--
-- Jusqu'ici la réservation cherchait « le conseiller libre le moins chargé »,
-- sans jamais regarder `profiles.advisor_id`. Un client suivi par Untel pouvait
-- donc réserver son point de suivi chez quelqu'un d'autre, et le calendrier lui
-- montrait des créneaux libres qui l'étaient chez un conseiller qui n'est pas le
-- sien. Tout le reste de la plateforme raisonne pourtant par référent - c'est la
-- règle de `client-access`, celle des rappels, celle du dossier.
--
-- Deux fonctions s'alignent donc sur cette règle, et de la même façon :
--   - `get_slot_availability` : ce que le client VOIT devient la disponibilité
--     de son seul référent ;
--   - `book_slot` : ce qu'il OBTIENT est ce même créneau, chez ce référent.
-- Les deux doivent bouger ensemble. Ne corriger que la réservation laisserait
-- le calendrier promettre des heures qu'il ne peut plus tenir.
--
-- Un visiteur anonyme et un client sans référent gardent le comportement
-- d'avant : tout le cabinet, le moins chargé l'emporte.

-- ============================================
-- LE RÉFÉRENT D'UN CLIENT
-- ============================================
-- `security definer` : la RLS de `profiles` laisse un client lire sa propre
-- ligne, mais pas celle de son conseiller - or il faut vérifier que ce dernier
-- porte toujours le rôle. La fonction reste interne (aucun grant), sans quoi
-- n'importe qui pourrait demander le référent de n'importe quel client.
--
-- Rend `null` si le client n'existe pas, n'a pas de référent, ou si son référent
-- n'est plus conseiller : un compte rétrogradé ne doit pas bloquer à jamais la
-- réservation de ses anciens clients, qui retombent alors sur le cabinet entier.
create or replace function public._booking_referent(p_client uuid)
returns uuid
language sql stable
security definer
set search_path = public
as $$
  select a.id
    from public.profiles p
    join public.profiles a on a.id = p.advisor_id
   where p.id = p_client
     and a.role = 'conseiller';
$$;

comment on function public._booking_referent(uuid) is
  'Le conseiller référent d''un client, s''il en a un et qu''il est toujours conseiller. Interne à la réservation.';

-- ============================================
-- OCCUPATION D'UN CONSEILLER DONNÉ
-- ============================================
-- Pendant de `_booking_busy`, mais sur une seule personne : rend 0 ou plus,
-- jamais une capacité. Zéro signifie « ce conseiller est libre sur l'intervalle ».
--
-- Les holds des autres sont comptés comme dans `_booking_busy`, alors qu'ils ne
-- désignent aucun conseiller. C'est volontairement prudent : un hold ne vit que
-- cinq minutes, et afficher un créneau libre qui ne l'est déjà plus est le seul
-- défaut que la réservation ne doit pas avoir. Le verrou de `book_slot` reste
-- de toute façon la garantie contre le double booking.
create or replace function public._booking_advisor_busy(
  p_advisor uuid,
  p_start timestamptz,
  p_exclude_token uuid,
  p_duration int default 60
)
returns int
language sql stable
set search_path = public
as $$
  select (
    select count(*)
      from public.appointments a
     where a.advisor_id = p_advisor
       and a.status in ('planifie', 'confirme')
       and a.date < p_start + make_interval(mins => p_duration)
       and a.date + make_interval(mins => coalesce(a.duration_minutes, 60)) > p_start
  )::int
  + (
    select count(*)
      from public.slot_holds h
     where h.expires_at > now()
       and (p_exclude_token is null or h.hold_token <> p_exclude_token)
       and h.slot_start < p_start + make_interval(mins => p_duration)
       and h.slot_start + interval '60 minutes' > p_start
  )::int;
$$;

-- ============================================
-- DISPONIBILITÉ
-- ============================================
-- La signature ne change pas : le référent se déduit de `auth.uid()`, et non
-- d'un paramètre que le navigateur pourrait choisir. Un client ne peut donc pas
-- demander l'agenda d'un autre conseiller que le sien.
create or replace function public.get_slot_availability(
  p_from date,
  p_to date,
  p_token uuid default null
)
returns table (slot_start timestamptz, remaining int)
language sql stable
security definer
set search_path = public
as $$
  with referent as (
    select public._booking_referent(auth.uid()) as id
  ),
  conseillers as (
    select count(*)::int as total from public.profiles where role = 'conseiller'
  ),
  starts as (
    select make_timestamptz(
             extract(year from d)::int,
             extract(month from d)::int,
             extract(day from d)::int,
             m / 60, m % 60, 0,
             'Africa/Casablanca'
           ) as s
      from generate_series(p_from, p_to, interval '1 day') as d
      cross join unnest(public._booking_starts()) as m
     where extract(isodow from d) between 1 and 5
  )
  select s as slot_start,
         case
           when (select id from referent) is null
             then greatest(0, (select total from conseillers) - public._booking_busy(s, p_token))
           -- Un seul agenda compte : la capacité vaut un, et elle tombe à zéro
           -- dès que le référent est pris.
           else greatest(
             0,
             1 - public._booking_advisor_busy((select id from referent), s, p_token)
           )
         end as remaining
    from starts
   where s >= now() + interval '2 hours'
   order by s;
$$;

-- ============================================
-- RÉSERVATION
-- ============================================
create or replace function public.book_slot(
  p_slot_start timestamptz,
  p_token uuid,
  p_type text default 'R0',
  p_request_id uuid default null,
  p_mode text default 'presentiel',
  p_meeting_url text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  total int;
  duree int;
  referent uuid;
  chosen uuid;
  appt uuid;
  advisor record;
begin
  if not public._is_valid_slot_start(p_slot_start)
     or p_type not in ('R0', 'R1', 'R2', 'revue', 'autre')
     or p_mode not in ('presentiel', 'visio') then
    return null;
  end if;

  duree := public._booking_duration(p_type);
  referent := public._booking_referent(auth.uid());

  delete from public.slot_holds where expires_at <= now();

  -- Le point où une course créerait un double booking : deux réservations du
  -- même créneau s'exécutent ici l'une après l'autre, jamais ensemble.
  perform pg_advisory_xact_lock(hashtext('booking-' || p_slot_start::text));

  if referent is not null then
    -- Le dossier est piloté : seul l'agenda du référent est consulté, et c'est
    -- lui qui prend le rendez-vous. Occupé, le créneau n'est pas réservable -
    -- même si d'autres conseillers sont libres.
    if public._booking_advisor_busy(referent, p_slot_start, p_token, duree) > 0 then
      return null;
    end if;

    select p.id, p.first_name, p.last_name, p.email
      into advisor
      from public.profiles p
     where p.id = referent;
  else
    select count(*)::int into total from public.profiles where role = 'conseiller';
    if total - public._booking_busy(p_slot_start, p_token, duree) <= 0 then
      return null;
    end if;

    -- Conseiller libre le moins chargé sur la journée. Il en existe au moins un :
    -- la capacité restante vient d'être vérifiée sous verrou.
    select p.id, p.first_name, p.last_name, p.email
      into advisor
      from public.profiles p
     where p.role = 'conseiller'
       and not exists (
         select 1 from public.appointments a
          where a.advisor_id = p.id
            and a.status in ('planifie', 'confirme')
            and a.date < p_slot_start + make_interval(mins => duree)
            and a.date + make_interval(mins => coalesce(a.duration_minutes, 60)) > p_slot_start
       )
     order by (
         select count(*) from public.appointments a
          where a.advisor_id = p.id
            and a.status in ('planifie', 'confirme')
            and a.date >= date_trunc('day', p_slot_start at time zone 'Africa/Casablanca')
                            at time zone 'Africa/Casablanca'
            and a.date <  (date_trunc('day', p_slot_start at time zone 'Africa/Casablanca')
                            + interval '1 day') at time zone 'Africa/Casablanca'
       ) asc, p.id
     limit 1;
  end if;

  if advisor.id is null then
    return null;
  end if;
  chosen := advisor.id;

  insert into public.appointments
    (client_id, advisor_id, type, status, date, duration_minutes, mode, meeting_url)
  values
    (auth.uid(), chosen, p_type, 'confirme', p_slot_start, duree, p_mode,
     case when p_mode = 'visio' then p_meeting_url end)
  returning id into appt;

  delete from public.slot_holds where hold_token = p_token;

  -- Rattache la demande du questionnaire, si elle vient d'en créer une.
  if p_request_id is not null then
    update public.appointment_requests
       set appointment_id = appt,
           status = 'planifie'
     where id = p_request_id
       and appointment_id is null;
  end if;

  return jsonb_build_object(
    'appointment_id', appt,
    'slot_start', p_slot_start,
    'mode', p_mode,
    'advisor_first_name', advisor.first_name,
    'advisor_last_name', advisor.last_name,
    'advisor_email', advisor.email
  );
end;
$$;

-- ============================================
-- DROITS
-- ============================================
-- Les deux fonctions internes restent sans grant : seules `book_slot` et
-- `get_slot_availability`, exécutées en tant que propriétaire, les appellent.
revoke all on function public._booking_referent(uuid) from public;
revoke all on function public._booking_advisor_busy(uuid, timestamptz, uuid, int) from public;

revoke all on function public.get_slot_availability(date, date, uuid) from public;
grant execute on function public.get_slot_availability(date, date, uuid) to anon, authenticated;

revoke all on function public.book_slot(timestamptz, uuid, text, uuid, text, text) from public;
grant execute on function public.book_slot(timestamptz, uuid, text, uuid, text, text) to anon, authenticated;

-- ============================================
-- AUTO-VÉRIFICATION
-- ============================================
do $$
begin
  if to_regprocedure('public._booking_referent(uuid)') is null then
    raise exception '_booking_referent n''a pas été créée.';
  end if;
  if to_regprocedure('public._booking_advisor_busy(uuid, timestamptz, uuid, int)') is null then
    raise exception '_booking_advisor_busy n''a pas été créée.';
  end if;
  if to_regprocedure('public.book_slot(timestamptz, uuid, text, uuid, text, text)') is null then
    raise exception 'book_slot a disparu.';
  end if;

  raise notice 'Réservation alignée sur le référent : un client suivi ne réserve que chez son conseiller.';
end $$;
