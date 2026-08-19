-- Horkos WM - Mode de rendez-vous (présentiel / visio) et lien de réunion
-- Run this in the Supabase SQL Editor. Safe to re-run.
-- Requires 010_booking.sql.
--
-- La réunion Zoom est créée par le serveur AVANT d'appeler book_slot, et son
-- lien passé en paramètre : après coup, il faudrait écrire meeting_url sur un
-- rendez-vous que l'appelant anonyme n'a pas le droit de toucher. Si la
-- réservation échoue, le serveur supprime la réunion orpheline.
--
-- book_slot retourne désormais un jsonb avec le nom et l'email du conseiller
-- assigné : l'appelant vient de réserver, lui rendre les détails de SA
-- réservation est légitime, et c'est ce qui permet d'envoyer les emails de
-- confirmation sans clé privilégiée.

alter table public.appointments
  add column if not exists mode text not null default 'presentiel'
    check (mode in ('presentiel', 'visio'));

alter table public.appointments
  add column if not exists meeting_url text;

comment on column public.appointments.mode is
  'presentiel : au cabinet. visio : réunion Zoom, lien dans meeting_url.';
comment on column public.appointments.meeting_url is
  'Lien de la réunion pour un rendez-vous en visio. Nul si la création Zoom a échoué — le conseiller envoie alors le lien à la main.';

-- Le type de retour change (uuid -> jsonb) : un create or replace est refusé
-- par Postgres dans ce cas, et une nouvelle signature à côté de l'ancienne
-- créerait une surcharge ambiguë pour PostgREST. On supprime, puis on recrée.
drop function if exists public.book_slot(timestamptz, uuid, text, uuid);

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
  chosen uuid;
  appt uuid;
  advisor record;
begin
  if not public._is_valid_slot_start(p_slot_start)
     or p_type not in ('R0', 'R1', 'R2', 'revue', 'autre')
     or p_mode not in ('presentiel', 'visio') then
    return null;
  end if;

  delete from public.slot_holds where expires_at <= now();

  -- Le point où une course créerait un double booking : deux réservations du
  -- même créneau s'exécutent ici l'une après l'autre, jamais ensemble.
  perform pg_advisory_xact_lock(hashtext('booking-' || p_slot_start::text));

  select count(*)::int into total from public.profiles where role = 'conseiller';
  if total - public._booking_busy(p_slot_start, p_token) <= 0 then
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
          and a.date < p_slot_start + interval '60 minutes'
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
    (auth.uid(), chosen, p_type, 'confirme', p_slot_start, 60, p_mode,
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

revoke all on function public.book_slot(timestamptz, uuid, text, uuid, text, text) from public;
grant execute on function public.book_slot(timestamptz, uuid, text, uuid, text, text) to anon, authenticated;

-- ============================================
-- AUTO-VÉRIFICATION
-- ============================================
do $$
begin
  if not exists (
    select 1 from information_schema.columns
     where table_schema = 'public' and table_name = 'appointments' and column_name = 'mode'
  ) then
    raise exception 'appointments.mode n''a pas été créée.';
  end if;

  -- `to_regprocedure`, jamais `to_regproc` : seul le premier lit une signature.
  if to_regprocedure('public.book_slot(timestamptz, uuid, text, uuid, text, text)') is null then
    raise exception 'La nouvelle book_slot n''a pas été créée.';
  end if;
  if to_regprocedure('public.book_slot(timestamptz, uuid, text, uuid)') is not null then
    raise exception 'L''ancienne book_slot existe encore : surcharge ambiguë pour PostgREST.';
  end if;

  raise notice 'Mode de rendez-vous en place, book_slot retourne les détails du conseiller.';
end $$;
