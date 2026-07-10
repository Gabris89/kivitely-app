# Supabase Integration

Supabase is prepared as an optional persistence layer with controlled MVP write paths.

Current scope:

- `client.ts` creates an `@supabase/supabase-js` client when public environment values are present
- repository functions fall back to mock data when Supabase is not configured or a read fails
- new issue creation can insert into the `issues` table when Supabase is configured
- issue status changes can update `issues.status` and `issues.updated_at` when Supabase is configured
- successful Supabase status changes can insert `status_changed` rows into `issue_events`
- evidence metadata can insert `before_photo` and `after_photo` rows into `issue_evidence`
- `profiles` and `project_members` are prepared as a schema baseline for later Auth/RLS visibility work
- `work_logs` is prepared as a schema baseline for later teljesitmenynaplo support
- `supabase/seed.sql` includes minimal role and project membership sample data for manual visibility planning
- Supabase Storage, real file uploads and TIG write paths still stay mock-only
- no service role keys, database passwords, or direct connection strings are required

Run the migrations in order before testing reads from a hosted Supabase project:

1. `supabase/migrations/20260706210901_initial_kivitely_schema.sql`
2. `supabase/migrations/20260706215823_read_only_api_grants.sql`
3. `supabase/migrations/20260706222250_issue_insert_policy.sql`
4. `supabase/migrations/20260707084021_issue_status_update_policy.sql`
5. `supabase/migrations/20260707091122_issue_event_insert_policy.sql`
6. `supabase/migrations/20260707092854_issue_evidence_insert_policy.sql`
7. `supabase/migrations/20260710213835_profiles_project_members_baseline.sql`
8. `supabase/migrations/20260710221035_work_logs_baseline.sql`
9. `supabase/seed.sql`

Local development values can live in `.env.local`, which is ignored by git:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

Do not add service role keys or other private credentials to this repository.
