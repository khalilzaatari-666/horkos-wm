-- Fiche d'audit patrimonial (R0)
--
-- Le conseiller remplissait jusqu'ici un classeur Excel à la main pendant ou
-- après le premier rendez-vous. La fiche devient un formulaire de la plateforme
-- et se range dans `audits.data`, qui existait déjà et n'était pas utilisé - le
-- jsonb convient : la fiche est un document, lu et écrit d'un bloc, jamais
-- interrogé champ par champ.
--
-- Deux colonnes s'ajoutent seulement pour la relier à son contexte.

-- Le rendez-vous qui a donné lieu à l'audit. `on delete set null` : un
-- rendez-vous supprimé ne doit pas emporter la fiche avec lui.
alter table public.audits
  add column if not exists appointment_id uuid references public.appointments(id) on delete set null;

-- Qui a enregistré la dernière version. `updated_at` disait quand, pas qui.
alter table public.audits
  add column if not exists updated_by uuid references public.profiles(id);

-- Un rendez-vous ne porte qu'une fiche : sans cette contrainte, deux onglets
-- ouverts sur le même R0 créent deux audits concurrents que rien ne départage.
create unique index if not exists audits_appointment_unique
  on public.audits (appointment_id)
  where appointment_id is not null;

-- La fiche est toujours lue par client, la plus récente d'abord.
create index if not exists audits_client_date_idx
  on public.audits (client_id, created_at desc);

-- Les actifs issus d'une fiche portent leur origine dans `details` :
--   { "audit_id": "<uuid>", "cle": "financier:0" }
-- L'index rend le rapprochement immédiat à chaque enregistrement, et distingue
-- ces actifs de ceux saisis à la main dans l'onglet Patrimoine, qui n'ont pas
-- d'origine et ne doivent jamais être touchés par la synchronisation.
create index if not exists assets_audit_origine_idx
  on public.assets ((details ->> 'audit_id'))
  where details ? 'audit_id';
