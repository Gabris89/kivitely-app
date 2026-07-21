-- The original issue status-update grant only covered the (status,
-- updated_at) columns. The new full issue edit form (title, description,
-- location, area, trade, subcontractor, assignee, due date, priority,
-- value, status) needs to update every editable column, so widen the grant
-- to the whole table - the existing "update issue status" policy's
-- using/with-check already allow any update regardless of which columns
-- are touched, only the column-level grant was too narrow.
grant update on table issues to anon, authenticated;

-- Issues had no delete grant/policy at all before. issue_evidence,
-- issue_events and tig_package_issues all reference issues(id) with
-- "on delete cascade", so deleting an issue safely cleans up its
-- dependents at the database level.
grant delete on table issues to anon, authenticated;

create policy "delete issues"
on issues for delete
to anon, authenticated
using (true);
