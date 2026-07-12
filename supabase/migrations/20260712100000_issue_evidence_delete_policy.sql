-- Allow controlled issue evidence deletion through the public API role.
-- Current app scope: delete before/after issue evidence rows and matching Storage objects.
-- Auth, service-role writes, TIG writes and document deletion remain out of scope.

grant delete on table issue_evidence to anon, authenticated;

drop policy if exists "delete issue photo evidence metadata" on issue_evidence;
drop policy if exists "delete issue evidence images" on storage.objects;

create policy "delete issue photo evidence metadata"
on issue_evidence for delete
to anon, authenticated
using (evidence_type in ('before_photo', 'after_photo'));

create policy "delete issue evidence images"
on storage.objects for delete
to anon, authenticated
using (
  bucket_id = 'issue-evidence'
  and (storage.foldername(name))[1] = 'issues'
);
