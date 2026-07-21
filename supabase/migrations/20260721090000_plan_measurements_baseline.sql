-- Plan measurement baseline: lets a user calibrate a scale on an uploaded
-- plan (project_documents) and record an area/length measurement drawn on
-- top of it. Points are stored as fractional [0,1] coordinates relative to
-- the rendered page/image size, so a measurement can be redrawn at any
-- render resolution. This does not touch the original uploaded file.
-- Auth and service-role writes remain out of scope.

do $$
begin
  if not exists (select 1 from pg_type where typname = 'plan_measurement_type') then
    create type plan_measurement_type as enum ('area', 'length');
  end if;
end
$$;

create table if not exists plan_measurements (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references project_documents(id) on delete cascade,
  page_number integer not null default 1 check (page_number >= 1),
  measurement_type plan_measurement_type not null,
  points jsonb not null,
  calculated_value double precision not null check (calculated_value >= 0),
  label text,
  created_by_profile_id uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_plan_measurements_document on plan_measurements(document_id, page_number);

grant select, insert, delete on table plan_measurements to anon, authenticated;
grant usage on type plan_measurement_type to anon, authenticated;

alter table plan_measurements enable row level security;

drop policy if exists "read plan measurements" on plan_measurements;
drop policy if exists "insert plan measurements" on plan_measurements;
drop policy if exists "delete plan measurements" on plan_measurements;

create policy "read plan measurements"
on plan_measurements for select
to anon, authenticated
using (true);

create policy "insert plan measurements"
on plan_measurements for insert
to anon, authenticated
with check (
  measurement_type in ('area', 'length')
  and jsonb_typeof(points) = 'array'
);

create policy "delete plan measurements"
on plan_measurements for delete
to anon, authenticated
using (true);
