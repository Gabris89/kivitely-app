-- Allow controlled blocker edit/resolve/delete through the public API role.
-- Row level security is enabled on blocker_list (turned on outside tracked
-- migrations, same as projects/issues/subcontractors), so matching policies
-- are required alongside the grants, not just the grants alone.

-- The original select policy only exposed active statuses (open/in_progress/
-- waiting_external). The app now also needs to read resolved/closed/cancelled
-- rows (full history list, detail page). RLS policies for the same command
-- are OR'd together, so this simply widens what's readable without touching
-- the existing policy.
create policy "read all blocker list"
on blocker_list for select
to anon, authenticated
using (true);

grant update, delete on table blocker_list to anon, authenticated;

create policy "update blocker list"
on blocker_list for update
to anon, authenticated
using (true)
with check (true);

create policy "delete blocker list"
on blocker_list for delete
to anon, authenticated
using (true);
