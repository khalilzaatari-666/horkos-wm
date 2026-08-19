-- Horkos WM - Bucket de stockage du coffre-fort
-- Run this in the Supabase SQL Editor. Safe to re-run.
-- Requires 002_fix_rls_recursion.sql (public.is_staff()).
--
-- Bucket PRIVÉ, jamais public. Un bucket public sert ses objets à quiconque
-- connaît l'URL, sans authentification : relevés de patrimoine, KYC et pièces
-- fiscales seraient exposés à qui devine un chemin. Le coffre passe donc
-- exclusivement par des URLs signées à durée courte, générées côté serveur.
--
-- Convention de chemin : {client_id}/{document_id}-{nom}
-- Le premier segment porte le contrôle d'accès — c'est lui que les policies
-- comparent à auth.uid(). documents.file_path doit suivre cette forme.

insert into storage.buckets (id, name, public)
values ('documents', 'documents', false)
on conflict (id) do update set public = false;

-- ============================================
-- POLICIES SUR storage.objects
-- ============================================
-- Les clients LISENT seulement. Le dépôt est réservé au staff : un client qui
-- pourrait écrire dans son propre dossier pourrait aussi y glisser n'importe
-- quel fichier, et le coffre n'est pas un espace de dépôt libre.

drop policy if exists "Clients read own documents" on storage.objects;
create policy "Clients read own documents"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Staff read all documents" on storage.objects;
create policy "Staff read all documents"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'documents' and public.is_staff());

drop policy if exists "Staff upload documents" on storage.objects;
create policy "Staff upload documents"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'documents' and public.is_staff());

drop policy if exists "Staff update documents" on storage.objects;
create policy "Staff update documents"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'documents' and public.is_staff())
  with check (bucket_id = 'documents' and public.is_staff());

drop policy if exists "Staff delete documents" on storage.objects;
create policy "Staff delete documents"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'documents' and public.is_staff());

comment on column public.documents.file_path is
  'Chemin dans le bucket privé "documents", de la forme {client_id}/{document_id}-{nom}. Le premier segment porte le contrôle d''accès : ne jamais le composer autrement.';

-- ============================================
-- AUTO-VÉRIFICATION
-- ============================================
do $$
declare
  est_public boolean;
  missing text;
begin
  select public into est_public from storage.buckets where id = 'documents';

  if est_public is null then
    raise exception 'Le bucket "documents" n''a pas été créé.';
  end if;

  -- Le point le plus coûteux en cas d'erreur : on le vérifie explicitement.
  if est_public then
    raise exception 'Le bucket "documents" est PUBLIC. Il doit rester privé.';
  end if;

  select string_agg(expected, ', ')
    into missing
    from unnest(array[
      'Clients read own documents',
      'Staff read all documents',
      'Staff upload documents',
      'Staff update documents',
      'Staff delete documents'
    ]) as expected
   where not exists (
     select 1 from pg_policies
      where schemaname = 'storage'
        and tablename = 'objects'
        and policyname = expected
   );

  if missing is not null then
    raise exception 'Policies manquantes sur storage.objects : %', missing;
  end if;

  raise notice 'Bucket "documents" privé et policies en place.';
end $$;
