-- Allow the public API roles to read active blocker rows.
-- This supports the read-only dashboard and Akadálylista pages under RLS.
-- Only active statuses are exposed at this MVP stage.

grant select on table blocker_list to anon, authenticated;

drop policy if exists "read active blocker list" on blocker_list;

create policy "read active blocker list"
on blocker_list for select
to anon, authenticated
using (status in ('open', 'in_progress', 'waiting_external'));
