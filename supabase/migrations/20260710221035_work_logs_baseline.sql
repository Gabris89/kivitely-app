-- Prepare work log baseline for teljesitmenynaplo without Auth or RLS wiring.
-- This migration only creates the domain table for future field work logging.
-- No RLS policies, app write routes, Storage or service-role assumptions are added here.

do $$
begin
  if not exists (select 1 from pg_type where typname = 'work_log_status') then
    create type work_log_status as enum (
      'draft',
      'submitted',
      'reviewed',
      'accepted',
      'rejected'
    );
  end if;
end
$$;

create table if not exists work_logs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  profile_id uuid references profiles(id),
  trade text,
  work_date date not null,
  description text not null,
  quantity numeric(12, 2) check (quantity is null or quantity >= 0),
  unit text,
  status work_log_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_work_logs_project_date on work_logs(project_id, work_date desc);
create index if not exists idx_work_logs_profile_date on work_logs(profile_id, work_date desc);
create index if not exists idx_work_logs_status on work_logs(status);
