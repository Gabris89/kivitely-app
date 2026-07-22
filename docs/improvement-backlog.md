# Kivitely improvement backlog

Last reviewed: 2026-07-17

This is a living backlog, not a point-in-time plan like the other `docs/*.md` files. It is meant to be watched continuously and used as a source of individual, small-scope tasks — pick one unchecked item at a time, implement it, check it off, add a short note.

Related docs:

- [product-domain-baseline.md](product-domain-baseline.md) — target roles, domain objects, suggested MVP order
- [visibility-rls-plan.md](visibility-rls-plan.md) — Auth/RLS direction
- [documents-plans-baseline.md](documents-plans-baseline.md) — documents/plans module
- [mobile-ux-redesign-plan.md](mobile-ux-redesign-plan.md) — mobile navigation/layout direction
- [progress-log.md](progress-log.md) — chronological record of what was actually shipped

## How to use this file

- Work one item at a time. Do not batch unrelated items into one commit.
- When an item is done: check the box, add `(done YYYY-MM-DD)` after it, and add a matching entry to `progress-log.md`.
- When new findings come up (code review, manual testing, user feedback), add them under the right section with today's date. Do not silently delete old items — if something turns out to be wrong or obsolete, cross it out and say why.
- Keep this file local (not committed), same convention as the other planning docs under `docs/`.

## Review snapshot — 2026-07-17

Full-repo review covering code (`repository.ts`, migrations, app structure) and the existing `docs/*.md` planning baseline.

### Strengths (context, not action items)

- Strong discipline: uncertainty is written into `docs/`, not baked into code as premature decisions.
- Consistent mock-fallback pattern in `repository.ts` — the app never breaks in a demo even without Supabase.
- Consistent module rollout order: schema baseline → seed → read-only UI → controlled write, applied the same way for `work_logs`, `blocker_list`, `project_documents`.
- Domain model correctly keeps `issues` separate from `work_entries` / `blockers` / `project_documents` instead of forcing one generic table.

### Risks / weaknesses

- [ ] **Anon role currently has real write access.** `issues` insert policy is `with check (true)` for `anon, authenticated`; the `issue-evidence` and `project-documents` storage buckets are public. This is fine while the app is only used locally/demoed, but it is a live risk (spam writes, storage abuse) the moment any public URL exists — not just "future Auth work". **Update 2026-07-21: the app is now actually deployed on a public Vercel URL** (`kivitely-app.vercel.app`), so this is no longer a hypothetical future risk. `plan_measurements` and `plan_calibrations` (new tables added 2026-07-21 for the plan measurement tool) were built with the same open `anon`/`authenticated` select/insert/update/delete policies, consistent with the rest of the MVP tables — same risk, same reasoning, tracked here rather than re-litigated per table. Before any wider sharing of the public URL: at minimum add basic abuse protection (rate limiting on the API routes, or restrict insert/update/delete to `authenticated`).
- [x] **Single-project assumption is baked into the code, not just the UI.** ~~`getProject()` always returns the single earliest project (`order by created_at`, `limit(1)`); `listIssues`, `listActiveBlockers`, `listWorkLogs` do not filter by project at all.~~ Resolved 2026-07-22: full URL restructure to `/projects/[projectId]/...`, project creation, and `projectId`-filtered list functions. See `progress-log.md`.
- [x] **"Mobil/PWA" naming is currently misleading.** ~~No `manifest.json`, no service worker, no offline cache — it's a responsive page, not an installable/offline-capable PWA.~~ Resolved 2026-07-21 by deleting the page entirely — it was a static mockup of a hypothetical future mobile view, not a real feature, and it was actively confusing (the app itself is already mobile-responsive). See `progress-log.md` 2026-07-21.
- [ ] **Permission checks are hardcoded, not role-driven.** `moveIssueStatusRecord` always calls `canMoveIssue(issue, targetStatus, "project_manager")` regardless of who is actually using the app. Not a security hole yet (no Auth), but it means workflow-rule testing is currently meaningless — everyone behaves as the highest-privilege role.
- [ ] **No automated tests anywhere in the repo.** `repository.ts` alone is 1000+ lines with nontrivial mapping/branching logic (Supabase↔mock mapping, storage path construction, TIG readiness derivation) and zero test coverage.
- [ ] **`globals.css` is 2100+ hand-written lines**, no Tailwind/CSS modules. Manageable now, but this is the shape of file that becomes risky to touch past ~3-4k lines because nothing guarantees a change elsewhere doesn't break.
- [ ] **TIG module is the least finished part despite being closest to direct business value** (billing/settlement basis). `tig_packages` write path is still mock-only; `proofCount` is hardcoded to `0` in the mapping.

### Short-term fixes

- [x] Add project filtering to list functions (`listIssues(projectId)`, `listActiveBlockers(projectId)`, `listWorkLogs(projectId)`, etc.) plus a project selector in the UI. Highest ROI item — gets more expensive to retrofit the more modules build on the "one global project" assumption. Done 2026-07-22 via full URL restructure to `/projects/[projectId]/...` — see `progress-log.md`.
- [ ] Tighten insert policies before any external/public access — review the `with check (true)` policies, consider `authenticated`-only writes or basic rate limiting on the API routes.
- [ ] Stop hardcoding the actor role in `canMoveIssue` calls — thread through whatever role context exists (even a temporary/mock one), and mark it clearly as a placeholder until real Auth lands.
- [ ] Add basic unit tests for the pure mapping functions in `repository.ts` (`mapIssue`, `mapWorkLog`, `mapBlocker`, `mapProjectDocument`, etc.) — cheap to test, and these are exactly the functions that break silently on schema changes.

### Mid-term direction

- [ ] Pull multi-project support earlier in the sequence than `product-domain-baseline.md` currently implies — it should land before/alongside `profiles` + `project_members`, not as an afterthought once more modules already assume a single project.
- [ ] Consider moving the TIG write flow (accounting export) earlier relative to Auth/RLS if there's business pressure to demonstrate it — can stay admin-only behind a narrow, explicitly gated API route without full Auth.
- [ ] Otherwise the existing suggested order in `product-domain-baseline.md` (profiles/project_members → work_entries → blockers → extra_work_notes → Storage → Auth/RLS → TIG write) still holds.

### Use case ideas — what would make this genuinely valuable

- [ ] Real offline-first mode: local queue for photos/entries that syncs when connectivity returns. Not a "nice to have" on a construction site — without it, field workers revert to paper.
- [ ] Photo annotation (arrow/circle drawn on the evidence photo) to point at exactly what the defect is. Small effort, high perceived value.
- [ ] Push notifications: subcontractor notified when an issue/blocker is assigned to them; admin notified when something becomes TIG-ready.
- [ ] PDF/Excel export for TIG packages and reports — the bridge between the app and actual invoicing/accounting, without which the TIG module stays a status list.
- [ ] QR code / location tagging per room or area, linking straight to that location's issue list / plans. Fits naturally with the existing `location`/`area` fields.
- [ ] Client-facing read-only portal (the `viewer` role already exists in the domain plan) — likely the strongest sales differentiator: a client watching real-time TIG-ready progress.
- [ ] Weather integration for the blocker list — auto-suggest/prefill a "weather blocker" based on project location/date.
- [ ] Aggregate dashboard reporting: TIG-ready value per project, which subcontractor is slipping most, etc. — gives the employer/admin role a daily reason to open the app, not just field workers.
