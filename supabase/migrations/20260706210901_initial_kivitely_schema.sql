-- Kivitely MVP Supabase baseline schema.
-- This migration mirrors the current database/schema.sql draft.
-- The app is still mock-data based; this only creates the database baseline.

create extension if not exists pgcrypto;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'issue_status') then
    create type issue_status as enum (
      'draft',
      'open',
      'assigned',
      'in_progress',
      'ready_for_review',
      'accepted',
      'rejected',
      'tig_ready',
      'closed'
    );
  end if;
end
$$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'issue_priority') then
    create type issue_priority as enum (
      'low',
      'normal',
      'high',
      'critical'
    );
  end if;
end
$$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'evidence_type') then
    create type evidence_type as enum (
      'before_photo',
      'after_photo',
      'document',
      'comment',
      'signature'
    );
  end if;
end
$$;

create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text,
  client text,
  phase text,
  progress integer default 0 check (progress >= 0 and progress <= 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists subcontractors (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  trade text,
  contact_name text,
  phone text,
  email text,
  created_at timestamptz not null default now()
);

create table if not exists issues (
  id uuid primary key default gen_random_uuid(),
  public_id text unique not null,
  project_id uuid not null references projects(id) on delete cascade,
  subcontractor_id uuid references subcontractors(id),
  title text not null,
  description text,
  location text,
  area text,
  trade text,
  assignee_name text,
  due_date date,
  status issue_status not null default 'open',
  priority issue_priority not null default 'normal',
  value_huf numeric(14, 2) default 0,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists issue_evidence (
  id uuid primary key default gen_random_uuid(),
  issue_id uuid not null references issues(id) on delete cascade,
  evidence_type evidence_type not null,
  storage_path text,
  label text,
  uploaded_by uuid,
  uploaded_at timestamptz not null default now()
);

create table if not exists issue_events (
  id uuid primary key default gen_random_uuid(),
  issue_id uuid not null references issues(id) on delete cascade,
  event_type text not null,
  from_status issue_status,
  to_status issue_status,
  title text not null,
  description text,
  actor_id uuid,
  created_at timestamptz not null default now()
);

create table if not exists tig_packages (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  subcontractor_id uuid references subcontractors(id),
  public_id text unique not null,
  status text not null default 'draft',
  gross_value_huf numeric(14, 2) default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists tig_package_issues (
  tig_package_id uuid not null references tig_packages(id) on delete cascade,
  issue_id uuid not null references issues(id) on delete cascade,
  primary key (tig_package_id, issue_id)
);

create index if not exists idx_issues_project_status on issues(project_id, status);
create index if not exists idx_issues_due_date on issues(due_date);
create index if not exists idx_evidence_issue on issue_evidence(issue_id);
create index if not exists idx_events_issue_created on issue_events(issue_id, created_at desc);
