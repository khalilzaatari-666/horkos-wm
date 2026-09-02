-- Demandes d'échange : un client veut parler d'une recommandation avec son
-- conseiller, depuis « En parler avec mon conseiller ».
--
-- L'email au conseiller partait déjà, mais rien n'en gardait trace : une alerte
-- manquée ne laissait aucune trace dans le back-office. Cette table est la
-- source de vérité, l'email n'en est que la notification.

create table if not exists public.advisor_requests (
  id uuid default gen_random_uuid() primary key,
  client_id uuid not null references public.profiles(id) on delete cascade,
  -- Référent au moment de la demande : le client peut changer de conseiller
  -- ensuite, la demande reste attribuée à celui qui devait la traiter.
  advisor_id uuid references public.profiles(id) on delete set null,
  recommendation_id uuid references public.recommendations(id) on delete set null,
  status text not null default 'nouveau' check (status in ('nouveau', 'traite')),
  created_at timestamptz default now(),
  handled_at timestamptz,
  handled_by uuid references public.profiles(id) on delete set null
);

create index if not exists advisor_requests_status_idx
  on public.advisor_requests (status, created_at desc);
create index if not exists advisor_requests_client_idx
  on public.advisor_requests (client_id);

alter table public.advisor_requests enable row level security;

-- Le client dépose sa propre demande, et ne voit que les siennes.
create policy "Clients create own advisor requests"
  on public.advisor_requests for insert
  with check (auth.uid() = client_id);

create policy "Clients see own advisor requests"
  on public.advisor_requests for select
  using (auth.uid() = client_id);

-- L'équipe lit et traite tout : c'est elle qui reprend la demande.
create policy "Staff manage advisor requests"
  on public.advisor_requests for all
  using (public.is_staff());
