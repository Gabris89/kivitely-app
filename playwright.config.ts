import { defineConfig, devices } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

// A jelszavak a .env.test.local-bol jonnek. Nem hasznalunk dotenv csomagot:
// a Node 22 process.loadEnvFile() beepitve tudja ezt.
//
// A .env.local-t is betoltjuk (ha van), de CSAK azert, hogy a DB-szintu
// RLS-teszt (rls-direct.spec.ts) elerje a mar ott konfiguralt Supabase URL-t es
// publishable kulcsot - igy azt nem kell kulon a .env.test.local-ba masolni. A
// .env.test.local UTANA toltodik, tehat az E2E_* ertekek felulirjak.
// (A .env.local tartalmat sem a config, sem a teszt nem irja ki sehova.)
const envFile = path.join(__dirname, ".env.test.local");
if (fs.existsSync(envFile)) {
  process.loadEnvFile(envFile);
}

const baseURL = process.env.E2E_BASE_URL || "http://localhost:3000";

export default defineConfig({
  testDir: "./e2e",
  // A regresszios tesztek adatot hoznak letre es tolnek fel fajlt, ami lassu.
  timeout: 60_000,
  expect: { timeout: 10_000 },
  // CI-ban ne lehessen veletlenul benne felejtett .only miatt zold a futas.
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "list" : [["list"], ["html", { open: "never" }]],
  globalSetup: "./e2e/global-setup.ts",

  use: {
    baseURL,
    // Hibas teszt utan visszajatszhato nyom - a Playwright UI-ban megnezheto.
    trace: "on-first-retry",
    screenshot: "only-on-failure"
  },

  projects: [
    {
      // Csak olvaso tesztek: nem modositanak adatot, ezert parhuzamosithatok.
      name: "permissions",
      testDir: "./e2e/permissions",
      fullyParallel: true,
      use: { ...devices["Desktop Chrome"] }
    },
    {
      // Mutalo tesztek: adatot hoznak letre es torolnek. Sorosan futnak, hogy
      // ne akadjanak egymasba (pl. ket teszt ugyanazt a hibat lepteti).
      name: "regression",
      testDir: "./e2e/regression",
      fullyParallel: false,
      workers: 1,
      use: { ...devices["Desktop Chrome"] }
    },
    {
      // DB-szintu RLS-tesztek. KULON projekt es KULON futas (npm run
      // test:e2e:rls), mert ezek signInWithPassword-del jelentkeznek be a hat
      // fiokra - ez elrontja azokat a munkameneteket (storageState), amikre az
      // app-alapu tesztek epulnek. Egyutt futtatva a ket csomag osszeakadna,
      // ezert a default `test:e2e` szandekosan NEM tartalmazza ezt a projektet.
      name: "rls-db",
      testDir: "./e2e/rls",
      fullyParallel: false,
      workers: 1,
      use: { ...devices["Desktop Chrome"] }
    }
  ],

  // A fejlesztoi szervert a Playwright inditja, ha meg nem fut. Ha mar fut
  // (pl. te inditottad kezzel), azt hasznalja - nem inditunk masodikat.
  webServer: {
    command: "npm run dev",
    url: baseURL,
    reuseExistingServer: true,
    timeout: 120_000
  }
});
