-- Photo du conseiller, et droit pour un client de lire la fiche de SON référent.
--
-- Jusqu'ici un client ne pouvait lire que son propre profil : afficher le nom,
-- le téléphone et la photo de son conseiller sur son tableau de bord aurait
-- exigé de passer par la clé de service. Une policy dédiée est préférable - le
-- contrôle reste dans la base, là où il s'audite.

alter table public.profiles
  add column if not exists avatar_url text;

comment on column public.profiles.avatar_url is
  'URL publique de la photo, dans le bucket "media" (dossier conseillers/). Affichée au client à qui la personne est assignée.';

-- Même précaution que `is_staff` (migration 002) : une policy sur `profiles`
-- qui interrogerait `profiles` directement boucle. SECURITY DEFINER exécute la
-- lecture hors RLS, ce qui rompt la récursion.
create or replace function public.my_advisor_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select advisor_id from public.profiles where id = auth.uid();
$$;

-- Le client voit la fiche de son référent, et de lui seul : la fonction ne rend
-- qu'un identifiant, celui inscrit sur son propre profil.
drop policy if exists "Clients see their advisor profile" on public.profiles;
create policy "Clients see their advisor profile"
  on public.profiles for select
  using (id = public.my_advisor_id());
