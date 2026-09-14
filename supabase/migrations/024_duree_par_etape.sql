-- Horkos WM - La durée d'un rendez-vous dépend de son étape
-- Run this in the Supabase SQL Editor. Safe to re-run.
-- Requires 010_booking.sql et 011_appointment_mode.sql.
--
-- Jusqu'ici tout rendez-vous durait une heure, en base comme dans l'agenda.
-- Les trois étapes du parcours n'ont pourtant pas le même format : l'audit
-- tient en 45 minutes, la présentation de la stratégie en demande 90, la mise
-- en place une heure.
--
-- Ce n'est pas un détail d'affichage. `_booking_busy` et `book_slot` calculent
-- la disponibilité par intervalle réel (`date + duration_minutes`) : une durée
-- fausse en base, et deux rendez-vous finissent par se chevaucher chez le même
-- conseiller.
--
-- Miroir côté application : `src/lib/rendez-vous.ts` (DUREES). Si l'une change,
-- changer l'autre - son test verrouille les valeurs.

-- ============================================
-- LA DURÉE D'UNE ÉTAPE
-- ============================================
create or replace function public._booking_duration(p_type text)
returns int
language sql immutable
as $$
  -- `revue`, `autre` et toute valeur écrite à la main retombent sur une heure.
  select case p_type
           when 'R0' then 45
           when 'R1' then 90
           when 'R2' then 60
           else 60
         end;
$$;

comment on function public._booking_duration(text) is
  'Durée en minutes d''un rendez-vous selon son étape. Miroir de DUREES dans src/lib/rendez-vous.ts.';

-- ============================================
-- OCCUPATION : la fenêtre examinée suit la durée demandée
-- ============================================
-- La version à deux paramètres est SUPPRIMÉE, pas laissée à côté : deux
-- fonctions de même nom dont l'une a un paramètre par défaut rendent l'appel à
-- deux arguments ambigu pour Postgres (« function is not unique »).
--
-- `get_slot_availability` continue donc d'appeler `_booking_busy(s, p_token)`,
-- qui retombe sur le défaut d'une heure. C'est voulu : le calendrier ne sait pas
-- quelle étape sera réservée, et une heure est la plus longue des durées
-- réservables en ligne (R0 45 min, revue 60). Il ne promet jamais un créneau
-- qu'il ne pourrait pas tenir.
drop function if exists public._booking_busy(timestamptz, uuid);

create or replace function public._booking_busy(
  p_start timestamptz,
  p_exclude_token uuid,
  p_duration int default 60
)
returns int
language sql stable
set search_path = public
as $$
  select (
    select count(distinct coalesce(a.advisor_id::text, a.id::text))
      from public.appointments a
     where a.status in ('planifie', 'confirme')
       and a.date < p_start + make_interval(mins => p_duration)
       and a.date + make_interval(mins => coalesce(a.duration_minutes, 60)) > p_start
  )::int
  + (
    -- Un hold ne connaît pas l'étape de celui qui le pose : il réserve une
    -- heure pleine, la plus longue des durées courantes. Prudent par défaut -
    -- un créneau tenu cinq minutes de trop vaut mieux qu'un double booking.
    select count(*)
      from public.slot_holds h
     where h.expires_at > now()
       and (p_exclude_token is null or h.hold_token <> p_exclude_token)
       and h.slot_start < p_start + make_interval(mins => p_duration)
       and h.slot_start + interval '60 minutes' > p_start
  )::int;
$$;

-- ============================================
-- RÉSERVATION
-- ============================================
-- Même corps qu'en 011, à trois endroits près : la durée est calculée depuis le
-- type, puis utilisée pour juger de la capacité, pour écarter les conseillers
-- déjà pris, et pour l'insertion.
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

  delete from public.slot_holds where expires_at <= now();

  -- Le point où une course créerait un double booking : deux réservations du
  -- même créneau s'exécutent ici l'une après l'autre, jamais ensemble.
  perform pg_advisory_xact_lock(hashtext('booking-' || p_slot_start::text));

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

-- Recréée à l'identique : elle se lie ainsi explicitement à la nouvelle
-- `_booking_busy`, plutôt que de dépendre du moment où Postgres résout le nom.
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
  with conseillers as (
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
         greatest(0, (select total from conseillers) - public._booking_busy(s, p_token)) as remaining
    from starts
   where s >= now() + interval '2 hours'
   order by s;
$$;

revoke all on function public.get_slot_availability(date, date, uuid) from public;
grant execute on function public.get_slot_availability(date, date, uuid) to anon, authenticated;

revoke all on function public._booking_duration(text) from public;
revoke all on function public._booking_busy(timestamptz, uuid, int) from public;
revoke all on function public.book_slot(timestamptz, uuid, text, uuid, text, text) from public;
grant execute on function public.book_slot(timestamptz, uuid, text, uuid, text, text) to anon, authenticated;

-- ============================================
-- AUTO-VÉRIFICATION
-- ============================================
do $$
begin
  if public._booking_duration('R0') <> 45
     or public._booking_duration('R1') <> 90
     or public._booking_duration('R2') <> 60
     or public._booking_duration('revue') <> 60 then
    raise exception 'Les durées par étape ne sont pas celles attendues.';
  end if;

  if to_regprocedure('public.book_slot(timestamptz, uuid, text, uuid, text, text)') is null then
    raise exception 'book_slot a disparu.';
  end if;

  -- L'ancienne signature à deux arguments doit avoir disparu, sinon l'appel de
  -- get_slot_availability devient ambigu.
  if to_regprocedure('public._booking_busy(timestamptz, uuid)') is not null then
    raise exception 'L''ancienne _booking_busy existe encore : appel ambigu.';
  end if;

  raise notice 'Durées par étape en place : R0 45 min, R1 1 h 30, R2 1 h.';
end $$;
