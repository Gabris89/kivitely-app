import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { expect, test } from "@playwright/test";

// A DB-szintu teszthez kell a Supabase URL + publishable kulcs. Ezt a mar
// meglevo .env.local-bol vesszuk, hogy ne kelljen ketszer beirni.
//
// FONTOS: a betoltes ITT tortenik (a spec worker-processeben), NEM a
// playwright.config-ban. Ha a configban toltenenk be, a Playwright altal
// INDITOTT dev szerver gyerekfolyamat is oroklne a modositott env-et, ami
// elrontja a tobbi teszt cookie-alapu auth-jat (401-et ad). A worker sajat
// env-je a kulon processzben futo dev szervert nem erinti.
for (const name of [".env.local", ".env.test.local"]) {
  const file = path.resolve(process.cwd(), name);
  if (fs.existsSync(file)) {
    try {
      process.loadEnvFile(file);
    } catch {
      /* nem kotelezo - ha nincs vagy hibas, a teszt kihagyja magat */
    }
  }
}
import { ACCOUNTS, ROLE_KEYS, type RoleKey } from "../accounts";
import { TEST_COMPANY_1, TEST_COMPANY_2, TEST_ISSUE_1, TEST_ISSUE_2, TEST_ISSUE_3, VISIBILITY_MATRIX } from "../test-data";

/**
 * DB-SZINTU bizonyitas: maga az adatbazis utasitja-e el a hatokoron kivuli sort?
 *
 * A tobbi permissions-teszt az APPON keresztul mer (UI + API route). Ez a spec
 * az appot MEGKERULI: minden szerep valodi JWT-vel, kozvetlenul a Supabase REST
 * API-t hivja - pontosan ugy, ahogy egy tamado tenne, aki megszerezte a
 * publishable kulcsot. Ha az RLS jol mukodik, a DB akkor is csak a hatokorbe
 * eso sorokat adja vissza.
 *
 * FONTOS: RLS ELOTT ez a teszt PIROS (a permissziv using(true) policy mindenkinek
 * mindent visszaad). Ahogy a tabla-migraciok sorban bekerulnek, ugy valik zoldde.
 * Ez a szandekolt TDD-jelzes.
 *
 * Alapbol KIHAGYJA magat, ha nincs meg a ket env-kulcs (E2E_SUPABASE_URL,
 * E2E_SUPABASE_PUBLISHABLE_KEY) - igy az `npm run test:e2e` addig is zold marad,
 * amig nem allitod be oket a .env.test.local-ban.
 */

// Elsodleges: a .env.test.local-ban megadott E2E_* ertekek. Ha nincsenek, a
// .env.local-ban mar meglevo (az app altal is hasznalt) Supabase URL/kulcs a
// fallback - igy nem kell ugyanazt ketszer beirni. SOHA nem a secret kulcs: a
// publishable/anon kulcs kell, kulonben a lekerdezes megkerulne az RLS-t.
const SUPABASE_URL =
  process.env.E2E_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY =
  process.env.E2E_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.SUPABASE_PUBLISHABLE_KEY;
const CONFIGURED = Boolean(SUPABASE_URL && SUPABASE_KEY);

/** Bejelentkezett supabase-js kliens az adott szerephez (sajat JWT-vel). */
async function directClient(role: RoleKey) {
  const account = ACCOUNTS[role];
  const password = process.env[account.passwordEnv];
  if (!password) throw new Error(`Hianyzik a jelszo: ${account.passwordEnv}`);

  const client = createClient(SUPABASE_URL!, SUPABASE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
  const { error } = await client.auth.signInWithPassword({ email: account.email, password });
  if (error) throw new Error(`Direkt bejelentkezes sikertelen (${account.email}): ${error.message}`);
  return client;
}

const matrix = VISIBILITY_MATRIX as unknown as Record<RoleKey, Record<string, boolean>>;
const TEST_ISSUES = [TEST_ISSUE_1, TEST_ISSUE_2, TEST_ISSUE_3];

test.describe("RLS: az adatbazis szinten szur (direkt REST)", () => {
  test.skip(!CONFIGURED,
    "Allitsd be az E2E_SUPABASE_URL es E2E_SUPABASE_PUBLISHABLE_KEY erteket a .env.test.local-ban.");

  for (const role of ROLE_KEYS) {
    test(`${role}: az issues tabla csak a hatokort adja vissza`, async () => {
      const client = await directClient(role);

      // Kozvetlen lekerdezes - se app, se API route, csak a DB.
      const { data, error } = await client.from("issues").select("title");
      expect(error, `A lekerdezes hibat dobott: ${error?.message}`).toBeNull();

      const titles = new Set((data || []).map((r) => r.title));

      for (const title of TEST_ISSUES) {
        if (matrix[role][title]) {
          expect(titles.has(title), `${role} NEM latja a DB-bol, pedig kellene: ${title}`).toBe(true);
        } else {
          // Ez a lenyeg: a DB MAGA nem adhatja vissza a hatokoron kivuli sort.
          expect(titles.has(title), `${role} MEGKAPTA a DB-bol, pedig nem szabadna: ${title}`).toBe(false);
        }
      }

      await client.auth.signOut();
    });
  }

  test("alvallalkozo a subcontractors tablabol csak a sajat ceget kapja", async () => {
    const client = await directClient("teszt1");
    const { data, error } = await client.from("subcontractors").select("name");
    expect(error).toBeNull();

    const names = new Set((data || []).map((r) => r.name));
    expect(names.has(TEST_COMPANY_1), "teszt1 nem latja a sajat ceget").toBe(true);
    expect(names.has(TEST_COMPANY_2), "teszt1 megkapta a masik ceget a DB-bol").toBe(false);

    await client.auth.signOut();
  });

  test("bejelentkezes nelkul (anon) az issues tabla ures", async () => {
    // Az anon szerepnek nincs auth.uid()-ja, igy a scope-fuggvenyek ures/hamis
    // erteket adnak - a DB egyetlen sort sem adhat vissza.
    const anon = createClient(SUPABASE_URL!, SUPABASE_KEY!, {
      auth: { autoRefreshToken: false, persistSession: false }
    });
    const { data } = await anon.from("issues").select("title");
    expect((data || []).length, "Anon szerep sorokat kapott az issues tablabol").toBe(0);
  });
});
