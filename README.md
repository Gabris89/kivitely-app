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

This is the first real development baseline for Kivitely. It is still a mock-data MVP:

- No Supabase connection yet
- No authentication yet
- No real backend persistence yet
- No real photo upload yet
- Mock API routes are present for local workflow modeling

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
/issues/new             New issue form, mock-only
/issues/KIV-104         Issue detail workflow
/workflow               Kanban-style workflow board
/subcontractors         Subcontractor view
/tig                    TIG preparation view
/mobile                 Mobile/PWA field view
```

## Future Supabase Integration

The project is prepared for a later Supabase integration, but Supabase is not connected yet.

Planned services:

- Supabase PostgreSQL for issues, projects, evidence and TIG packages
- Supabase Auth for users and roles
- Supabase Storage for photos and generated documents

Environment placeholders are documented in `.env.example`. Do not add service role keys, database passwords or real secrets to the repository.
