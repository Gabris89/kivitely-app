-- Fix: project_documents has RLS enabled but never got a select policy.
-- The read grant (20260713124124_project_documents_read_grant.sql) and the
-- insert policy (20260717103000_project_documents_storage_policy.sql) exist,
-- but without a permissive select policy RLS silently returns zero rows for
-- anon/authenticated even though the grant is present and inserts succeed.
-- This is why /documents always fell back to mock data: listProjectDocuments()
-- saw an empty (not erroring) read and used the mock fallback instead.
-- No visibility/role filtering yet, matching the current MVP stance in
-- docs/visibility-rls-plan.md.

alter table project_documents enable row level security;

drop policy if exists "read project documents" on project_documents;

create policy "read project documents"
on project_documents for select
to anon, authenticated
using (true);
