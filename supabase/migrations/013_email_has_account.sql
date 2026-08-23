-- Horkos WM - Savoir si une adresse a déjà un compte
-- Run this in the Supabase SQL Editor. Safe to re-run.
--
-- Un visiteur ne doit pas réserver avec l'adresse d'un compte existant : la
-- réservation étant anonyme (client_id = null), le rendez-vous serait détaché
-- de ce compte et invisible dans son espace. Le formulaire de rendez-vous
-- demande alors une autre adresse, ou de se connecter.
--
-- Le formulaire public est anonyme et n'a AUCUN accès en lecture à auth.users.
-- Cette fonction `security definer` n'expose qu'un booléen — « cette adresse
-- a-t-elle un compte » — et rien d'autre.
--
-- Compromis assumé : ce booléen permet, comme l'écran de connexion qui répond
-- déjà « aucun compte associé », de deviner si une adresse est inscrite. C'est
-- le prix d'un message clair au visiteur.

create or replace function public.email_has_account(p_email text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
      from auth.users
     where lower(email) = lower(trim(p_email))
       and deleted_at is null
  );
$$;

revoke all on function public.email_has_account(text) from public;
grant execute on function public.email_has_account(text) to anon, authenticated;

-- ============================================
-- AUTO-VÉRIFICATION
-- ============================================
do $$
begin
  -- `to_regprocedure`, pas `to_regproc` : seul le premier lit une signature.
  if to_regprocedure('public.email_has_account(text)') is null then
    raise exception 'La fonction email_has_account n''a pas été créée.';
  end if;
  raise notice 'email_has_account en place : le formulaire de rendez-vous peut refuser une adresse déjà inscrite.';
end $$;
