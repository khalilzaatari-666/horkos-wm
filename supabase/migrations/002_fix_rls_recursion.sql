-- Horkos WM - Correctif RLS : récursion infinie sur "profiles"
-- Run this in the Supabase SQL Editor. Safe to re-run.
--
-- PROBLÈME
-- La policy "Staff can view all profiles" interroge public.profiles depuis une
-- policy posée sur public.profiles. Postgres réévalue alors la même policy, en
-- boucle, et renvoie 42P17 "infinite recursion detected in policy for relation
-- profiles". Comme la policy staff de TOUTES les autres tables fait elle aussi
-- un `select ... from profiles`, la récursion se propageait partout : même une
-- lecture anonyme d'un article publié échouait.
--
-- CORRECTIF
-- Le test de rôle passe par des fonctions SECURITY DEFINER. Elles s'exécutent
-- avec les droits de leur propriétaire, donc la lecture de profiles à
-- l'intérieur n'est plus soumise aux policies : plus de boucle.

-- ============================================
-- FONCTIONS DE RÔLE
-- ============================================
create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('admin', 'conseiller')
  );
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

revoke execute on function public.is_staff() from public;
revoke execute on function public.is_admin() from public;
grant execute on function public.is_staff() to authenticated, anon;
grant execute on function public.is_admin() to authenticated, anon;

-- ============================================
-- PROFILES (la source de la récursion)
-- ============================================
drop policy if exists "Staff can view all profiles" on public.profiles;
create policy "Staff can view all profiles"
  on public.profiles for select
  using (public.is_staff());

drop policy if exists "Admins can update all profiles" on public.profiles;
create policy "Admins can update all profiles"
  on public.profiles for update
  using (public.is_admin());

-- ============================================
-- TOUTES LES AUTRES TABLES
-- ============================================
-- Chaque policy staff faisait le même sous-select sur profiles. On les recrée
-- toutes sur la fonction. Les tables absentes (audit_logs n'a pas encore été
-- créée) sont ignorées, pour que le script passe dans tous les cas.
do $$
declare
  r record;
begin
  for r in
    select * from (values
      ('appointments',           'Staff see all appointments',         'all',    'is_staff'),
      ('audits',                 'Staff manage audits',                'all',    'is_staff'),
      ('assets',                 'Staff manage assets',                'all',    'is_staff'),
      ('recommendations',        'Staff manage recommendations',       'all',    'is_staff'),
      ('client_recommendations', 'Staff manage client recommendations','all',    'is_staff'),
      ('documents',              'Staff manage documents',             'all',    'is_staff'),
      ('messages',               'Staff see all messages',             'all',    'is_staff'),
      ('leads',                  'Staff manage leads',                 'all',    'is_staff'),
      ('contacts',               'Staff manage contacts',              'all',    'is_staff'),
      ('asset_submissions',      'Staff manage submissions',           'all',    'is_staff'),
      ('partner_submissions',    'Staff manage partner submissions',   'all',    'is_staff'),
      ('articles',               'Staff manage articles',              'all',    'is_staff'),
      ('guides',                 'Staff manage guides',                'all',    'is_staff'),
      ('guide_downloads',        'Staff see downloads',                'select', 'is_staff'),
      ('events',                 'Staff manage events',                'all',    'is_staff'),
      ('faqs',                   'Staff manage FAQs',                  'all',    'is_staff'),
      ('audit_logs',             'Only admins can view audit logs',    'select', 'is_admin')
    ) as t(tbl, pol, cmd, fn)
  loop
    if to_regclass('public.' || r.tbl) is not null then
      execute format('drop policy if exists %I on public.%I', r.pol, r.tbl);
      execute format(
        'create policy %I on public.%I for %s using (public.%I())',
        r.pol, r.tbl, r.cmd, r.fn
      );
    end if;
  end loop;
end $$;
