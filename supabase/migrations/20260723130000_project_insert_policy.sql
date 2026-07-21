-- The earlier project_insert_grant migration only granted the insert
-- privilege, but row level security is enabled on projects (turned on
-- outside tracked migrations) with no matching insert policy, so writes
-- were still rejected ("new row violates row-level security policy").
-- Add the missing policy, mirroring the issues insert policy pattern.

create policy "insert projects"
on projects for insert
to anon, authenticated
with check (true);
