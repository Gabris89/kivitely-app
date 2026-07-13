-- Allow the public Supabase API roles to read project document metadata.
-- This supports the read-only Dokumentumok / Tervek page with mock fallback.
-- Auth, RLS policies, Storage uploads, write access and service-role usage remain out of scope.

grant select on table project_documents to anon, authenticated;
