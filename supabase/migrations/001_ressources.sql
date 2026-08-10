-- Horkos WM - Ressources
-- Run this in the Supabase SQL Editor. Safe to re-run.
--
-- The articles / guides / events tables already exist in schema.sql with the
-- right RLS policies (public reads what is published, staff writes). These two
-- columns are the only things the guides page displays that had nowhere to live.

alter table public.guides add column if not exists partner text;
alter table public.guides add column if not exists cover_label text;

comment on column public.guides.partner is
  'Ligne "En partenariat avec ..." affichée au-dessus du titre du guide.';
comment on column public.guides.cover_label is
  'Texte imprimé sur la couverture du guide. À défaut, le titre est utilisé.';
