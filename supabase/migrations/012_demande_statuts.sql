-- Horkos WM - Statuts des demandes de rendez-vous
-- Run this in the Supabase SQL Editor. Safe to re-run.
-- Requires 003_appointment_requests.sql.
--
-- Depuis que le visiteur choisit lui-même son créneau (010/011), une demande
-- peut arriver DÉJÀ planifiée : `book_slot` la passe à 'planifie' au moment de
-- la réservation. Le suivi ne commence donc plus systématiquement à zéro, et
-- l'ancien jeu de statuts s'arrêtait au moment où le rendez-vous est fixé —
-- rien ne disait s'il avait eu lieu.
--
-- On ajoute 'honore' pour fermer l'entonnoir :
--   nouveau   -> reçue, personne ne s'en est occupé (aucun créneau pris)
--   contacte  -> le conseiller a joint le prospect, sans créneau encore
--   planifie  -> un rendez-vous existe (posé par le visiteur ou le conseiller)
--   honore    -> le rendez-vous a eu lieu
--   annule    -> sans suite
--
-- 'annule' est conservé plutôt que renommé : des lignes le portent peut-être
-- déjà, et une migration de statuts qui perd des données pour un mot plus joli
-- n'en vaut pas la peine.

alter table public.appointment_requests
  drop constraint if exists appointment_requests_status_check;

alter table public.appointment_requests
  add constraint appointment_requests_status_check
  check (status in ('nouveau', 'contacte', 'planifie', 'honore', 'annule'));

comment on column public.appointment_requests.status is
  'Suivi commercial de la demande. "planifie" est posé automatiquement par book_slot quand le visiteur réserve lui-même son créneau.';

-- ============================================
-- AUTO-VÉRIFICATION
-- ============================================
do $$
declare
  def text;
  orphelins int;
begin
  select pg_get_constraintdef(oid) into def
    from pg_constraint
   where conrelid = 'public.appointment_requests'::regclass
     and conname = 'appointment_requests_status_check';

  if def is null then
    raise exception 'La contrainte appointment_requests_status_check n''a pas été créée.';
  end if;

  if def not like '%honore%' then
    raise exception 'La contrainte ne porte pas le nouveau statut : %', def;
  end if;

  select count(*) into orphelins
    from public.appointment_requests
   where status not in ('nouveau', 'contacte', 'planifie', 'honore', 'annule');

  if orphelins > 0 then
    raise exception 'ATTENTION : % demande(s) portent un statut inconnu.', orphelins;
  end if;

  raise notice 'Statuts des demandes : nouveau, contacte, planifie, honore, annule.';
end $$;
