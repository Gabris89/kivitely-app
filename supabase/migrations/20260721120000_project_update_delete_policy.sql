-- Allow editing/deleting projects through the public API role. Row level
-- security is enabled on projects (turned on outside tracked migrations,
-- same as issues/blocker_list/subcontractors), so matching policies are
-- required alongside the grants, not just the grants alone.
--
-- Deleting a project cascades (on delete cascade) to issues, blocker_list,
-- project_documents, work_logs, project_members and tig_packages/tig_items,
-- so this is a deliberately heavier-weight operation than the other
-- update/delete grants added so far - confirmed safe at the DB level, but
-- the app should keep a strong confirmation prompt in front of it.

grant update, delete on table projects to anon, authenticated;

create policy "update projects"
on projects for update
to anon, authenticated
using (true)
with check (true);

create policy "delete projects"
on projects for delete
to anon, authenticated
using (true);
