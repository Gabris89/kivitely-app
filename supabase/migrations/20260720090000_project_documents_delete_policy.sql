-- Allow controlled project document deletion through the public API role.
-- Current app scope: delete a project_documents row and its matching Storage object.
-- Auth and service-role writes remain out of scope.

grant delete on table project_documents to anon, authenticated;

drop policy if exists "delete project document metadata" on project_documents;
drop policy if exists "delete project document files" on storage.objects;

create policy "delete project document metadata"
on project_documents for delete
to anon, authenticated
using (true);

create policy "delete project document files"
on storage.objects for delete
to anon, authenticated
using (
  bucket_id = 'project-documents'
  and (storage.foldername(name))[1] = 'projects'
);
