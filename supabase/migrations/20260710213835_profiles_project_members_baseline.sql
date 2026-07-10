-- Prepare role and project membership baseline without Supabase Auth wiring.
-- This migration only creates domain tables for future visibility/RLS work.
-- No RLS policies, Auth triggers, app write routes or service-role assumptions are added here.

do $$
begin
  if not exists (select 1 from pg_type where typname = 'app_role') then
    create type app_role as enum (
      'admin',
      'employer',
      'worker',
      'subcontractor',
      'project_manager',
      'site_manager',
      'viewer'
    );
  end if;
end
$$;

create table if not exists profiles (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique,
  display_name text not null,
  role app_role not null default 'viewer',
  company_name text,
  trade text,
  phone text,
  email text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists project_members (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  profile_id uuid not null references profiles(id) on delete cascade,
  role app_role not null,
  can_view_project boolean not null default true,
  can_manage_project boolean not null default false,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, profile_id)
);

create index if not exists idx_profiles_role on profiles(role);
create index if not exists idx_project_members_project on project_members(project_id);
create index if not exists idx_project_members_profile on project_members(profile_id);
create index if not exists idx_project_members_role on project_members(role);
