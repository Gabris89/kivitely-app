-- Allow controlled blocker creation through the public API role.
-- Current app scope: insert new rows into blocker_list only.
-- This MVP/dev policy is intentionally narrow to insert only.
-- Auth, status updates, deletes and service-role writes remain out of scope.

grant insert on table blocker_list to anon, authenticated;
grant usage on type blocker_status to anon, authenticated;
grant usage on type blocker_severity to anon, authenticated;

drop policy if exists "insert blocker list" on blocker_list;

create policy "insert blocker list"
on blocker_list for insert
to anon, authenticated
with check (true);
