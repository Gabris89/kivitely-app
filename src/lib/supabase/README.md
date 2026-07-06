# Supabase Placeholder

Supabase is not connected yet in this baseline.

This folder is reserved for the future integration:

- `client.ts` for a browser-safe Supabase client
- server-side helpers for API routes or server actions
- typed database helpers after the schema stabilizes

Local development values can live in `.env.local`, which is ignored by git:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

Do not require these variables in app code until Supabase is intentionally connected. Do not add direct connection strings, database passwords, secret keys, service role keys or other private credentials to this repository.
