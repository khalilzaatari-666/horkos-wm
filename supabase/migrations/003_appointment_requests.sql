-- Horkos WM - Demandes de rendez-vous (visiteurs non inscrits)
-- Run this in the Supabase SQL Editor. Safe to re-run.
-- Requires 002_fix_rls_recursion.sql (public.is_staff()).
--
-- Pourquoi une table à part plutôt que public.appointments :
-- un visiteur n'a pas de profil, et à ce stade AUCUNE date de rendez-vous
-- n'existe encore — c'est le conseiller qui rappelle pour fixer le créneau.
-- On enregistre donc seulement la date/heure de la DEMANDE (created_at).
-- Une fois le créneau convenu, le conseiller crée la ligne appointments et la
-- rattache ici via appointment_id.

create table if not exists public.appointment_requests (
  id uuid default gen_random_uuid() primary key,

  -- Coordonnées saisies par le visiteur
  first_name text not null,
  last_name text not null,
  email text not null,
  phone text,

  -- Réponses au questionnaire
  besoins text[] not null default '{}',
  patrimoine text,
  investissement text,
  message text,

  -- Suivi côté back-office
  status text not null default 'nouveau'
    check (status in ('nouveau', 'contacte', 'planifie', 'annule')),
  assigned_to uuid references public.profiles(id),
  notes text,

  -- Rattachements, remplis plus tard
  client_id uuid references public.profiles(id),
  appointment_id uuid references public.appointments(id),

  -- Date et heure de la demande, pas du rendez-vous
  created_at timestamptz not null default now()
);

comment on column public.appointment_requests.created_at is
  'Date et heure auxquelles le visiteur a envoyé sa demande. La date du rendez-vous vit dans appointments, une fois le créneau fixé par le conseiller.';
comment on column public.appointment_requests.client_id is
  'Rempli automatiquement si le visiteur crée ensuite un compte avec le même email.';

create index if not exists appointment_requests_status_idx
  on public.appointment_requests (status, created_at desc);
create index if not exists appointment_requests_email_idx
  on public.appointment_requests (lower(email));

alter table public.appointment_requests enable row level security;

-- Les rôles sont nommés explicitement, et le staff n'a PAS de policy "for all".
-- Une policy "for all" sans "with check" réutilise son "using" comme contrôle
-- d'insertion : elle participe donc au INSERT anonyme, ce qui rend le
-- comportement difficile à lire. Une policy par commande lève l'ambiguïté.
grant insert on public.appointment_requests to anon;
grant select, insert, update, delete on public.appointment_requests to authenticated;

-- Un visiteur anonyme peut déposer une demande, mais jamais en relire une.
drop policy if exists "Anyone can request an appointment" on public.appointment_requests;
create policy "Anyone can request an appointment"
  on public.appointment_requests for insert
  to anon, authenticated
  with check (true);

drop policy if exists "Clients see own requests" on public.appointment_requests;
create policy "Clients see own requests"
  on public.appointment_requests for select
  to authenticated
  using (auth.uid() = client_id);

drop policy if exists "Staff manage appointment requests" on public.appointment_requests;
drop policy if exists "Staff read appointment requests" on public.appointment_requests;
drop policy if exists "Staff update appointment requests" on public.appointment_requests;
drop policy if exists "Staff delete appointment requests" on public.appointment_requests;

create policy "Staff read appointment requests"
  on public.appointment_requests for select
  to authenticated
  using (public.is_staff());

create policy "Staff update appointment requests"
  on public.appointment_requests for update
  to authenticated
  using (public.is_staff())
  with check (public.is_staff());

create policy "Staff delete appointment requests"
  on public.appointment_requests for delete
  to authenticated
  using (public.is_staff());

-- ============================================
-- RATTACHEMENT AUTOMATIQUE À LA CRÉATION DE COMPTE
-- ============================================
-- Le visiteur remplit le questionnaire, puis crée son compte depuis l'écran de
-- confirmation. On relie les deux sur l'email : le conseiller voit tout de
-- suite que le compte est créé, et le client retrouve sa demande dans son
-- espace dès la première connexion.
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, first_name, last_name, role)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'first_name',
    new.raw_user_meta_data->>'last_name',
    coalesce(new.raw_user_meta_data->>'role', 'client')
  );

  update public.appointment_requests
     set client_id = new.id
   where client_id is null
     and lower(email) = lower(new.email);

  return new;
end;
$$ language plpgsql security definer;

-- ============================================
-- AUTO-VÉRIFICATION
-- ============================================
-- Ce script a déjà été appliqué une fois sans que la policy d'insertion ne
-- survive, ce qui laissait le formulaire de rendez-vous silencieusement cassé.
-- Le bloc ci-dessous échoue bruyamment plutôt que de laisser croire que tout
-- s'est bien passé.
do $$
declare
  missing text;
begin
  select string_agg(expected, ', ')
    into missing
    from unnest(array[
      'Anyone can request an appointment',
      'Clients see own requests',
      'Staff read appointment requests',
      'Staff update appointment requests',
      'Staff delete appointment requests'
    ]) as expected
   where not exists (
     select 1 from pg_policies
      where schemaname = 'public'
        and tablename = 'appointment_requests'
        and policyname = expected
   );

  if missing is not null then
    raise exception 'Policies manquantes sur appointment_requests : %', missing;
  end if;

  raise notice 'appointment_requests : table et policies en place.';
end $$;
