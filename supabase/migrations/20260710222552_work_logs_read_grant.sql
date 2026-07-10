-- Allow the public Supabase API roles to read work log rows.
-- This supports the read-only teljesitmenynaplo view with mock fallback.
-- Auth, RLS policies, write access and service-role usage remain out of scope.

grant select on table work_logs to anon, authenticated;
