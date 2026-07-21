-- Remember a plan's calibration (meters-per-normalized-unit) per document
-- so it doesn't have to be redone every time the measurement tool is
-- reopened for the same plan. One row per document, upserted on save.
create table if not exists plan_calibrations (
  document_id uuid primary key references project_documents(id) on delete cascade,
  meters_per_unit double precision not null check (meters_per_unit > 0),
  updated_at timestamptz not null default now()
);

grant select, insert, update on table plan_calibrations to anon, authenticated;

alter table plan_calibrations enable row level security;

drop policy if exists "read plan calibrations" on plan_calibrations;
drop policy if exists "insert plan calibrations" on plan_calibrations;
drop policy if exists "update plan calibrations" on plan_calibrations;

create policy "read plan calibrations"
on plan_calibrations for select
to anon, authenticated
using (true);

create policy "insert plan calibrations"
on plan_calibrations for insert
to anon, authenticated
with check (meters_per_unit > 0);

create policy "update plan calibrations"
on plan_calibrations for update
to anon, authenticated
using (true)
with check (meters_per_unit > 0);
