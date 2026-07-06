-- Allow controlled issue creation through the public API role.
-- Current app scope: insert new rows into issues only.
-- Evidence, events, status changes, Storage and service-role writes remain out of scope.

grant insert on table issues to anon, authenticated;

create policy "insert issues"
on issues for insert
to anon, authenticated
with check (true);
