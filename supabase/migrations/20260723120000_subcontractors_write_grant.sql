-- Allow controlled subcontractor create/edit/delete through the public API role.
-- Row level security is enabled on subcontractors (turned on outside tracked
-- migrations, same as projects/issues), so matching policies are required
-- alongside the grants, not just the grants alone.
-- Auth and service-role writes remain out of scope.

grant insert, update, delete on table subcontractors to anon, authenticated;

create policy "insert subcontractors"
on subcontractors for insert
to anon, authenticated
with check (true);

create policy "update subcontractors"
on subcontractors for update
to anon, authenticated
using (true)
with check (true);

create policy "delete subcontractors"
on subcontractors for delete
to anon, authenticated
using (true);
