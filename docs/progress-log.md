# Kivitely progress log

This file tracks important project steps that moved the MVP baseline forward. Review and update it after each meaningful repository, schema, or deployment change.

## 2026-07-06

- Restored the local Git repository metadata and created the first baseline commit.
- Connected the local repository to GitHub: `https://github.com/Gabris89/kivitely-app.git`.
- Pushed the initial `main` branch to `origin/main`.
- Verified the app baseline as a mock-data Next.js MVP for hibalista, evidence readiness, subcontractor workflow, progress tracking, TIG preparation, and mobile/PWA field use.
- Confirmed branding uses Kivitely and no BuildFlow copy remains.
- Confirmed Hungarian UI copy is stored as UTF-8; earlier mojibake was a shell display issue.
- Documented repository quality notes in the README and pushed that baseline.
- Added the first Supabase migration baseline under `supabase/migrations`, based on `database/schema.sql`.
- Added a minimal `supabase/seed.sql` smoke-test dataset for one project, one subcontractor, two issues, two evidence records and two issue events.
- Pushed the read-only repository fallback baseline, then validated that mock fallback still works when Supabase is unavailable.
- Installed `@supabase/supabase-js` and replaced the manual REST helper with the official Supabase client for read-only data access.
- Added dynamic route markers for pages and API routes that read Supabase-backed data, so Next.js does not try to prerender live Supabase reads.
- Added a read-only API grants migration for the MVP tables.
- Confirmed the Supabase URL and publishable key are read from `.env.local` without exposing secrets in logs or commits.
- Diagnosed Supabase access in stages: first 401 from manual REST auth, then permission/read visibility issues, then successful hosted Supabase reads.
- Ran the Supabase schema, read access setup and seed data in the hosted Supabase project.
- Verified `/issues/KIV-104` and `/api/issues/KIV-104` display the seeded Supabase title `Supabase seed: burkolat javitasa`, proving the app is reading from Supabase.
- Added a controlled Supabase write path for new issue creation only, with mock fallback when Supabase is not configured or insert fails.
- Added a minimal insert grant/policy migration for the `issues` table.
- Added a controlled Supabase write path for issue status updates only, updating `issues.status` and `issues.updated_at` with mock fallback.
- Added a minimal update grant/policy migration for issue status updates.
- Fixed the issue detail workflow panel so successful status changes refresh server-rendered issue data and show whether Supabase or mock fallback handled the save.
- Added controlled Supabase issue event creation for successful status changes, writing `status_changed` audit rows to `issue_events`.
- Added a minimal insert grant/policy migration for status audit events.
- Added controlled Supabase evidence metadata creation for `before_photo` and `after_photo` rows without Storage or real file upload.
- Added a minimal insert grant/policy migration for issue evidence metadata.
- Tightened TIG-readiness evaluation to use DB evidence records on the issue detail/checklist screens and to block TIG marking until before/after evidence, accepted status and description are present.
- Added a product/domain baseline document covering roles, visibility rules, current schema coverage, missing domain objects and the recommended model direction for work logs, blockers, extra work notes and documents.
- Added a `profiles` and `project_members` schema baseline to prepare admin/employer/worker/subcontractor/project roles and project-scoped visibility without wiring Supabase Auth or RLS yet.
- Extended `supabase/seed.sql` with idempotent `profiles` and `project_members` sample data for admin/employer, project manager, worker, subcontractor and viewer visibility planning.
- Added a `work_logs` schema baseline and idempotent work log seed rows for teljesitmenynaplo planning without Auth/RLS or app write routes.
- Added a `blocker_list` schema baseline and idempotent blocker seed rows for akadalylista planning without Auth/RLS or app write routes.
- TIG, Storage and real file upload write paths remain intentionally disabled/mock-only.
- Product direction note: architectural plans should likely become a project-level documents/plans module, not another issue evidence flow. It can reuse the Supabase Storage upload/preview pattern, but should attach files to projects as reference material instead of attaching them to individual issues as proof.
- Added a local `docs/documents-plans-baseline.md` plan to separate project-level architectural plans/documents from issue-level evidence and define the safest next schema/read-only direction.
- Before building project documents/plans, finish stabilizing the issue evidence gallery behavior on desktop and mobile, because the same preview pattern will be reused there.
- Next planned UI refactor: split the issue evidence viewer into a shared state layer plus separate desktop modal and mobile fullscreen render/layout components. This should reduce fragile CSS breakpoint overrides and keep future document/plan previews aligned with best-practice responsive structure.

## 2026-07-17

- Ran a full-repo review (code + existing `docs/*.md` baseline) covering strengths, risks and use case ideas.
- Added `docs/improvement-backlog.md` as a living, continuously-tracked backlog (distinct from the point-in-time planning docs) — flags the currently-open anon write policies, the single-project assumption baked into `repository.ts`, the misleading "PWA" naming (no manifest/service worker), hardcoded actor role in `canMoveIssue` calls, zero test coverage, and TIG module being the least finished despite being closest to direct business value.

## 2026-07-21

- Reworked the dashboard into a simple module-menu (per Attila's feedback: too much on one page), decluttered issue/blocker/subcontractor/work-log cards (removed nested "card in card" patterns, boxed `dl` fields), and removed the static Mobile/PWA mockup page.
- Redesigned `/documents` from bulky cards into a compact searchable/filterable row list; added delete (DB row + Storage object) and made the title optional (falls back to the file name) while making an actual uploaded file mandatory.
- Removed backend-mode ("Supabase"/"mock fallback") wording from all user-facing save/delete confirmation messages.
- Cleaned up placeholder/test data: deleted dev-test rows left in `issues`, `blocker_list`, `project_documents` on the live Supabase project, and replaced "Teszt"/"Supabase teszt projekt"-style placeholder naming in `seed.sql` and `mock.ts` with presentable naming.
- Added an in-app plan measurement tool (`react-konva`) on top of the document viewer: calibrate a scale on an uploaded plan, draw area/length measurements, edit them afterward (drag/select/delete points), with calibration persisted per document (`plan_calibrations`) so it only needs to be done once per plan. New tables: `plan_measurements`, `plan_calibrations`.
- Fixed several bugs found only through real device testing (see `chapter-demo-prep.md` section 9 for the full writeup): Konva's custom React reconciler breaking under `next/dynamic` when Konva primitives are code-split individually (must lazy-load the whole canvas as one unit); Konva's `click` firing for any mouse button (middle-click-drag pan was also placing measurement points); the browser's native scroll-anchoring fighting our cursor/pinch-anchored zoom scroll math (fixed via `overflow-anchor: none`); `touch-action: pinch-zoom` alone blocking single-finger panning (needs `pan-x pan-y` instead, with pinch handled in JS).
- Added a true full-screen mode for the measurement tool (no modal chrome) on both mobile and desktop, plus cursor/pinch-anchored zoom, middle-mouse-button pan, and mobile-specific layout compaction (collapsed saved-measurements list, hidden verbose hint text) after repeated feedback that on-screen space for the plan itself was too cramped.

## 2026-07-22

- Removed the single-project assumption (highest-ROI item in `improvement-backlog.md`): every module (issues, blockers, documents, work logs, TIG, workflow) is now scoped to a specific project via a full URL restructure to `/projects/[projectId]/...`. `/` now redirects to a new `/projects` landing page (list + create); `/subcontractors` intentionally stays global/top-level since the `subcontractors` table isn't project-scoped in the schema.
- `repository.ts`: added `listProjects`, `getProjectById`, `createProjectRecord`; `listIssues`, `listActiveBlockers`, `listWorkLogs`, `listProjectDocuments`, `listTigPackages` now take a `projectId` and filter with `.eq("project_id", ...)`. `listIssues`/`getIssue` keep `projectId` optional so `listSubcontractors()`'s cross-project issue rollup (and the unscoped item-level issue API routes) keep working unchanged.
- New migration `20260722100000_project_insert_grant.sql` (insert grant on `projects`, no RLS on that table so no policy needed, consistent with the existing `issues`/`blocker_list` insert grants).
- Mock-fallback data intentionally stays unscoped (still models a single demo project) — same accepted simplification as the existing mock-create paths that don't persist.

## 2026-07-23

- Renamed the issue public id prefix from `KIV-` (product name) to `HIB-` (hiba), consistent with the newer `PRJ-` (projekt) convention — includes a data migration for already-seeded/live rows, plus `seed.sql` and `README.md` updates.
- Added `public_id` to `blocker_list` (`AKA-001` style) and `subcontractors` (`ALV-001` style) — neither had any human-readable identifier before (only the raw uuid). Blocker list cards now show the `AKA-` code instead of the project name (redundant now that the project banner already shows it).
- Added full subcontractor CRUD: `createSubcontractorRecord`, `updateSubcontractorRecord`, `deleteSubcontractorRecord` in `repository.ts`, `/api/subcontractors` (GET/POST) and `/api/subcontractors/[id]` (PATCH/DELETE) routes, a shared `SubcontractorForm` component (create + edit), and delete/edit controls on the `/subcontractors` list (`SubcontractorList`).
- New migrations: `20260723090000_issue_public_id_prefix_rename.sql`, `20260723100000_blocker_list_public_id.sql`, `20260723110000_subcontractors_public_id.sql`, `20260723120000_subcontractors_write_grant.sql`.

## 2026-07-24

- Fixed a real bug found via manual testing: `listIssues`/`listActiveBlockers`/`listWorkLogs`/`listProjectDocuments`/`listTigPackages` fell back to the old single-demo-project mock data whenever a Supabase query returned zero rows — harmless in the single-project era, but meant a genuinely empty new project (e.g. a freshly created one with no issues yet) showed the old demo issues instead of an empty list. Now mock fallback only triggers when Supabase is unavailable or the query actually errors; a real empty result renders as empty.
- Added project inheritance to `Issue` (`projectId`/`projectName`, mirroring the existing `BlockerItem`/`WorkLog`/`ProjectDocument` pattern) via a `projects(name,public_id)` join in `mapIssue`/`listSupabaseIssues`/`createSupabaseIssue`/`updateSupabaseIssueStatus`. `Issue.projectId` intentionally holds the project's public code (not the raw uuid), since nothing in the app needs the raw id from an issue and this makes it directly usable for building links.
- Added a global (not project-scoped) "Összes hiba" list at `/issues` and a global Kanban "Workflow tábla" at `/workflow`, both reusing the existing `IssueFilters`/`IssueTable` components with a new `showProject` flag that shows/links each row's project. No new migrations needed — purely an app-layer change on top of the existing `issues.project_id` relationship.

- Fixed mobile Workflow board's `@media (max-width: 720px)` override, which forced 6 fixed 260px columns into one row (worse than the tablet breakpoint's 3-per-row wrap) — now stacks status columns full-width, one per row, no horizontal scroll needed.
- Replaced letter-badge nav icons (single-letter abbreviations like "D", "H", "T") with a small hand-drawn SVG icon set (`NavIcons.tsx`), matching the existing inline-SVG convention already used for the document-delete icon (24x24 viewbox, stroke-based, no new dependency). Covers sidebar, bottom nav, and mobile overflow sheet.
- Flattened the mobile overflow sheet: removed the Munka/Dokumentáció/Admin section subheadings (only present on mobile, desktop sidebar keeps them) in favor of one continuous list with a single divider between project-specific and global items; renamed "Menü" to "Több" with a dot-grid icon so the last bottom-nav slot reads as a peer tab rather than a distinct hamburger control. User feedback: the nav structure difference between project/global context still doesn't fully feel resolved — flagged as an open thread to revisit, not considered done.

## Review checklist

- Keep this file current after commits that change architecture, persistence, deployment, or product direction.
- Before each new development step, check whether README, schema docs, and this progress log still match the repository.
- Do not record secrets, database passwords, service role keys, or `.env.local` contents here.
