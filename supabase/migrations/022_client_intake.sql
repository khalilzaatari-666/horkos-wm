-- Questionnaire d'entrée : ce qu'on sait d'un client avant de le rencontrer
--
-- Deux trous se rejoignaient. D'abord `/inscription` affiche les boutons Google
-- et Microsoft AU-DESSUS des champs prénom / nom : qui clique un fournisseur
-- quitte la page avant de les avoir touchés, et `signInWithOAuth` ne transmet
-- aucune donnée - le déclencheur `handle_new_user` cherchait alors des clés
-- (`first_name`, `last_name`) que le fournisseur n'a jamais posées. Ensuite le
-- questionnaire lui-même (besoins, patrimoine, montant) n'était recueilli que
-- dans le parcours de réservation : s'inscrire sans réserver ne laissait rien.
--
-- On ne peut pas boucher ça à l'inscription : Supabase crée le compte à
-- l'instant où le fournisseur redirige, sans point d'arrêt possible. Le
-- questionnaire devient donc une porte APRÈS connexion - l'espace client reste
-- fermé tant qu'il n'est pas rempli.

create table if not exists public.client_intake (
  -- Un questionnaire par client, et la clé primaire le dit : pas d'id propre,
  -- rien à dédupliquer, et l'existence de la ligne vaut « rempli ».
  client_id uuid primary key references public.profiles(id) on delete cascade,

  -- Mêmes intitulés que le questionnaire de rendez-vous (`lib/rdv-options.ts`),
  -- pour que le conseiller lise la même chose des deux côtés.
  besoins text[] not null default '{}',
  besoin_autre text,
  patrimoine text,
  investissement text,
  message text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.client_intake is
  'Questionnaire rempli à la première connexion. Sa présence conditionne l''accès à l''espace client.';

alter table public.client_intake enable row level security;

-- Le client remplit et relit le sien, et rien d'autre.
drop policy if exists "Clients manage own intake" on public.client_intake;
create policy "Clients manage own intake"
  on public.client_intake for all
  using (auth.uid() = client_id)
  with check (auth.uid() = client_id);

-- L'équipe lit tout : c'est le contexte du dossier. Elle n'écrit pas - ces
-- réponses sont celles du client, pas des notes de conseiller.
drop policy if exists "Staff read intake" on public.client_intake;
create policy "Staff read intake"
  on public.client_intake for select
  using (public.is_staff());

do $$
begin
  if not exists (
    select 1 from pg_policies
     where schemaname = 'public' and tablename = 'client_intake'
       and policyname = 'Staff read intake'
  ) then
    raise exception 'Policy "Staff read intake" absente.';
  end if;

  raise notice 'client_intake : table et RLS en place.';
end $$;
