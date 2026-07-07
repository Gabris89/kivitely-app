-- Allow controlled issue status event creation through the public API role.
-- Current app scope: insert issue_events rows for status_changed audit entries only.
-- Auth, Storage, evidence and TIG write paths remain out of scope.

grant insert on table issue_events to anon, authenticated;

create policy "insert issue status events"
on issue_events for insert
to anon, authenticated
with check (event_type = 'status_changed');
