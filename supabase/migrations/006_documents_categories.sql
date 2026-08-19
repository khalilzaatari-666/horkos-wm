-- Horkos WM - Catégories du coffre-fort documentaire
-- Run this in the Supabase SQL Editor. Safe to re-run.
--
-- Le schéma initial classait par thème administratif (identite / fiscal /
-- patrimoine / autre). À l'usage c'est bancal : un contrat d'assurance-vie
-- relève à la fois du fiscal et du patrimoine, une lettre de mission ne rentre
-- nulle part. La maquette classe par ORIGINE du document — reçu, souscrit,
-- réglementaire, produit par le cabinet — ce qui est la façon dont un client
-- cherche une pièce.
--
-- Les documents réglementaires signés gagnent en plus leur propre rubrique :
-- lettre de mission, profil de risque et KYC/LCB-FT au même endroit, c'est ce
-- qu'un contrôle AMMC demande.
--
-- La table est vide à ce jour, donc aucune reprise de données. Si elle ne
-- l'était pas, le bloc de vérification final le signalerait avant de casser
-- quoi que ce soit.

do $$
declare
  orphelins int;
begin
  select count(*) into orphelins
    from public.documents
   where category not in
     ('releves_situation', 'contrats', 'reglementaires', 'strategie', 'autre');

  if orphelins > 0 then
    raise exception
      'Migration interrompue : % document(s) portent une ancienne catégorie. Reclassez-les avant de relancer.',
      orphelins;
  end if;
end $$;

alter table public.documents
  drop constraint if exists documents_category_check;

alter table public.documents
  add constraint documents_category_check
  check (category in (
    'releves_situation',  -- Relevés de situation
    'contrats',           -- Contrats & souscriptions
    'reglementaires',     -- Documents réglementaires signés
    'strategie',          -- Stratégie & comptes rendus
    'autre'               -- Filet : accepté, mais pas affiché comme rubrique
  ));

comment on column public.documents.category is
  'Rubrique du coffre-fort. "autre" est un filet pour une pièce qui ne rentre dans aucune des quatre : elle reste accessible, mais le coffre n''affiche pas de rubrique tant qu''elle est vide.';

create index if not exists documents_client_category_idx
  on public.documents (client_id, category, created_at desc);

-- ============================================
-- AUTO-VÉRIFICATION
-- ============================================
do $$
declare
  def text;
begin
  select pg_get_constraintdef(oid) into def
    from pg_constraint
   where conrelid = 'public.documents'::regclass
     and conname = 'documents_category_check';

  if def is null then
    raise exception 'La contrainte documents_category_check n''a pas été créée.';
  end if;

  if def not like '%reglementaires%' then
    raise exception 'documents_category_check ne porte pas les nouvelles valeurs : %', def;
  end if;

  raise notice 'documents.category : nouvelles rubriques en place.';
end $$;
