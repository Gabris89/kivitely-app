-- The baseline migration granted select/insert/delete but not update,
-- so editing an existing measurement's points was silently impossible.
grant update on table plan_measurements to anon, authenticated;

drop policy if exists "update plan measurements" on plan_measurements;

create policy "update plan measurements"
on plan_measurements for update
to anon, authenticated
using (true)
with check (
  measurement_type in ('area', 'length')
  and jsonb_typeof(points) = 'array'
);
