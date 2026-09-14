-- Le rappel de relance s'inscrit aussi dans l'agenda du conseiller
--
-- L'email de l'échéance arrive le moment venu, mais rien n'apparaissait dans
-- l'agenda : le conseiller ne pouvait pas voir sa relance en préparant sa
-- semaine. Un événement Google Calendar est désormais posé en même temps que le
-- pense-bête, sur le calendrier du cabinet, avec le référent en participant.
--
-- L'identifiant est conservé ici pour une seule raison : pouvoir retirer
-- l'événement quand le rappel est annulé ou devient sans objet. Un agenda qui
-- garde des relances caduques cesse vite d'être consulté.

alter table public.reminders
  add column if not exists calendar_event_id text;

comment on column public.reminders.calendar_event_id is
  'Événement Google Calendar de la relance. Nul si l''agenda n''est pas configuré ou si Google a refusé : le rappel vaut par son email, l''agenda n''est qu''un confort.';

do $$
begin
  if not exists (
    select 1 from information_schema.columns
     where table_schema = 'public' and table_name = 'reminders'
       and column_name = 'calendar_event_id'
  ) then
    raise exception 'Colonne reminders.calendar_event_id absente.';
  end if;

  raise notice 'reminders.calendar_event_id en place.';
end $$;
