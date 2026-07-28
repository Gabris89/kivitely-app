# Supabase Integration

Supabase is prepared as an optional persistence layer with controlled MVP write paths.

Current scope:

- `client.ts` creates an `@supabase/supabase-js` client when public environment values are present
- repository functions fall back to mock data when Supabase is not configured or a read fails
- new issue creation can insert into the `issues` table when Supabase is configured
- issue status changes can update `issues.status` and `issues.updated_at` when Supabase is configured
- successful Supabase status changes can insert `status_changed` rows into `issue_events`
- evidence metadata can insert `before_photo` and `after_photo` rows into `issue_evidence`
- issue evidence images can upload to the public MVP `issue-evidence` Storage bucket, store their `storage_path`, preview in-app and be deleted through a controlled API path
- `profiles` and `project_members` are prepared as a schema baseline for later Auth/RLS visibility work
- `profiles.subcontractor_id` links a login to a subcontractor company, and `issues.created_by` now has a real foreign key to `profiles` and is populated on insert; together they make "own issue" expressible for later ownership scoping
- `work_logs` is prepared as a schema baseline for later teljesitmenynaplo support
- `blocker_list` supports active blocker reads and controlled blocker creation under narrow MVP RLS policies
- `project_documents` supports project-level document and architectural plan metadata reads plus controlled Storage-backed uploads
- `project_documents` has an explicit select policy (RLS was enabled with only an insert policy, so reads silently returned zero rows and the app always fell back to mock data)
- `profiles` display names can be read for responsible-person labels in blocker views/forms
- `supabase/seed.sql` includes minimal role, project membership, work log, blocker and project document metadata sample data for manual visibility planning
- TIG write paths still stay mock-only
- no service role keys, database passwords, or direct connection strings are required
- `src/proxy.ts` (Next.js 16's replacement for `middleware.ts`) gates every route behind a Supabase Auth session, using `@supabase/ssr`; unauthenticated requests redirect to `/login` (API routes get a 401 JSON response instead)
- `src/lib/supabase/server.ts` provides the cookie-aware server client used by `/login` and the proxy; this is separate from `client.ts`'s anon read/write client, which still powers all the existing data flows unchanged
- the login gate does not change table RLS - it only requires a valid session to reach the app; per-role data visibility is still the later step described in `docs/visibility-rls-plan.md`
- Auth users are not created by any migration or seed - create them manually in the Supabase Dashboard (Authentication → Users → Add user, email + password, no email confirmation needed for this use case)

Run the migrations in order before testing reads from a hosted Supabase project:

1. `supabase/migrations/20260706210901_initial_kivitely_schema.sql`
2. `supabase/migrations/20260706215823_read_only_api_grants.sql`
3. `supabase/migrations/20260706222250_issue_insert_policy.sql`
4. `supabase/migrations/20260707084021_issue_status_update_policy.sql`
5. `supabase/migrations/20260707091122_issue_event_insert_policy.sql`
6. `supabase/migrations/20260707092854_issue_evidence_insert_policy.sql`
7. `supabase/migrations/20260710213835_profiles_project_members_baseline.sql`
8. `supabase/migrations/20260710221035_work_logs_baseline.sql`
9. `supabase/migrations/20260710222552_work_logs_read_grant.sql`
10. `supabase/migrations/20260711064121_blocker_list_baseline.sql`
11. `supabase/migrations/20260711074232_blocker_list_insert_grant.sql`
12. `supabase/migrations/20260711075844_blocker_list_active_read_policy.sql`
13. `supabase/migrations/20260711080917_profiles_public_name_read_policy.sql`
14. `supabase/migrations/20260712093000_issue_evidence_storage_policy.sql`
15. `supabase/migrations/20260712100000_issue_evidence_delete_policy.sql`
16. `supabase/migrations/20260713111922_project_documents_baseline.sql`
17. `supabase/migrations/20260713124124_project_documents_read_grant.sql`
18. `supabase/migrations/20260717103000_project_documents_storage_policy.sql`
19. `supabase/migrations/20260717120000_project_documents_select_policy.sql`
20. `supabase/migrations/20260720090000_project_documents_delete_policy.sql`
21. `supabase/migrations/20260721090000_plan_measurements_baseline.sql`
22. `supabase/migrations/20260721100000_plan_measurements_note.sql`
23. `supabase/migrations/20260721110000_plan_measurements_update_policy.sql`
24. `supabase/migrations/20260721120000_project_update_delete_policy.sql`
25. `supabase/migrations/20260722090000_plan_calibrations_baseline.sql`
26. `supabase/migrations/20260722100000_project_insert_grant.sql`
27. `supabase/migrations/20260722110000_project_public_id.sql`
28. `supabase/migrations/20260723090000_issue_public_id_prefix_rename.sql`
29. `supabase/migrations/20260723100000_blocker_list_public_id.sql`
30. `supabase/migrations/20260723110000_subcontractors_public_id.sql`
31. `supabase/migrations/20260723120000_subcontractors_write_grant.sql`
32. `supabase/migrations/20260723130000_project_insert_policy.sql`
33. `supabase/migrations/20260724090000_blocker_list_update_delete_policy.sql`
34. `supabase/migrations/20260724100000_issue_update_delete_policy.sql`
35. `supabase/migrations/20260724110000_revoke_anon_write_access.sql`
36. `supabase/migrations/20260724120000_tig_package_write.sql`
37. `supabase/migrations/20260727090000_profiles_auth_link.sql`
38. `supabase/migrations/20260727140000_profiles_auth_hardening.sql`
39. `supabase/migrations/20260728090000_profiles_subcontractor_link.sql`
40. `supabase/seed.sql`

Local development values can live in `.env.local`, which is ignored by git:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

Do not add service role keys or other private credentials to this repository.
