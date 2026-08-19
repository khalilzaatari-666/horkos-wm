-- Horkos WM - Suppression de profiles.patrimoine_total
-- Run this in the Supabase SQL Editor. Safe to re-run.
--
-- La colonne existait depuis l'initialisation du projet (Sprint 0) sans que
-- rien ne l'écrive ni ne la lise. Le patrimoine affiché au client est la somme
-- des lignes de public.assets, calculée à la volée : c'est la seule source qui
-- engage le cabinet, puisqu'elle vient de l'audit et non d'une déclaration.
--
-- Un total dénormalisé que personne ne met à jour finit par diverger du réel,
-- et un patrimoine faux présenté à un conseiller est plus coûteux qu'une
-- agrégation un peu plus lente. Si un tri par patrimoine devient nécessaire
-- côté back-office, une vue sera plus honnête qu'une colonne entretenue à la
-- main.
--
-- Ne pas confondre avec appointment_requests.patrimoine, qui reste : c'est la
-- tranche déclarée par le visiteur au questionnaire, utile pour qualifier un
-- contact avant le premier appel. Déclaratif assumé, jamais présenté comme un
-- chiffre constaté.

-- Signale une valeur non triviale avant de supprimer : si quelqu'un s'était mis
-- à alimenter la colonne entre-temps, mieux vaut le savoir que le découvrir.
do $$
declare
  renseignes int;
begin
  if not exists (
    select 1 from information_schema.columns
     where table_schema = 'public'
       and table_name = 'profiles'
       and column_name = 'patrimoine_total'
  ) then
    raise notice 'profiles.patrimoine_total est déjà absente, rien à faire.';
    return;
  end if;

  select count(*) into renseignes
    from public.profiles
   where patrimoine_total is not null and patrimoine_total <> 0;

  if renseignes > 0 then
    raise notice
      'Attention : % profil(s) portaient une valeur non nulle. Elle est perdue — le patrimoine se recalcule depuis public.assets.',
      renseignes;
  end if;
end $$;

alter table public.profiles drop column if exists patrimoine_total;

-- ============================================
-- AUTO-VÉRIFICATION
-- ============================================
do $$
begin
  if exists (
    select 1 from information_schema.columns
     where table_schema = 'public'
       and table_name = 'profiles'
       and column_name = 'patrimoine_total'
  ) then
    raise exception 'profiles.patrimoine_total est toujours présente.';
  end if;

  raise notice 'profiles.patrimoine_total : supprimée.';
end $$;
