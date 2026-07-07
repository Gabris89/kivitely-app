-- Allow controlled issue status updates through the public API role.
-- Current app scope: update issues.status and issues.updated_at only.
-- Evidence, events, TIG, Storage and service-role writes remain out of scope.

grant update (status, updated_at) on table issues to anon, authenticated;

create policy "update issue status"
on issues for update
to anon, authenticated
using (true)
with check (true);
