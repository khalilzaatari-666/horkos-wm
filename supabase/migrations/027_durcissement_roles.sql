-- Durcissement des rôles et du journal d'audit
--
-- Revue de sécurité du 18 septembre 2026. Quatre failles, toutes côté base :
--
--   1. `handle_new_user` lisait le rôle dans `raw_user_meta_data`, que
--      n'importe qui renseigne à l'inscription (la clé anon est publique).
--      Un `signInWithOtp({ options: { data: { role: 'admin' } } })` direct
--      créait un administrateur. Le déclencheur pose désormais toujours
--      « client » ; `inviteStaff` écrit le rôle après coup avec la clé de
--      service.
--
--   2. « Users can update own profile » laissait un client modifier SA ligne
--      sans restriction de colonne - donc `role`, `advisor_id` et `email`.
--      Un déclencheur refuse ces trois colonnes à quiconque n'est pas admin.
--
--   3. `audit_logs` acceptait un INSERT de n'importe qui avec n'importe quel
--      `user_id` : le journal exigé par la circulaire AMMC 01/20 était
--      falsifiable. Une ligne porte maintenant l'identité de son auteur.
--
--   4. `book_slot` est appelable directement et stockait `p_meeting_url` tel
--      quel : un visiteur anonyme pouvait planter un lien de son choix,
--      rendu cliquable dans le back-office. Seul un lien Google Meet est
--      accepté - c'est la seule origine légitime (`lib/booking.ts`).

-- ============================================
-- 1. LE RÔLE NE VIENT PLUS DES MÉTADONNÉES
-- ============================================
create or replace function public.handle_new_user()
returns trigger as $$
begin
  -- `role` volontairement absent des métadonnées lues : voir l'en-tête.
  insert into public.profiles (id, email, first_name, last_name, role)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'first_name',
    new.raw_user_meta_data->>'last_name',
    'client'
  );

  update public.appointment_requests
     set client_id = new.id
   where client_id is null
     and lower(email) = lower(new.email);

  return new;
end;
$$ language plpgsql security definer set search_path = public;

-- ============================================
-- 2. ROLE, ADVISOR_ID ET EMAIL RÉSERVÉS À L'ADMIN
-- ============================================
-- Trois appelants légitimes, reconnus chacun à sa manière :
--   - un admin connecté : `is_admin()` ;
--   - la clé de service (`inviteStaff`, cron) : son JWT porte `service_role`
--     et `auth.uid()` est nul, donc `is_admin()` ne suffirait pas ;
--   - le SQL Editor du dashboard : connexion directe en `postgres`, sans JWT.
--     `session_user` (et non `current_user`, que SECURITY DEFINER remplace
--     par le propriétaire) garde le rôle de la connexion : `authenticator`
--     pour PostgREST, `postgres` pour l'éditeur.
create or replace function public.profiles_guard_sensitive_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role
     or new.advisor_id is distinct from old.advisor_id
     or new.email is distinct from old.email then
    if session_user = 'postgres'
       or auth.role() = 'service_role'
       or public.is_admin() then
      return new;
    end if;
    raise exception 'Seul un administrateur peut modifier le rôle, le conseiller référent ou l''email d''un profil.'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_guard_sensitive_columns on public.profiles;
create trigger profiles_guard_sensitive_columns
  before update on public.profiles
  for each row execute procedure public.profiles_guard_sensitive_columns();

-- ============================================
-- 3. LE JOURNAL D'AUDIT PORTE L'IDENTITÉ DE SON AUTEUR
-- ============================================
drop policy if exists "System can insert audit logs" on public.audit_logs;
create policy "Users log their own actions"
  on public.audit_logs for insert
  to authenticated
  with check (user_id = auth.uid());

-- ============================================
-- 4. SEUL UN LIEN GOOGLE MEET EST ACCEPTÉ
-- ============================================
-- `not valid` : les lignes existantes ne sont pas rejugées, la contrainte
-- ne s'applique qu'aux écritures à venir. Le bloc ci-dessous signale
-- d'éventuelles lignes historiques hors norme sans faire échouer la
-- migration.
alter table public.appointments
  drop constraint if exists appointments_meeting_url_meet;
alter table public.appointments
  add constraint appointments_meeting_url_meet
  check (meeting_url is null or meeting_url ~ '^https://meet\.google\.com/[A-Za-z0-9-]+$')
  not valid;

-- ============================================
-- AUTO-VÉRIFICATION
-- ============================================
do $$
declare
  suspects int;
  hors_norme int;
begin
  if not exists (
    select 1 from pg_trigger
     where tgname = 'profiles_guard_sensitive_columns'
       and tgrelid = 'public.profiles'::regclass
  ) then
    raise exception 'Déclencheur profiles_guard_sensitive_columns absent.';
  end if;

  if exists (
    select 1 from pg_policies
     where schemaname = 'public' and tablename = 'audit_logs'
       and policyname = 'System can insert audit logs'
  ) then
    raise exception 'L''ancienne policy ouverte sur audit_logs existe encore.';
  end if;

  -- Un compte staff dont l'inscription porte un rôle dans ses métadonnées a
  -- pu passer par la faille 1 : à vérifier à la main.
  select count(*) into suspects
    from public.profiles p
    join auth.users u on u.id = p.id
   where p.role <> 'client'
     and u.raw_user_meta_data ? 'role'
     and u.invited_at is null;
  if suspects > 0 then
    raise warning '% compte(s) staff inscrit(s) sans invitation avec un rôle en métadonnées : à contrôler (select p.id, p.email, p.role from profiles p join auth.users u on u.id = p.id where p.role <> ''client'' and u.invited_at is null).', suspects;
  end if;

  select count(*) into hors_norme
    from public.appointments
   where meeting_url is not null
     and meeting_url !~ '^https://meet\.google\.com/[A-Za-z0-9-]+$';
  if hors_norme > 0 then
    raise warning '% rendez-vous avec un meeting_url qui n''est pas un lien Meet : à contrôler.', hors_norme;
  end if;

  raise notice 'Rôles, journal d''audit et liens de réunion durcis.';
end $$;
