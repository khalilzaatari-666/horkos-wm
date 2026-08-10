-- Horkos WM - Soumission d'actifs depuis le site public
-- Run this in the Supabase SQL Editor. Safe to re-run.
-- Requires 002_fix_rls_recursion.sql (public.is_staff()).
--
-- La table n'acceptait que des insertions authentifiées (auth.uid() = client_id),
-- alors que le formulaire de cession vit sur une page publique : un visiteur
-- sans compte doit pouvoir déposer un dossier. D'où les coordonnées de contact
-- et une policy qui autorise l'insertion sans client_id.

alter table public.asset_submissions
  add column if not exists contact_name text,
  add column if not exists contact_email text,
  add column if not exists contact_phone text,
  add column if not exists horizon text;

comment on column public.asset_submissions.client_id is
  'Nul pour une soumission déposée par un visiteur non connecté.';
comment on column public.asset_submissions.horizon is
  'Délai de cession souhaité, tel que saisi ("6 mois", "d''ici fin d''année").';

create index if not exists asset_submissions_status_idx
  on public.asset_submissions (status, created_at desc);

grant insert on public.asset_submissions to anon;
grant select, insert on public.asset_submissions to authenticated;

-- Une seule policy d'insertion : un visiteur laisse client_id nul, un client
-- connecté ne peut rattacher la demande qu'à lui-même. Deux policies
-- permissives se seraient combinées en OR et auraient annulé la seconde règle.
drop policy if exists "Clients can submit" on public.asset_submissions;
drop policy if exists "Submit an asset" on public.asset_submissions;
create policy "Submit an asset"
  on public.asset_submissions for insert
  to anon, authenticated
  with check (client_id is null or client_id = auth.uid());

drop policy if exists "Clients see own submissions" on public.asset_submissions;
create policy "Clients see own submissions"
  on public.asset_submissions for select
  to authenticated
  using (auth.uid() = client_id);

drop policy if exists "Staff manage submissions" on public.asset_submissions;
drop policy if exists "Staff read submissions" on public.asset_submissions;
drop policy if exists "Staff update submissions" on public.asset_submissions;
drop policy if exists "Staff delete submissions" on public.asset_submissions;

create policy "Staff read submissions"
  on public.asset_submissions for select to authenticated using (public.is_staff());
create policy "Staff update submissions"
  on public.asset_submissions for update to authenticated
  using (public.is_staff()) with check (public.is_staff());
create policy "Staff delete submissions"
  on public.asset_submissions for delete to authenticated using (public.is_staff());

do $$
declare
  missing text;
begin
  select string_agg(expected, ', ')
    into missing
    from unnest(array[
      'Submit an asset',
      'Clients see own submissions',
      'Staff read submissions',
      'Staff update submissions',
      'Staff delete submissions'
    ]) as expected
   where not exists (
     select 1 from pg_policies
      where schemaname = 'public'
        and tablename = 'asset_submissions'
        and policyname = expected
   );

  if missing is not null then
    raise exception 'Policies manquantes sur asset_submissions : %', missing;
  end if;

  raise notice 'asset_submissions : colonnes et policies en place.';
end $$;
