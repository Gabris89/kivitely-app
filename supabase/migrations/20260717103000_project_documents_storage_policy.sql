-- Prepare Supabase Storage for controlled project document uploads.
-- Current app scope: public MVP/dev bucket for project-level plans and documents.
-- Auth, service-role writes, issue evidence uploads and document deletion remain out of scope.

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
) values (
  'project-documents',
  'project-documents',
  true,
  20971520,
  array[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/heic',
    'image/heif',
    'text/plain',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ]
) on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

grant insert on table project_documents to anon, authenticated;
grant usage on type project_document_type to anon, authenticated;
grant usage on type project_document_visibility to anon, authenticated;

drop policy if exists "insert project document metadata" on project_documents;
drop policy if exists "read project document files" on storage.objects;
drop policy if exists "insert project document files" on storage.objects;

create policy "insert project document metadata"
on project_documents for insert
to anon, authenticated
with check (
  document_type in ('architectural_plan', 'technical_plan', 'material_spec', 'photo_document', 'other')
);

create policy "read project document files"
on storage.objects for select
to anon, authenticated
using (bucket_id = 'project-documents');

create policy "insert project document files"
on storage.objects for insert
to anon, authenticated
with check (
  bucket_id = 'project-documents'
  and (storage.foldername(name))[1] = 'projects'
  and lower(storage.extension(name)) in ('pdf', 'jpg', 'jpeg', 'png', 'webp', 'heic', 'heif', 'txt', 'doc', 'docx', 'xls', 'xlsx')
);
