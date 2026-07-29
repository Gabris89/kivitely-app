import { chromium, type FullConfig } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { ACCOUNTS, ROLE_KEYS, storageStatePath, type RoleKey } from "./accounts";

/**
 * Elokeszites a teszt-futas elott.
 *
 * Ket dolgot csinal:
 *   1. Ellenorzi az eloifelteteleket (hova mutatunk, van-e jelszo, jo-e a
 *      szerep az adatbazisban) - es ERTHETO magyar uzenettel all le, ha nem.
 *      Enelkul egy hianyzo SQL-futtatas 30 rejtelyes teszt-hibakent jelenne meg.
 *   2. Bejelentkezik mind a hat fiokkal a VALODI login urlapon, es elmenti a
 *      munkamenetet. A tesztek ezt toltik be, igy egy futasban csak 6 belepes van.
 */

function fail(message: string): never {
  // A Playwright a globalSetup hibajat kiirja es megszakitja a futast.
  throw new Error(`\n\n=== E2E elokeszites sikertelen ===\n${message}\n`);
}

function assertLocalhost(baseURL: string) {
  let host: string;
  try {
    host = new URL(baseURL).hostname;
  } catch {
    fail(`Ervenytelen E2E_BASE_URL: ${baseURL}`);
  }

  if (host !== "localhost" && host !== "127.0.0.1") {
    fail(
      `A tesztek adatot hoznak letre es torolnek, ezert CSAK helyi fejlesztoi\n` +
        `szerver ellen futhatnak. A cel most: ${baseURL}\n\n` +
        `Ha tudatosan mas cimet akarsz, ird at ezt az ellenorzest a\n` +
        `e2e/global-setup.ts fajlban - de eles adatbazison SOHA ne futtasd.`
    );
  }
}

function readPassword(role: RoleKey): string {
  const account = ACCOUNTS[role];
  const password = process.env[account.passwordEnv];

  if (!password) {
    fail(
      `Hianyzik a jelszo: ${account.passwordEnv} (${account.email})\n\n` +
        `Masold le a .env.test.local.example fajlt .env.test.local nevre, es\n` +
        `toltsd ki a hat teszt-fiok jelszavaval. Ez a fajl a .gitignore\n` +
        `".env*.local" sora miatt nem kerul be a verziokovetesbe.`
    );
  }

  return password;
}

export default async function globalSetup(config: FullConfig) {
  const baseURL = config.projects[0]?.use?.baseURL || "http://localhost:3000";
  assertLocalhost(baseURL);

  // A jelszavakat mind beolvassuk elore: jobb egyszerre latni, mi hianyzik,
  // mint hat kulon futasban egyesevel.
  const passwords = Object.fromEntries(ROLE_KEYS.map((role) => [role, readPassword(role)])) as Record<RoleKey, string>;

  fs.mkdirSync(path.join(__dirname, ".auth"), { recursive: true });

  const browser = await chromium.launch();

  try {
    for (const role of ROLE_KEYS) {
      const account = ACCOUNTS[role];
      const context = await browser.newContext({ baseURL });
      const page = await context.newPage();

      await page.goto("/login");
      await page.fill('input[name="email"]', account.email);
      await page.fill('input[name="password"]', passwords[role]);
      await page.click('button[type="submit"]');

      // Sikeres belepes utan az app elnavigal a /login-rol. Ha ott maradunk,
      // a bejelentkezes nem sikerult.
      const loggedIn = await page
        .waitForURL((url) => !url.pathname.startsWith("/login"), { timeout: 20_000 })
        .then(() => true)
        .catch(() => false);

      if (!loggedIn) {
        // Az app sajat hibauzenete sokkal tobbet mond, mint egy talalgato
        // lista - a bejelentkezo oldal kiirja (pl. "Hibás e-mail cím vagy
        // jelszó." vagy "Supabase Auth nincs konfigurálva.").
        const appError = await page
          .locator(".error-message")
          .first()
          .textContent({ timeout: 2_000 })
          .catch(() => null);

        fail(
          `Nem sikerult belepni: ${account.email}\n` +
            `Az alkalmazas uzenete: ${appError?.trim() || "(nem jelzett hibat)"}\n` +
            `A bongeszo itt allt meg: ${page.url()}\n\n` +
            `Ha "Hibás e-mail cím vagy jelszó": ellenorizd a ${account.passwordEnv} erteket a\n` +
            `.env.test.local-ban, es hogy letezik-e a fiok a Supabase Dashboardon\n` +
            `("Auto Confirm User" bekapcsolva).`
        );
      }

      // A belepes onmagaban keves: a szerepet a test-data-permissions.sql
      // allitja be. Ha az nem futott le, minden fiok "viewer" marad, es a
      // tesztek ertelmetlenul buknanak. Ezert itt ellenorizzuk.
      const response = await page.request.get("/api/whoami");
      const whoami = (await response.json()) as {
        authConfigured?: boolean;
        workflowRole?: string;
        isActive?: boolean;
        subcontractorId?: string | null;
      };

      if (!whoami.authConfigured) {
        fail(
          `A Supabase Auth nincs konfiguralva a futo alkalmazasban.\n` +
            `Ellenorizd, hogy az .env.local ki van-e toltve, es ujraindult-e a dev szerver.`
        );
      }

      if (whoami.workflowRole !== account.workflowRole) {
        fail(
          `${account.email} szerepe "${whoami.workflowRole}", de "${account.workflowRole}"-t vartunk.\n\n` +
            `Szinte biztosan a teszt-adat hianyzik. Futtasd le a Supabase SQL\n` +
            `editorban a supabase/test-data-permissions.sql fajlt - de CSAK azutan,\n` +
            `hogy mind a hat Auth-fiok letrejott a Dashboardon.`
        );
      }

      if (whoami.isActive === false) {
        fail(`${account.email} profilja le van tiltva (is_active = false). Allitsd vissza true-ra.`);
      }

      // Az alvallalkozoknak ceghez kell kotve lenniuk, kulonben a visibility.ts
      // fail-closed agara futnak, es semmit nem latnak.
      if (account.workflowRole === "subcontractor" && !whoami.subcontractorId) {
        fail(
          `${account.email} alvallalkozo, de nincs ceghez kotve (profiles.subcontractor_id ures).\n` +
            `Ilyenkor a fiok semmit nem lat. A test-data-permissions.sql 4) szakasza allitja be.`
        );
      }

      await context.storageState({ path: storageStatePath(role) });
      await context.close();
    }
  } finally {
    await browser.close();
  }
}
