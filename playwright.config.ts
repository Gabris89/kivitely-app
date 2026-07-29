import { defineConfig, devices } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

// A jelszavak a .env.test.local-bol jonnek. Nem hasznalunk dotenv csomagot:
// a Node 22 process.loadEnvFile() beepitve tudja ezt. A fajl hianya itt meg
// nem hiba - a globalSetup ad rola ertheto uzenetet, egy helyen.
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
