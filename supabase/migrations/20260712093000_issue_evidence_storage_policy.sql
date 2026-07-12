-- Prepare Supabase Storage for controlled issue evidence image uploads.
-- Current app scope: public MVP/dev bucket for before/after issue photos only.
-- Auth, service-role writes, TIG writes and document uploads remain out of scope.

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
) values (
  'issue-evidence',
  'issue-evidence',
  true,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
) on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "read issue evidence images" on storage.objects;
drop policy if exists "insert issue evidence images" on storage.objects;

create policy "read issue evidence images"
on storage.objects for select
to anon, authenticated
using (bucket_id = 'issue-evidence');

create policy "insert issue evidence images"
on storage.objects for insert
to anon, authenticated
with check (
  bucket_id = 'issue-evidence'
  and (storage.foldername(name))[1] = 'issues'
  and lower(storage.extension(name)) in ('jpg', 'jpeg', 'png', 'webp', 'heic', 'heif')
);
