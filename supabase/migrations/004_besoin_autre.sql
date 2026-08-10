-- Horkos WM - Précision du besoin "Autre"
-- Run this in the Supabase SQL Editor. Safe to re-run.
--
-- Quand le visiteur coche "Autre besoin" au questionnaire, il précise lequel
-- en texte libre. Ça ne peut pas vivre dans besoins[] (validé contre une liste
-- fermée d'options) ni dans message, qui porte déjà le mot libre de fin de
-- questionnaire. D'où une colonne dédiée.

alter table public.appointment_requests
  add column if not exists besoin_autre text;

comment on column public.appointment_requests.besoin_autre is
  'Texte saisi par le visiteur lorsque besoins[] contient "Autre besoin". Nul sinon.';

do $$
begin
  if not exists (
    select 1 from information_schema.columns
     where table_schema = 'public'
       and table_name = 'appointment_requests'
       and column_name = 'besoin_autre'
  ) then
    raise exception 'La colonne besoin_autre n''a pas été créée.';
  end if;
  raise notice 'appointment_requests.besoin_autre : en place.';
end $$;
