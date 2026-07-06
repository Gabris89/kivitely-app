# Supabase Read-Only Integration

Supabase is prepared as an optional read-only data source.

Current scope:

- `client.ts` creates an `@supabase/supabase-js` client when public environment values are present
- repository functions fall back to mock data when Supabase is not configured or a read fails
- write paths still stay mock-only
- no service role keys, database passwords, or direct connection strings are required

Run the migrations in order before testing reads from a hosted Supabase project:

1. `supabase/migrations/20260706210901_initial_kivitely_schema.sql`
2. `supabase/migrations/20260706215823_read_only_api_grants.sql`
3. `supabase/seed.sql`

Local development values can live in `.env.local`, which is ignored by git:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

Do not add service role keys or other private credentials to this repository.
