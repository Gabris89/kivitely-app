-- Prepare blocker list baseline for akadalynaplo without Auth or RLS wiring.
-- This migration only creates the domain table for future blocker tracking.
-- No RLS policies, app write routes, Storage or service-role assumptions are added here.

do $$
begin
  if not exists (select 1 from pg_type where typname = 'blocker_status') then
    create type blocker_status as enum (
      'open',
      'in_progress',
      'waiting_external',
      'resolved',
      'closed',
      'cancelled'
    );
  end if;
end
$$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'blocker_severity') then
    create type blocker_severity as enum (
      'low',
      'normal',
      'high',
      'critical'
    );
  end if;
end
$$;

create table if not exists blocker_list (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  created_by_profile_id uuid references profiles(id),
  responsible_profile_id uuid references profiles(id),
  title text not null,
  description text not null,
  trade text,
  area text,
  status blocker_status not null default 'open',
  severity blocker_severity not null default 'normal',
  resolution_note text,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_blocker_list_project_status on blocker_list(project_id, status);
create index if not exists idx_blocker_list_created_by on blocker_list(created_by_profile_id);
create index if not exists idx_blocker_list_responsible on blocker_list(responsible_profile_id);
create index if not exists idx_blocker_list_severity on blocker_list(severity);
