-- Questionnaire : ville de résidence et canal de découverte
--
-- Deux questions ajoutées aux deux questionnaires (réservation visiteur et
-- porte d'entrée de l'espace client) : où réside le prospect, et par quel
-- canal il nous a trouvés. Les intitulés possibles de `source` vivent dans
-- `lib/rdv-options.ts` (sourceOptions), comme les autres listes.
--
-- Les deux questions de montant gagnent aussi l'option « Je ne souhaite pas
-- partager cette information » : colonnes `text` inchangées, seule la liste
-- côté code s'allonge.

alter table public.appointment_requests
  add column if not exists ville text,
  add column if not exists source text;

alter table public.client_intake
  add column if not exists ville text,
  add column if not exists source text;

comment on column public.appointment_requests.source is
  'Canal de découverte déclaré (voir sourceOptions dans lib/rdv-options.ts).';
comment on column public.client_intake.source is
  'Canal de découverte déclaré (voir sourceOptions dans lib/rdv-options.ts).';

do $$
begin
  if not exists (
    select 1 from information_schema.columns
     where table_schema = 'public' and table_name = 'client_intake' and column_name = 'source'
  ) then
    raise exception 'Colonne client_intake.source absente.';
  end if;

  raise notice 'appointment_requests / client_intake : ville et source en place.';
end $$;
