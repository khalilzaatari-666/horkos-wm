-- Horkos WM - Stockage des médias du CMS (couvertures d'articles/guides, PDF)
-- À exécuter dans le SQL Editor de Supabase. Réexécutable sans risque.
--
-- Bucket PUBLIC, contrairement au coffre "documents" : ces fichiers sont servis
-- tels quels sur le site public (couverture d'article via next/image, PDF de
-- guide en téléchargement). Seul le staff écrit ; tout le monde lit.

insert into storage.buckets (id, name, public)
values ('media', 'media', true)
on conflict (id) do update set public = true;

drop policy if exists "Public read media" on storage.objects;
create policy "Public read media"
  on storage.objects for select
  using (bucket_id = 'media');

drop policy if exists "Staff upload media" on storage.objects;
create policy "Staff upload media"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'media' and public.is_staff());

drop policy if exists "Staff update media" on storage.objects;
create policy "Staff update media"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'media' and public.is_staff())
  with check (bucket_id = 'media' and public.is_staff());

drop policy if exists "Staff delete media" on storage.objects;
create policy "Staff delete media"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'media' and public.is_staff());
