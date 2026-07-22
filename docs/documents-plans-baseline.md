# Kivitely documents / plans baseline

Last reviewed: 2026-07-13

This is a local planning document. It describes the intended project-level documents and architectural plans module before schema, app routes, Auth or RLS work is implemented.

Current scope:

- no app logic changes
- no Supabase schema change
- no new Storage bucket
- no Auth or RLS work
- no new write route

## Why this is separate from issue evidence

Issue evidence answers: "What proves that this specific issue was found, repaired, accepted or can support TIG?"

Project documents / plans answer: "What reference material does the team need to execute the project correctly?"

These two flows should not be merged.

Issue evidence should stay attached to an `issue`:

- before/after photos
- proof of repair
- status/TIG readiness support
- audit trail around a specific defect or task

Documents / plans should attach to a `project`:

- architectural drawings
- technical plans
- material specs
- project-level PDFs/images
- revisions and reference documents used across many issues, blockers and work logs

The app can reuse the same Storage upload and preview patterns, but the domain meaning and permissions are different.

## Product goal

The documents/plans module should help field users answer:

- Which plan is the current source of truth?
- Which project/trade/area does the plan apply to?
- Is there a newer revision?
- Can I quickly open it on mobile while standing on site?
- Can an issue, blocker or work log later reference this plan?

The MVP should avoid becoming a full document management system too early. The first version should be a simple project-level file library.

## Target users

### Admin / employer

- can see all project documents
- later can upload, replace, archive and manage visibility
- can decide which plans are worker/subcontractor-visible

### Project manager / site manager

- can see project documents for assigned projects
- later can upload operational plans and mark documents as current
- can connect a blocker/issue to a referenced plan

### Worker

- should see project documents shared with workers
- should not see internal/admin-only files
- needs mobile-friendly quick preview

### Subcontractor

- should see documents shared to their project/trade/scope
- should not automatically see unrelated subcontractor/internal documents

### Viewer

- read-only, only explicitly shared documents later

## Minimum MVP object

Suggested table name: `project_documents`

Core fields:

- `id`
- `project_id`
- `uploaded_by_profile_id`
- `document_type`
- `title`
- `description`
- `trade`
- `area`
- `storage_path`
- `file_name`
- `mime_type`
- `file_size_bytes`
- `revision`
- `visibility`
- `is_current`
- `created_at`
- `updated_at`
- `archived_at`

Possible `document_type` values:

- `architectural_plan`
- `technical_plan`
- `material_spec`
- `photo_document`
- `contract_document`
- `other`

Possible `visibility` values:

- `internal`
- `project_team`
- `workers`
- `subcontractors`
- `viewer_shared`

Near-term visibility can stay planning-level until Auth/RLS exists.

## What not to build first

Do not build these in the first slice:

- CAD/DWG rendering
- PDF annotation
- version diffing
- complex folder hierarchy
- document approval workflow
- full-text search
- per-page issue pins
- external client portal

These can come later if real usage proves the need.

## Storage direction

The existing issue evidence flow uses the `issue-evidence` Storage bucket. Project documents should use a separate bucket later, for example:

- `project-documents`

Reason:

- different lifecycle
- different visibility
- different file types
- different retention/audit expectations

Suggested Storage paths:

```text
projects/{project_id}/documents/{document_id}/{file_name}
```

or, if revisions become important early:

```text
projects/{project_id}/documents/{document_id}/revisions/{revision}/{file_name}
```

## UI direction

First read-only page:

- `/documents`
- mobile-first card list
- filter by project, document type, trade/area
- show title, type, project, revision, uploaded date, current/archived status
- tap opens in-app preview when supported

Later upload page:

- `/documents/new`
- project
- title
- document type
- trade/area
- visibility
- revision
- file picker

Preview:

- image preview can reuse the evidence gallery pattern
- PDF preview may initially open in browser/new tab if in-app rendering is too much
- CAD/DWG should be download/link-only in MVP unless converted to PDF/image externally

## Relationship to other modules

### Issues

An issue may later reference one or more project documents, but documents should not live inside `issue_evidence`.

Possible later join table:

- `issue_document_refs`
  - `issue_id`
  - `project_document_id`
  - `note`

### Blockers

Blockers often come from missing/unclear plan information. A blocker may reference a plan.

Possible later join table:

- `blocker_document_refs`
  - `blocker_id`
  - `project_document_id`
  - `note`

### Work logs

Work logs may reference the plan used for the day, but this is probably lower priority than issues/blockers.

## Recommended implementation order

1. Keep this baseline local and validate the concept with Attila/user feedback.
2. Add `project_documents` schema baseline only, without Storage upload or Auth.
3. Add idempotent seed rows with fake metadata.
4. Add read-only repository function and `/documents` page with mock/Supabase fallback.
5. Add separate Storage bucket and controlled upload only after the read-only shape feels right.
6. Add document references to blockers/issues if real workflows need it.
7. Add Auth/RLS visibility once user roles are wired.

## Recommended next real task

The safest next implementation is not upload yet. First create the schema baseline and read-only UI shape.

Suggested prompt:

```text
Keszits project_documents Supabase schema baseline-t epitesz tervek es projekt dokumentumok elokeszitesehez.

Ne koss be Authot.
Ne keszits RLS policy-t.
Ne adj app write utvonalat.
Ne modosits .env.local-t.
Ne adj dependency-t.

A project_documents tamogassa:
- projekt kapcsolat
- feltolto profil kapcsolat opcionálisan
- dokumentum tipus
- cim
- leiras opcionálisan
- szakma / terulet opcionálisan
- storage_path metadata, de Storage upload meg ne legyen
- file_name, mime_type, file_size_bytes opcionálisan
- revision opcionálisan
- visibility
- is_current
- archived_at opcionálisan
- created_at / updated_at

Keszits migration SQL-t.
Frissitsd roviden a Supabase README-t.
Futtasd lint/buildet csak ha indokolt.
Commitolj, de push elott allj meg.
A docs/*.md tervezesi fajlok maradjanak lokalisak, ne keruljenek commitba.
```
