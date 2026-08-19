-- Horkos WM - Réservation de créneaux
-- Run this in the Supabase SQL Editor. Safe to re-run.
-- Requires 002 (is_staff) et le schéma appointments.
--
-- Un visiteur anonyme doit voir la disponibilité et réserver, mais
-- `appointments` porte des données personnelles et sa RLS ne donne (à raison)
-- aucun accès à `anon`. On n'ouvre RIEN en lecture : trois fonctions
-- `security definer` exposent seulement l'agrégat (capacité par créneau) et
-- exécutent le hold et la réservation de façon atomique.
--
-- La grille (9h-18h, déjeuner 12h30-14h, lundi-vendredi, rendez-vous de 60 min
-- sur deux demi-heures) est LA MÊME que src/components/booking/grille.ts. Le
-- test de grille.ts verrouille la liste des 13 débuts ; si l'une change,
-- changer l'autre.

-- ============================================
-- HOLDS : un créneau tenu 5 minutes
-- ============================================
create table if not exists public.slot_holds (
  id uuid default gen_random_uuid() primary key,
  -- Début du rendez-vous complet (60 min), pas d'une demi-heure.
  slot_start timestamptz not null,
  -- Généré par le navigateur, anonyme ou connecté. Un token = un seul hold :
  -- re-choisir un créneau déplace le hold, il ne s'additionne pas.
  hold_token uuid not null unique,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists slot_holds_active_idx
  on public.slot_holds (slot_start, expires_at);

-- RLS activée, AUCUNE policy : la table n'est accessible que par les fonctions
-- ci-dessous, qui s'exécutent en tant que propriétaire.
alter table public.slot_holds enable row level security;

-- ============================================
-- LA GRILLE CÔTÉ SQL
-- ============================================
-- Les 13 débuts d'une journée, en minutes depuis minuit, heure du cabinet.
-- Miroir de slotsOfDay() dans grille.ts.
create or replace function public._booking_starts()
returns int[]
language sql immutable
as $$
  select array[540, 570, 600, 630, 660, 690, 840, 870, 900, 930, 960, 990, 1020];
$$;

-- Un instant est un début valable : jour ouvré, sur la grille, et assez loin
-- dans le futur (marge de 2 h — pas de réservation dans dix minutes).
create or replace function public._is_valid_slot_start(p_start timestamptz)
returns boolean
language sql stable
set search_path = public
as $$
  select extract(isodow from p_start at time zone 'Africa/Casablanca') between 1 and 5
     and (extract(hour from p_start at time zone 'Africa/Casablanca') * 60
        + extract(minute from p_start at time zone 'Africa/Casablanca'))::int
         = any (public._booking_starts())
     and date_trunc('minute', p_start) = p_start
     and p_start >= now() + interval '2 hours';
$$;

-- Unités occupées sur l'intervalle [p_start, p_start + 60 min) :
-- conseillers ayant un rendez-vous chevauchant, plus les rendez-vous sans
-- conseiller assigné (saisis à la main), plus les holds actifs des autres.
-- Le chevauchement se calcule par intervalle réel (date + duration_minutes),
-- pas par égalité d'heure : un rendez-vous de 60 min bloque ses deux
-- demi-heures, un de 30 n'en bloque qu'une.
create or replace function public._booking_busy(p_start timestamptz, p_exclude_token uuid)
returns int
language sql stable
set search_path = public
as $$
  select (
    select count(distinct coalesce(a.advisor_id::text, a.id::text))
      from public.appointments a
     where a.status in ('planifie', 'confirme')
       and a.date < p_start + interval '60 minutes'
       and a.date + make_interval(mins => coalesce(a.duration_minutes, 60)) > p_start
  )::int
  + (
    select count(*)
      from public.slot_holds h
     where h.expires_at > now()
       and (p_exclude_token is null or h.hold_token <> p_exclude_token)
       and h.slot_start < p_start + interval '60 minutes'
       and h.slot_start + interval '60 minutes' > p_start
  )::int;
$$;

-- ============================================
-- DISPONIBILITÉ
-- ============================================
-- Rend, pour chaque début proposable entre from_date et to_date (heure du
-- cabinet), le nombre d'unités restantes. `p_token` exclut le hold de
-- l'appelant, pour que son propre créneau ne lui apparaisse pas comme pris.
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

-- ============================================
-- HOLD : tenir un créneau 5 minutes
-- ============================================
create or replace function public.hold_slot(p_slot_start timestamptz, p_token uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  total int;
begin
  if p_token is null or not public._is_valid_slot_start(p_slot_start) then
    return false;
  end if;

  -- La purge vit ici plutôt que dans un cron : chaque tentative nettoie.
  delete from public.slot_holds where expires_at <= now();

  -- Sérialise les prises concurrentes du même créneau.
  perform pg_advisory_xact_lock(hashtext('booking-' || p_slot_start::text));

  select count(*)::int into total from public.profiles where role = 'conseiller';
  if total - public._booking_busy(p_slot_start, p_token) <= 0 then
    return false;
  end if;

  insert into public.slot_holds (slot_start, hold_token, expires_at)
  values (p_slot_start, p_token, now() + interval '5 minutes')
  on conflict (hold_token)
  do update set slot_start = excluded.slot_start,
                expires_at = excluded.expires_at,
                created_at = now();

  return true;
end;
$$;

-- ============================================
-- RÉSERVATION
-- ============================================
-- Confirme immédiatement (décision client) : le rendez-vous est inséré au
-- statut 'confirme' avec le conseiller libre le moins chargé du jour.
-- Retourne l'id du rendez-vous, ou null si le créneau n'est plus disponible —
-- l'appelant décide alors quoi dire (la demande, elle, est déjà enregistrée).
create or replace function public.book_slot(
  p_slot_start timestamptz,
  p_token uuid,
  p_type text default 'R0',
  p_request_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  total int;
  chosen uuid;
  appt uuid;
begin
  if not public._is_valid_slot_start(p_slot_start)
     or p_type not in ('R0', 'R1', 'R2', 'revue', 'autre') then
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
  select p.id into chosen
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

  if chosen is null then
    return null;
  end if;

  insert into public.appointments (client_id, advisor_id, type, status, date, duration_minutes)
  values (auth.uid(), chosen, p_type, 'confirme', p_slot_start, 60)
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

  return appt;
end;
$$;

-- ============================================
-- DROITS
-- ============================================
revoke all on function public.get_slot_availability(date, date, uuid) from public;
revoke all on function public.hold_slot(timestamptz, uuid) from public;
revoke all on function public.book_slot(timestamptz, uuid, text, uuid) from public;
revoke all on function public._booking_busy(timestamptz, uuid) from public;
revoke all on function public._is_valid_slot_start(timestamptz) from public;

grant execute on function public.get_slot_availability(date, date, uuid) to anon, authenticated;
grant execute on function public.hold_slot(timestamptz, uuid) to anon, authenticated;
grant execute on function public.book_slot(timestamptz, uuid, text, uuid) to anon, authenticated;

-- ============================================
-- AUTO-VÉRIFICATION
-- ============================================
do $$
declare
  missing text := '';
  nb_conseillers int;
begin
  if to_regclass('public.slot_holds') is null then
    missing := missing || ' slot_holds';
  end if;
  -- `to_regprocedure`, pas `to_regproc` : seul le premier accepte une signature
  -- avec arguments. L'autre renvoie null et déclarerait manquantes des
  -- fonctions pourtant créées — en faisant tout annuler par l'exception.
  if to_regprocedure('public.get_slot_availability(date, date, uuid)') is null then
    missing := missing || ' get_slot_availability';
  end if;
  if to_regprocedure('public.hold_slot(timestamptz, uuid)') is null then
    missing := missing || ' hold_slot';
  end if;
  if to_regprocedure('public.book_slot(timestamptz, uuid, text, uuid)') is null then
    missing := missing || ' book_slot';
  end if;

  if missing <> '' then
    raise exception 'Objets manquants :%', missing;
  end if;

  select count(*) into nb_conseillers from public.profiles where role = 'conseiller';
  if nb_conseillers = 0 then
    raise notice 'ATTENTION : aucun profil "conseiller" en base. Tous les créneaux seront complets tant qu''il n''y en a pas au moins un.';
  else
    raise notice 'Réservation en place. % conseiller(s) ouvrent la disponibilité.', nb_conseillers;
  end if;
end $$;
