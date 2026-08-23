-- Horkos WM - Formulaire de contact depuis le site public
-- Run this in the Supabase SQL Editor. Safe to re-run.
-- Requires the baseline `contacts` table (id, name, email, phone, message, status, created_at).
--
-- La page /contact vit sur le site public : un visiteur sans compte doit pouvoir
-- envoyer un message. On ajoute la colonne `subject` (le « Sujet » du formulaire)
-- et une policy d'insertion ouverte à anon. La table ne porte pas de client_id :
-- un message de contact n'appartient à personne, d'où un simple `with check (true)`.

alter table public.contacts
  add column if not exists subject text;

comment on column public.contacts.subject is
  'Objet choisi dans le formulaire de contact ("Poser une question", etc.).';

alter table public.contacts enable row level security;

create index if not exists contacts_status_idx
  on public.contacts (status, created_at desc);

grant insert on public.contacts to anon;
grant select, insert on public.contacts to authenticated;

-- Insertion ouverte : n'importe qui peut déposer un message. La lecture reste
-- réservée au staff par les policies existantes de la table (non modifiées ici).
drop policy if exists "Submit a contact message" on public.contacts;
create policy "Submit a contact message"
  on public.contacts for insert
  to anon, authenticated
  with check (true);

do $$
begin
  if not exists (
    select 1 from pg_policies
     where schemaname = 'public'
       and tablename = 'contacts'
       and policyname = 'Submit a contact message'
  ) then
    raise exception 'Policy "Submit a contact message" absente sur contacts.';
  end if;

  raise notice 'contacts : colonne subject et policy d''insertion publique en place.';
end $$;
