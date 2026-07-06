-- Allow the public Supabase API roles to read the MVP baseline tables.
-- This supports the current app scope: read-only data access with mock fallback.
-- Write access, Auth, Storage and RLS policies are intentionally out of scope here.

grant usage on schema public to anon, authenticated;

grant select on table projects to anon, authenticated;
grant select on table subcontractors to anon, authenticated;
grant select on table issues to anon, authenticated;
grant select on table issue_evidence to anon, authenticated;
grant select on table issue_events to anon, authenticated;
grant select on table tig_packages to anon, authenticated;
grant select on table tig_package_issues to anon, authenticated;
