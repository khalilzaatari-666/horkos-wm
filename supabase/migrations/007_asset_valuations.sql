-- Horkos WM - Historique de valorisation des actifs
-- Run this in the Supabase SQL Editor. Safe to re-run.
-- Requires 002_fix_rls_recursion.sql (public.is_staff()).
--
-- public.assets ne porte qu'une valeur courante, écrasée à chaque mise à jour.
-- L'indicateur « Performance 12 mois » du tableau de bord a donc besoin d'une
-- trace datée : une ligne par actif et par relevé.
--
-- Une valorisation par jour et par actif au maximum (index unique) : deux
-- chiffres contradictoires le même jour n'auraient pas de sens, et la
-- contrainte rend l'import idempotent.

create table if not exists public.asset_valuations (
  id uuid default gen_random_uuid() primary key,
  asset_id uuid references public.assets(id) on delete cascade not null,
  value numeric not null,
  -- Date du relevé, pas de la saisie : un conseiller peut rattraper un
  -- historique ancien après coup.
  valued_at date not null default current_date,
  created_at timestamptz not null default now()
);

comment on table public.asset_valuations is
  'Historique daté des valorisations. assets.value reste la valeur courante ; cette table sert aux calculs de performance.';
comment on column public.asset_valuations.valued_at is
  'Date à laquelle l''actif valait ce montant, pas la date de saisie.';

create unique index if not exists asset_valuations_unique_day
  on public.asset_valuations (asset_id, valued_at);

-- Le calcul de performance remonte le temps actif par actif : l'index descend
-- déjà dans le bon ordre.
create index if not exists asset_valuations_asset_date_idx
  on public.asset_valuations (asset_id, valued_at desc);

alter table public.asset_valuations enable row level security;

grant select on public.asset_valuations to authenticated;
grant insert, update, delete on public.asset_valuations to authenticated;

-- La visibilité suit celle de l'actif parent : la sous-requête sur assets subit
-- elle-même ses propres policies, donc un actif invisible masque ses
-- valorisations sans qu'on ait à redire la règle ici. On passe par is_staff()
-- et jamais par un select sur profiles — c'est exactement ce qui avait provoqué
-- la récursion 42P17 corrigée par 002.
drop policy if exists "Clients see own asset valuations" on public.asset_valuations;
create policy "Clients see own asset valuations"
  on public.asset_valuations for select
  to authenticated
  using (
    exists (
      select 1 from public.assets a
       where a.id = asset_valuations.asset_id
         and a.client_id = auth.uid()
    )
  );

drop policy if exists "Staff read asset valuations" on public.asset_valuations;
create policy "Staff read asset valuations"
  on public.asset_valuations for select
  to authenticated
  using (public.is_staff());

drop policy if exists "Staff insert asset valuations" on public.asset_valuations;
create policy "Staff insert asset valuations"
  on public.asset_valuations for insert
  to authenticated
  with check (public.is_staff());

drop policy if exists "Staff update asset valuations" on public.asset_valuations;
create policy "Staff update asset valuations"
  on public.asset_valuations for update
  to authenticated
  using (public.is_staff())
  with check (public.is_staff());

drop policy if exists "Staff delete asset valuations" on public.asset_valuations;
create policy "Staff delete asset valuations"
  on public.asset_valuations for delete
  to authenticated
  using (public.is_staff());

-- ============================================
-- AUTO-VÉRIFICATION
-- ============================================
do $$
declare
  missing text;
begin
  if to_regclass('public.asset_valuations') is null then
    raise exception 'La table asset_valuations n''a pas été créée.';
  end if;

  select string_agg(expected, ', ')
    into missing
    from unnest(array[
      'Clients see own asset valuations',
      'Staff read asset valuations',
      'Staff insert asset valuations',
      'Staff update asset valuations',
      'Staff delete asset valuations'
    ]) as expected
   where not exists (
     select 1 from pg_policies
      where schemaname = 'public'
        and tablename = 'asset_valuations'
        and policyname = expected
   );

  if missing is not null then
    raise exception 'Policies manquantes sur asset_valuations : %', missing;
  end if;

  raise notice 'asset_valuations : table et policies en place.';
end $$;
