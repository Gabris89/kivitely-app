-- Allow the public Supabase API roles to read blocker rows.
-- This supports the read-only active blockers dashboard block with mock fallback.
-- Auth, RLS policies, write access and service-role usage remain out of scope.

grant select on table blocker_list to anon, authenticated;
