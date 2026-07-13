-- Prepare project document baseline for architectural plans and project-level files.
-- This migration only creates metadata tables for later documents/plans work.
-- No Auth, RLS policies, Storage bucket, app write routes or service-role assumptions are added here.

do $$
begin
  if not exists (select 1 from pg_type where typname = 'project_document_type') then
    create type project_document_type as enum (
      'architectural_plan',
      'technical_plan',
      'material_spec',
      'photo_document',
      'contract_document',
      'other'
    );
  end if;
end
$$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'project_document_visibility') then
    create type project_document_visibility as enum (
      'internal',
      'project_team',
      'workers',
      'subcontractors',
      'viewer_shared'
    );
  end if;
end
$$;

create table if not exists project_documents (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  uploaded_by_profile_id uuid references profiles(id) on delete set null,
  document_type project_document_type not null default 'other',
  title text not null,
  description text,
  trade text,
  area text,
  storage_path text,
  file_name text,
  mime_type text,
  file_size_bytes bigint check (file_size_bytes is null or file_size_bytes >= 0),
  revision text,
  visibility project_document_visibility not null default 'project_team',
  is_current boolean not null default true,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_project_documents_project_type on project_documents(project_id, document_type);
create index if not exists idx_project_documents_project_current on project_documents(project_id, is_current);
create index if not exists idx_project_documents_visibility on project_documents(visibility);
create index if not exists idx_project_documents_uploaded_by on project_documents(uploaded_by_profile_id);
