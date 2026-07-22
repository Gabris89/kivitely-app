# Kivitely – fejlesztési napló / tanulságok

## 2026-07-22 — Biztonsági javítás: az anon szerep írási jogának megszüntetése (RLS)

### A probléma (tanulság)

Az app minden adatbázis-műveletét a Supabase **publishable (anon) kulccsal**, bejelentkezett session nélkül futtatta (`repository.ts` → `getSupabaseClient()`). A publishable kulcs **tervezetten publikus**: benne van minden böngészőbe letöltött JS-bundle-ben. A Row Level Security policy-k ezért `to anon, authenticated` szereppel, `with check (true)` feltétellel engedték az írást — vagyis **bárki, aki megnyitotta az éles oldalt, közvetlenül a Supabase REST API-n keresztül írhatott vagy törölhetett adatot** minden táblában és a storage-ban.

A login-fal (middleware) ezt **nem** védte: az csak a Next.js útvonalakat őrzi, az adatbázist nem. A védelmi vonalnak az RLS-nek kell lennie — és az nyitva állt.

Tanulság: **a publishable kulcs nem titok. A jogosultságot mindig az RLS + a szerep (`anon` vs `authenticated`) adja, nem az, hogy „csak az app hívja".** Ha egy művelet nem publikus, akkor authenticated session mögé kell tenni.

### A javítás (két rész)

**1. App-oldal — az írások a bejelentkezett session-nel futnak.**
Új helper: `getServerSupabaseClient()` a `src/lib/supabase/server.ts`-ben. Ez a bejelentkezett felhasználó session-cookie-ját továbbító szerver-klienst adja (vagy `null`-t, ha nincs Supabase konfigurálva → a mock-mód megmarad). A `repository.ts` minden valódi DB-olvasása/írása erre váltott (`await getServerSupabaseClient()`), így a műveletek az **`authenticated`** szerepben futnak. Kivétel a két `getPublicUrl` segédfüggvény, ami csak publikus URL-t épít (nem igényel jogosultságot) — az marad az anon kliensen.

**2. Adatbázis — az anon már nem írhat.**
Migráció: `supabase/migrations/20260724110000_revoke_anon_write_access.sql`
- `revoke insert, update, delete on all tables in schema public from anon;`
- `alter default privileges ... revoke insert, update, delete on tables from anon;` (jövőbeli táblákra is)
- a storage fájl-feltöltő/-törlő policy-k `to authenticated`-re szűkítve (az olvasás publikus marad).

Az `authenticated` szerep minden jogát megtartja, tehát a bejelentkezett app változatlanul működik.

### Érintett fájlok

- `src/lib/supabase/server.ts` — új `getServerSupabaseClient()`
- `src/lib/repository.ts` — DB-hozzáférés az authenticated kliensre
- `supabase/migrations/20260724110000_revoke_anon_write_access.sql` — új migráció

### Hogyan élesítsd (FONTOS — a migrációt még alkalmazni kell!)

A kódváltozás önmagában nem elég: a migrációt le kell futtatni az éles Supabase adatbázison. A kód (authenticated írás) és a migráció (anon jog elvétele) **együtt** ad helyes eredményt — érdemes közel egyszerre élesíteni.

Két mód:

**A) Supabase CLI (ajánlott, ha linkelve van a projekt):**
```bash
cd C:\kvitely-app
supabase db push
```

**B) Supabase Dashboard → SQL Editor:**
Másold be és futtasd a `20260724110000_revoke_anon_write_access.sql` tartalmát.

Deploy-sorrend javaslat: előbb a kód menjen ki (Vercel), majd a migráció — így nincs olyan pillanat, amikor az app már nem tud írni (mert az anon jog már nincs), de a kód még anon-ként próbálna.

### Ellenőrzés

- Bejelentkezve: hiba rögzítése / státuszváltás / fotófeltöltés továbbra is működik.
- Kijelentkezve, a publishable kulccsal közvetlen REST-hívás (pl. `curl POST /rest/v1/issues`) most **elutasított** (permission denied), korábban átment.

### Következő lépések (nyitva)

- **Olvasás (SELECT) szűkítése authenticated-re** — az app már authenticated-ként olvas, így az anon `select` is elvehető; szándékosan külön lépésben, hogy kisebb legyen a regressziós felület.
- `canMoveIssue` hardcode-olt `"project_manager"` szerep — a jogosultsági kör része.
- Vékony teszt-háló a `repository.ts` köré, mielőtt a TIG write flow jön.
