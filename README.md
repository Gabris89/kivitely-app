# Kivitely

Kivitely is a mobile-first construction workflow MVP for field teams, site managers and subcontractors. The first niche is tiling contractors and other finishing trades, but the app structure is intentionally general enough for additional construction trades later.

## MVP Focus

- Hibalista with searchable, status-based issue tracking
- Photo/evidence readiness for field handoff and acceptance
- Subcontractor feedback workflow
- Progress and completion tracking
- TIG preparation from accepted, documented work
- Simple responsive web/PWA-first field workflow

## Current Status

This is the first real development baseline for Kivitely. It is still an MVP with mock fallback:

- Optional Supabase read-only data source for issue, project, subcontractor and TIG package reads
- Optional Supabase write path for creating new issues, controlled issue status updates, status audit events and issue evidence images
- Supabase migration baseline is present under `supabase/migrations`
- Profiles and project membership schema baseline is prepared for later visibility/RLS work
- No authentication yet
- Controlled Supabase Storage upload, in-app preview and deletion for issue before/after evidence images
- TIG writes are still mock-only for local workflow modeling

## Repository Notes

- Hungarian UI copy is stored as UTF-8. If a Windows shell shows mojibake, read files with explicit UTF-8 encoding before changing text.
- `PROJECT_TREE.txt` is a first-baseline project snapshot. Regenerate or remove it only when the repository structure policy is decided.

## Install

```bash
npm install
```

## Run Locally

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

## Main Routes

```text
/                       Dashboard
/issues                 Hibalista with search and status filters
/issues/new             New issue form with Supabase insert fallback
/issues/KIV-104         Issue detail workflow
/workflow               Kanban-style workflow board
/subcontractors         Subcontractor view
/tig                    TIG preparation view
/mobile                 Mobile/PWA field view
```

## Supabase Integration

The project is prepared for Supabase and can read data from Supabase when public environment values are present. New issue creation, issue status updates, status audit events and issue evidence image uploads can write to Supabase when the matching policies are applied. If Supabase is not configured or a read/write fails, the app falls back to the mock dataset so local development remains usable.

The database baseline is versioned as a Supabase migration:

```text
supabase/migrations/20260706210901_initial_kivitely_schema.sql
```

Planned services:

- Supabase PostgreSQL for issues, projects, evidence and TIG packages
- Supabase Auth for users and roles, later connected to `profiles` and `project_members`
- Supabase Storage for issue evidence photos; generated documents remain later scope

Environment placeholders are documented in `.env.example`. Do not add service role keys, database passwords or real secrets to the repository.
