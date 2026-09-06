-- Rappels de relance : entre le R0 et le R1, la plateforme n'aidait personne
--
-- L'audit est rendu, le client réfléchit, et c'est au conseiller de reprendre
-- contact. Rien ne le lui rappelait : un dossier pouvait rester en suspens des
-- semaines faute d'un pense-bête. Le conseiller pose désormais son échéance
-- depuis l'onglet Suivi, et un cron horaire lui renvoie un email le moment venu.
--
-- La table ne porte que ce que le cron a besoin de lire : rien de ce qu'on peut
-- relire ailleurs (le nom du client, l'adresse du conseiller) n'est recopié ici.

create table if not exists public.reminders (
  id uuid primary key default gen_random_uuid(),

  -- Le dossier concerné. `cascade` : un client supprimé n'a plus de relance à
  -- recevoir, et laisser des rappels orphelins ferait échouer le cron.
  client_id uuid not null references public.profiles(id) on delete cascade,

  -- Le R0 qui a motivé le rappel. `set null` : un rendez-vous effacé ne doit pas
  -- emporter le pense-bête, qui garde son sens tant que le client existe.
  appointment_id uuid references public.appointments(id) on delete set null,

  due_at timestamptz not null,

  -- Le mot que le conseiller s'adresse à lui-même, repris tel quel dans l'email.
  note text,

  -- `sans_objet` se distingue d'`annule` à dessein : l'un dit que le conseiller
  -- a renoncé, l'autre que le R1 était déjà posé quand le rappel a voulu partir.
  -- Les confondre effacerait la seule information qui explique le silence.
  status text not null default 'en_attente'
    check (status in ('en_attente', 'envoye', 'annule', 'sans_objet')),

  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  sent_at timestamptz,

  -- Un envoi Resend refusé ne doit pas disparaître en silence : le rappel reste
  -- en attente, le cron réessaie, et l'onglet Suivi peut dire pourquoi ça coince.
  attempts int not null default 0,
  last_error text
);

comment on table public.reminders is
  'Pense-bêtes internes du cabinet (relance R1 après le R0). Jamais visibles du client.';
comment on column public.reminders.status is
  'en_attente | envoye | annule (le conseiller a renoncé) | sans_objet (le R1 était déjà posé).';

-- L'unique requête du cron : les rappels dus, non encore partis. L'index partiel
-- ne porte que sur eux et reste donc minuscule quand l'historique grossit.
create index if not exists reminders_dus_idx
  on public.reminders (due_at)
  where status = 'en_attente';

-- L'onglet Suivi cherche le rappel d'un dossier.
create index if not exists reminders_client_idx
  on public.reminders (client_id, created_at desc);

-- Un seul rappel en attente par R0 : deux onglets ouverts n'en créent pas deux.
-- L'annulation change le statut, ce qui libère aussitôt la place pour un autre.
create unique index if not exists reminders_rdv_en_attente_unique
  on public.reminders (appointment_id)
  where status = 'en_attente' and appointment_id is not null;

alter table public.reminders enable row level security;

-- Aucune policy côté client, volontairement. Un rappel est une note
-- d'organisation interne : le client n'a pas à savoir que son conseiller s'est
-- programmé de le relancer, ni quand.
drop policy if exists "Staff manage reminders" on public.reminders;
create policy "Staff manage reminders"
  on public.reminders for all
  using (public.is_staff())
  with check (public.is_staff());

do $$
begin
  if not exists (
    select 1 from pg_policies
     where schemaname = 'public' and tablename = 'reminders'
       and policyname = 'Staff manage reminders'
  ) then
    raise exception 'Policy "Staff manage reminders" absente.';
  end if;

  raise notice 'reminders : table, index et RLS en place.';
end $$;
