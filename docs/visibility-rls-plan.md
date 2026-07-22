# Kivitely visibility / RLS plan

Last reviewed: 2026-07-10

This is a local planning document. It describes the intended visibility and Row Level Security direction before Supabase Auth and RLS policies are implemented.

Current scope:

- no Supabase Auth wiring
- no RLS policies
- no app logic changes
- no new write routes
- no service role assumptions

## Current database baseline

Relevant existing tables:

- `profiles`: planned application user/profile record. It can later link to Supabase Auth through `auth_user_id`, but that is not wired yet.
- `project_members`: project access join table between `projects` and `profiles`.
- `projects`: project identity and progress metadata.
- `subcontractors`: subcontractor identity and trade/contact metadata.
- `issues`: hibalista/workflow item tied to a project and optionally to a subcontractor.
- `issue_evidence`: issue proof metadata, currently before/after photo metadata without Storage.
- `issue_events`: issue status/audit timeline.
- `tig_packages` and `tig_package_issues`: TIG preparation placeholders.

Current role enum values:

- `admin`
- `employer`
- `project_manager`
- `site_manager`
- `worker`
- `subcontractor`
- `viewer`

Current seed coverage:

- one test project
- one subcontractor
- two issues
- issue evidence and event examples
- five profiles: admin, project manager, worker, subcontractor and viewer
- five `project_members` records tied to the test project

## Role intent

### admin

Full operational and administrative access.

Expected access:

- sees all projects
- sees all issues, evidence, events and TIG packages
- sees all project members and profiles
- can manage project access later
- can see employer/admin notes and worker-visible notes
- can perform controlled writes after Auth/RLS exists

### employer

Business owner / munkaltato role. In the current seed, this is represented by the admin-style profile; the enum already supports a separate `employer` role.

Expected access:

- sees projects owned by or shared with their organization
- sees all worker/subcontractor records on those projects
- sees admin/employer notes
- can review performance, blockers, extra work and TIG readiness later

### project_manager

Project-level operational controller.

Expected access:

- sees projects where they have a `project_members` row
- sees all issues and evidence on those projects
- sees issue audit history
- can assign/review/accept status later
- can see admin/employer notes if they are project-operational notes
- can see worker notes that are not private personal notes

### site_manager

Field-level operational controller. Similar to `project_manager`, but may have a narrower scope later.

Expected access:

- sees projects where they have a `project_members` row
- sees field records, issues, blockers and evidence on those projects
- can update operational field status later
- should not automatically receive business/accounting-level permissions

### worker

Munkavallalo / field worker.

Expected access:

- sees projects where they have a `project_members` row
- sees own work records and assigned field tasks
- sees admin/employer notes addressed or visible to them
- sees own worker notes
- should not see other workers' private notes by default
- should not see internal admin-only comments

### subcontractor

External subcontractor / alvallalkozo.

Expected access:

- sees projects where they have a `project_members` row
- sees issues assigned to their subcontractor scope
- sees evidence requests and evidence records related to their assigned issues
- sees relevant status feedback
- should not see unrelated subcontractor issues or internal admin notes

### viewer

Read-only limited user.

Expected access:

- sees projects where they have a `project_members` row
- sees selected project/issue data
- no writes
- no internal notes unless explicitly shared later

## Project visibility

Baseline rule:

- a user/profile can see a project if there is an active `project_members` row with `project_members.project_id = projects.id`, `project_members.profile_id = profiles.id` and `can_view_project = true`

Planned exceptions:

- `admin` may see all projects
- `employer` may see all projects in their organization, but organization/tenant modeling does not exist yet

Current schema gap:

- there is no `organizations` or `tenant_id`
- `profiles.company_name` is free text, not a secure organization boundary
- `project_members` is therefore the safest near-term access boundary

## Issue visibility

Recommended baseline:

- `admin`: all issues
- `employer`: all issues on visible projects
- `project_manager`: all issues on visible projects
- `site_manager`: all issues on visible projects
- `worker`: issues on visible projects when assigned to them, created by them, or explicitly shared later
- `subcontractor`: issues on visible projects that match their subcontractor relation/scope
- `viewer`: read-only issues on visible projects

Current schema limitations:

- `issues.created_by` exists but is not linked to `profiles.id` through a foreign key
- `issues.assignee_name` is text, not a profile reference
- subcontractor visibility can use `issues.subcontractor_id`, but `profiles` are not linked to `subcontractors`
- there is no issue watcher/shared-with table

Near-term RLS should therefore start with project-level visibility, then become stricter after profile-to-worker/subcontractor links exist.

## Issue field edit permissions

Recommended future edit matrix:

| Field group | admin | employer | project_manager | site_manager | worker | subcontractor | viewer |
| --- | --- | --- | --- | --- | --- | --- | --- |
| issue creation | yes | yes | yes | yes | limited | limited | no |
| title/description/location/trade | yes | yes | yes | yes | own/limited | own/limited | no |
| subcontractor/assignee | yes | yes | yes | yes | no | no | no |
| due date/priority/value | yes | yes | yes | limited | no | no | no |
| status | yes | yes | yes | yes | limited transitions | limited transitions | no |
| evidence metadata | yes | yes | yes | yes | own/assigned | own/assigned | no |
| TIG package membership | yes | yes | yes | no/limited | no | no | no |

Current app state:

- new issue creation writes only to `issues`
- status update writes only `issues.status` and `issues.updated_at`
- status audit writes `status_changed` events
- evidence metadata writes only `issue_evidence`
- no Auth identity is available, so all current write paths are controlled MVP paths, not final security boundaries

## Admin / employer notes visibility

Business input:

- "Az Admin / Munkaltato mindent lasson"
- "A munkavallalo csak a sajat illetve az Admin megjegyzeseit lassa"

Interpretation:

- admin/employer notes should be separate from general public comments
- admin/employer should see all note types
- worker should see notes created by themselves and notes marked visible to them
- subcontractor should see notes explicitly shared to their subcontractor scope
- viewer should not see internal notes by default

Schema gap:

- no `comments`, `record_notes` or `visibility` column exists yet
- `issue_events.description` is not a suitable private note model
- `issues.description` is the issue technical description, not a notes system

Recommended object:

- `record_notes`
  - `id`
  - `project_id`
  - `record_type`
  - `record_id`
  - `author_profile_id`
  - `body`
  - `visibility` enum: `internal`, `admin_employer`, `project_team`, `assigned_worker`, `assigned_subcontractor`, `public_project`
  - `created_at`

Do not implement this before the first Auth/RLS direction is accepted.

## Worker own notes visibility

Worker notes should not be mixed into status audit or admin notes.

Recommended rule:

- worker can see their own notes
- admin/employer can see all worker notes
- project_manager/site_manager can see worker notes if the note is operational/project-visible
- other workers cannot see it by default
- subcontractors cannot see worker notes unless explicitly shared

Schema gap:

- no worker identity link exists yet
- no work log table exists yet
- no note visibility model exists yet

The worker note model should probably be attached to `work_logs` first, not to `issues`.

## Missing domain objects

### work_logs

Purpose:

- teljesitmeny naplo
- field worker daily record
- project/trade/date based work summary
- optional evidence/document references later

Suggested fields:

- `id`
- `project_id`
- `profile_id`
- `trade`
- `work_date`
- `description`
- `quantity`
- `unit`
- `status`
- `created_at`
- `updated_at`

### blocker_list

Purpose:

- akadaly lista
- record why work cannot continue
- track responsibility and resolution

Suggested fields:

- `id`
- `project_id`
- `created_by_profile_id`
- `assigned_to_profile_id`
- `title`
- `description`
- `status`
- `severity`
- `resolved_at`
- `created_at`
- `updated_at`

### extra_work_notes

Purpose:

- potmunka megjegyzes
- extra work request/record before pricing or approval

Suggested fields:

- `id`
- `project_id`
- `created_by_profile_id`
- `subcontractor_id`
- `title`
- `description`
- `estimated_value_huf`
- `status`
- `created_at`
- `updated_at`

### documents / plans

Purpose:

- photo document
- epitesz tervek
- project-level files before or after Supabase Storage

Suggested fields:

- `id`
- `project_id`
- `uploaded_by_profile_id`
- `document_type`
- `title`
- `storage_path`
- `visibility`
- `created_at`

Storage can come later; metadata can be modeled first if needed.

## Recommended RLS policy order

Do not start with every table at once.

1. Auth/Profile link baseline
   - connect `profiles.auth_user_id` to `auth.users.id`
   - decide whether profile creation is manual/admin-only or trigger-based

2. Read-only project access
   - enable RLS on `projects`
   - allow select by `project_members`
   - admin exception only after admin role lookup is reliable

3. Read-only issue access
   - enable RLS on `issues`
   - allow select if the issue's project is visible through `project_members`
   - keep stricter worker/subcontractor issue filtering for a later step

4. Read-only related records
   - `issue_evidence`
   - `issue_events`
   - `tig_packages`
   - `tig_package_issues`
   - all via visible parent project/issue

5. Controlled insert/update policies
   - migrate current anon-style MVP grants toward authenticated policies
   - issue create
   - issue status update
   - issue event insert
   - issue evidence metadata insert

6. Notes visibility
   - only after `record_notes` or equivalent table exists
   - implement internal/admin/worker visibility explicitly

7. New domain modules
   - `work_logs`
   - `blocker_list`
   - `extra_work_notes`
   - `documents`

## Keep mock / planning level for now

Keep these at planning/mock level:

- full Auth UI
- RLS policies
- service role server actions
- organization/tenant hierarchy
- worker private notes
- subcontractor portal boundaries
- Storage uploads
- TIG package write/export flow
- accounting/payment/settlement states

Reason:

- current app still uses controlled MVP write paths
- schema is still evolving
- exact status and note visibility semantics are not settled
- premature RLS can make development harder without providing real user security until Auth is wired

## Next real implementation after this plan

Recommended next true implementation step:

1. Add a minimal `work_logs` schema baseline.
2. Add seed data for one worker daily log.
3. Keep it read-only or mock-visible in the app first.
4. Do not add Auth/RLS until the work log shape is validated.

Alternative if security becomes the immediate priority:

1. Wire Supabase Auth minimally.
2. Link one Auth user to one `profiles` row.
3. Add read-only RLS for `projects` through `project_members`.
4. Do not add write policies in the same step.

Preferred path for the current MVP:

- finish domain shape first with `work_logs`, then introduce Auth/RLS in a narrow read-only slice.
