# Kivitely product/domain baseline

Last reviewed: 2026-07-10

## Product direction

Kivitely is a mobile-first field execution and proof system for construction work. The current MVP started from hibalista, photo proof, subcontractor feedback, completion tracking and TIG preparation, but new business input expands the domain toward a broader field record system.

The core product question is not only "what issues are open?", but:

- who worked or reported something
- on which project and trade
- on what date
- what happened or blocked progress
- what photo/document proof exists
- who can see the record
- whether the record can support completion, extra work or TIG preparation

## Target users and roles

Current repo coverage is strongest for project manager/admin style usage. The intended product model should support these roles:

- Admin / munkáltató: sees all projects, workers, subcontractors, issues, blockers, work logs, documents and notes.
- Munkavállaló: creates and sees own field records; also sees admin/employer notes relevant to their work.
- Alvállalkozó: sees assigned issues/work items, related evidence requests and status feedback for their own scope.
- Projektvezető / művezető: operational role for assigning, reviewing, accepting and preparing TIG evidence.
- Viewer / client later: read-only access to selected accepted/completion records, if needed.

Auth and RLS are not implemented yet. These roles are product/domain targets, not current security guarantees.

## Visibility rules

Proposed visibility model:

- Admin / munkáltató sees everything in the tenant/project.
- Project manager sees all records on assigned projects.
- Worker sees records created by them and admin comments addressed to them.
- Subcontractor sees assigned issues, evidence requirements and their own subcontractor records.
- Private internal notes should be separate from worker-visible/admin-visible comments.
- Project-level documents/plans can be shared broadly, but access should still be scoped by project membership.

These rules should eventually become Supabase Auth + RLS policies. Until auth exists, avoid adding broad write paths that assume real security.

## Main modules

### Existing MVP modules

- Dashboard: project summary, issue KPIs and activity feed.
- Hibalista: searchable issue list and detail workflow.
- Workflow tábla: status-based Kanban view for issues.
- Alvállalkozók: simple subcontractor load/readiness view.
- TIG csomag: preparation view for completion proof packages.
- Mobile/PWA view: field-oriented compact entry point.

### Domain modules implied by new business input

- Teljesítménynapló: daily/work log entries by worker, project and trade.
- Akadálylista: blocker records explaining why work cannot continue.
- Pótmunka megjegyzés: extra work notes that may later need approval or pricing.
- Dokumentumok / építész tervek: project-level plan/document references.
- Admin megjegyzések: employer/admin notes visible to the intended worker/subcontractor.

## Current schema coverage

Current baseline tables:

- `projects`: project identity, address, client, phase, progress.
- `subcontractors`: subcontractor identity, trade and contact info.
- `issues`: central hibalista item with project, subcontractor, title, description, location, trade, assignee, status, priority and value.
- `issue_evidence`: metadata for issue proof records, currently controlled for before/after photo metadata.
- `issue_events`: audit trail for issue status changes.
- `tig_packages`: placeholder package entity for TIG preparation.
- `tig_package_issues`: join table between TIG packages and issues.

Current controlled Supabase writes:

- create issue rows
- update issue status
- insert issue status audit events
- insert issue evidence metadata

Current deliberate gaps:

- no Supabase Auth
- no RLS visibility model
- no Storage or real file upload
- no TIG package write path
- no worker profile table
- no work log/blocker/extra work/document tables

## Status workflow concept still open

The current issue status workflow is useful for the MVP, but the product meaning of each terminal or accounting-related state is not fully decided yet.

Open questions:

- Does `closed` mean field work is done, or does it also mean the item is billable/accounting-ready?
- Is `tig_ready` a workflow status, or should it be a derived readiness flag based on evidence and acceptance rules?
- Can an issue be closed even if it is not TIG-ready, for example because it was cancelled, rejected permanently, not billable, or handled outside TIG?
- Should missing technical description block only TIG package preparation, or should it block status transitions too?
- Should there be separate states for "field closed", "accepted", "TIG-ready", "in TIG package" and "paid/settled"?

Temporary MVP stance:

- Keep the current issue workflow lightweight.
- Treat TIG-readiness primarily as a derived validation/readiness signal, not as final accounting truth.
- Avoid overfitting hard status rules until the business workflow is clarified with real users.
- Document inconsistencies and revisit the model before implementing Auth/RLS, TIG package writes or accounting exports.

## Missing domain objects

The new business input suggests these domain objects:

- `users` / `profiles`: application identity, display name, role and company relation.
- `project_members`: which user or company can access which project.
- `workers`: if workers are distinct from auth users or need employment metadata.
- `work_entries`: performance/day-log entries with worker, project, trade, date, text note and evidence.
- `blockers`: akadály records with project, responsible party, status and resolution notes.
- `extra_work_notes`: pótmunka records with description, evidence, value estimate and approval status.
- `project_documents`: plans, architect drawings and other project-level documents.
- `comments` or `record_notes`: visible/admin/internal notes attached to records.

## Recommended data model direction

Do not replace `issues` immediately. It already works for hibalista, status workflow, evidence and TIG-readiness. Keep it as the hibalista/workflow object.

For the broader product, add adjacent tables instead of forcing every field record into `issues`:

- keep `issues` for defects, assigned correction work and acceptance workflow
- add `work_entries` for daily performance logs
- add `blockers` for akadálylista
- add `extra_work_notes` for pótmunka
- add `project_documents` for plans and documents
- add `profiles` and `project_members` before real visibility/RLS work

This keeps the current MVP stable while allowing the product to expand into a field execution log.

Avoid a single generic `field_records` table for the next step unless the schema starts duplicating heavily. A generic table can look flexible early, but it can blur workflows that need different statuses, permissions and approval rules.

## Suggested MVP development order

1. Finish current TIG-readiness UI/read-only logic.
2. Document role and visibility assumptions before implementing auth.
3. Add `profiles` + `project_members` schema baseline, without full auth UI if needed.
4. Add read-only role/visibility modeling in repository helpers or seed data.
5. Add `work_entries` schema and a minimal mobile-first daily log UI.
6. Add `blockers` schema and simple akadálylista UI.
7. Add `extra_work_notes` schema and pótmunka note workflow.
8. Add Supabase Storage for evidence files once metadata flow is stable.
9. Add real Auth + RLS policies.
10. Add TIG package write flow and export generation.

## Next safe implementation step

The next implementation step should not be a broad auth/RLS build. The safer path is a schema/documentation step:

- define `profiles`
- define `project_members`
- define visibility assumptions
- keep writes limited and controlled until auth is actually present

After that, build the smallest field-facing feature: `work_entries` for teljesítménynapló.
