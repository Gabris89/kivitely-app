# Kivitely visibility / RLS plan

Last reviewed: 2026-07-10 (status block added 2026-07-28)

This is a local planning document. It describes the intended visibility and Row Level Security direction before Supabase Auth and RLS policies are implemented.

> **Status update, 2026-07-28.** Parts of this plan have been implemented since it
> was written, so read the sections below as *intent*, not as *current state*. The
> execution order and the delivered state live in `permissions-plan.md`; the
> verification steps live in `permissions-test-plan.md`.
>
> What is no longer true here:
>
> - "no Supabase Auth wiring" - Auth is wired (`profiles.auth_user_id`, step 1/1b).
> - "no app logic changes" - the app now enforces both a permission matrix
>   (`src/lib/permissions.ts`, step 2) and a visibility scope
>   (`src/lib/visibility.ts`, step 3).
> - "`profiles` are not linked to `subcontractors`" (Issue visibility section) -
>   `profiles.subcontractor_id` exists since migration `20260728090000`, and the
>   subcontractor issue filter is built on it.
> - The `work_logs`, `blocker_list`, `project_documents` and `plan_measurements`
>   tables listed under "Missing domain objects" have since been created.
> - `employer` is not treated as a narrower role than `admin` in the delivered
>   scoping: `admin`, `employer` and `project_manager` all see every project and
>   every issue, because there is still no organization/tenant model to scope an
>   employer to. `site_manager` and `viewer` see their member projects in full;
>   `worker` and `subcontractor` see their member projects filtered to their own
>   company.
>
> What is still accurate and still pending: everything about RLS. No table has RLS
> policies yet, so the filtering above is application-level only. The
> "Recommended RLS policy order" section remains the plan for step 4.

## Mit jelent az RLS, és mi a valós kitettség ma (2026-07-30, letesztelve)

**Row Level Security (sor-szintű biztonság).** A tábla-jogosultság ma "minden vagy
semmi": aki elér egy táblát, minden sorát eléri. Az RLS ezt sor-szintre viszi - a
Postgres minden lekérdezéshez hozzáilleszt egy feltételt, ami a bejelentkezett
felhasználóhoz (`auth.uid()`) kötődik, pl. "csak azok a hibák, amelyek olyan
projekthez tartoznak, aminek tagja vagyok". Ez az **adatbázisban** él, nem az
appban, ezért akkor is véd, ha az app kódja hibázik, vagy ha valaki megkerüli az
appot.

**Korrekció egy korábbi feltételezéshez.** A korábbi doksik és a demó több helyen
azt állították, hogy "a publishable kulcs a böngészőben van, bárki kimásolhatja".
Ez a *jelenlegi* architektúrában **nincs így** - letesztelve (16 kliens-bundle, 4
oldal): a Supabase URL, a publishable kulcs és az env-változó neve **egyik
kliens-bundle-ben sem szerepel**. Ok: a Supabase klienst (`src/lib/supabase/*`)
kizárólag szerver-oldali modul (`repository.ts`) hívja, egyetlen `"use client"`
komponens sem éri el, ezért a Next.js nem is inline-olja a böngésző-kódba. A
konkrét "devtools-ból kihúzom a kulcsot és mindent lekérek" forgatókönyv tehát ma
**nem kivitelezhető** ezen a builden.

**Ettől az RLS még kell** - csak a *miért* változik:

1. **Defense-in-depth az app-hibák ellen.** A szerver ma a
   publishable/authenticated szereppel beszél a Supabase-szel, és a hatókör-szűrést
   kizárólag a `repository.ts` végzi. Ha bárhol kimarad a szűrés - pontosan mint a
   három hatókör-lyuk, amit a `4244548` commit javított -, az adatbázis boldogan
   visszaad mindent. Az RLS az adatbázisban utasítja el, a kód hibáitól függetlenül.
2. **Jövőbiztosítás.** Ha a kulcs valaha kliens-oldalra kerül (realtime,
   direkt Storage feltöltés, direkt lekérdezés), a védelemnek már ott kell lennie.
3. **Storage.** A bucketek ma **publikus olvasásúak** - a fotó/dokumentum-URL-ek
   kitalálhatók vagy megoszthatók, bejelentkezés nélkül is. Ez tényleges, jelenlegi
   kitettség, és az RLS-munka része a Storage-policy is.

Vagyis: az RLS súlypontja "azonnali, nyitott rés" helyett "mélységi védelem +
Storage + jövőbiztosítás". A Storage publikus olvasása az egyetlen olyan pont, ami
ma is valós adatkiszivárgást enged.

### Leszállított migrációk (2026-07-30, tábla-olvasás szűrése)

Az audit (`supabase/rls-audit.sql`) alapján kiderült: mind a 12 érintett táblán
RLS BE VAN kapcsolva, de a SELECT policy-k `using(true)` permisszívek. A csere
táblánként egy migráció (a felhasználó egyesével futtatja, tesztel közötte):

- `20260730090000_rls_scope_helpers.sql` – 3 security-definer segédfüggvény
  (`current_user_is_portfolio`, `current_user_is_company_filtered`,
  `current_user_subcontractor_id`). Viselkedést nem változtat.
- `20260730100000_rls_projects.sql` – projects (id szerint).
- `20260730110000_rls_issues.sql` – issues (projekt + cég).
- `20260730120000_rls_issue_children.sql` – issue_evidence, issue_events (a
  szülő hibától öröklik: `issue_id in (select id from issues)`).
- `20260730130000_rls_project_scoped.sql` – blocker_list, work_logs,
  project_documents (projekt-scope, cég nélkül). Két mellékhatás: a
  blocker_list két permisszív policy-ja + a statusz-szűrő eltűnik; a work_logs
  eddig RLS-ON de policy NÉLKÜL volt (mindenkinek ÜRES), ezt egyben javítja is.
- `20260730140000_rls_tig.sql` – tig_packages (projekt+cég), tig_package_issues.
  Külön kezelés: a `for all using(true)` írás-policy-t is le kell dobni (mert a
  USING a SELECT-re is hat), az írást változatlan insert/update/delete
  policy-ként adjuk vissza.
- `20260730150000_rls_measurements.sql` – plan_measurements, plan_calibrations
  (a dokumentumtól öröklik).
- `20260730160000_rls_subcontractors.sql` – subcontractors (cég-szűrés).

Az összes új SELECT policy `to authenticated` (az anon default-deny → üres). A
DB-szintű visszamérés: `e2e/rls/rls-direct.spec.ts` (az appot megkerülve, valódi
JWT-vel, közvetlen REST). Ez KÜLÖN parancs – `npm run test:e2e:rls` –, mert
`signInWithPassword`-del jelentkezik be a hat fiókra, ami elrontaná az app-alapú
tesztek megosztott munkameneteit; ezért nem futhat velük együtt. Minden
migrációban ott a visszavonó SQL.

**Visszamérve (2026-07-30, a migrációk lefuttatása után):** `test:e2e:permissions`
27 zöld (az app hatóköre nem tört el), `test:e2e:rls` 8 zöld (a DB MAGA szűr:
minden szerep közvetlen REST-lekérdezése pontosan a hatókört adja vissza, az anon
ürest). A kettős szűrés (RLS + app) egyetért.

**Még mindig nyitott:** Storage publikus olvasás (következő kör), és az
insert/update/delete policy-k szűkítése (az írást ma a szerveroldali
`checkPermission` védi).

Original scope of this document (as written on 2026-07-10):

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
