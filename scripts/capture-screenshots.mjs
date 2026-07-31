// Kepernyokepek keszitese a demo-prezentaciohoz.
//
// A Playwright mar bejelentkezett munkameneteit hasznalja ujra (e2e/.auth),
// amiket a teszt-futas keszit. Igy ugyanazt az oldalt le lehet fotozni TOBB
// KULONBOZO szereppel - ez mutatja meg vizualisan a jogosultsagi rendszert,
// amit szoveggel nehez elmagyarazni.
//
// Hasznalat:
//   1. npm run test:e2e:permissions   (ez keszíti a munkameneteket)
//   2. npm run dev                    (masik ablakban, ha meg nem fut)
//   3. node scripts/capture-screenshots.mjs
//
// Eredmeny: docs/screenshots/*.png

import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const BASE_URL = process.env.E2E_BASE_URL || "http://localhost:3000";
const AUTH_DIR = path.join(process.cwd(), "e2e", ".auth");
const OUT_DIR = path.join(process.cwd(), "docs", "screenshots");

const DESKTOP = { width: 1440, height: 900 };
const MOBILE = { width: 390, height: 844 }; // iPhone 14 meret

function authFile(role) {
  const file = path.join(AUTH_DIR, `${role}.json`);
  if (!fs.existsSync(file)) {
    console.error(
      `\nNincs mentett munkamenet: ${role}\n` +
        `Futtasd eloszor: npm run test:e2e:permissions\n`
    );
    process.exit(1);
  }
  return file;
}

let shotIndex = 0;

async function shot(page, name) {
  shotIndex += 1;
  const file = path.join(OUT_DIR, `${String(shotIndex).padStart(2, "0")}-${name}.png`);
  await page.screenshot({ path: file });
  console.log(`  ${path.basename(file)}`);
}

/** Megvarja, hogy a lista/tartalom tenylegesen megjelenjen, ne ures kepet lojunk. */
async function settle(page) {
  await page.waitForLoadState("networkidle").catch(() => undefined);
  await page.waitForTimeout(400);
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const browser = await chromium.launch();

  try {
    // ── 1. Az alkalmazas attekintese (admin, asztali) ─────────────────────
    console.log("\nAttekinto kepek (admin):");
    const admin = await browser.newContext({
      storageState: authFile("admin"),
      viewport: DESKTOP,
      baseURL: BASE_URL
    });
    const page = await admin.newPage();

    await page.goto("/");
    await settle(page);
    await shot(page, "attekintes-dashboard");

    await page.goto("/projects");
    await settle(page);
    await shot(page, "projektek-listaja");

    // Egy projekt "belso" nezete: innen nyilnak a modulok.
    const projectHref = await page.locator("a.entity-row").first().getAttribute("href");
    await page.goto(projectHref);
    await settle(page);
    await shot(page, "projekt-modulok");

    await page.goto("/issues");
    await settle(page);
    await shot(page, "hibalista");

    // Hiba reszletei: itt latszik az allapot-utvonal (lepteteseK) es a fotos
    // bizonyitas - ez a termek magja.
    const issueHref = await page.locator("a.entity-row").first().getAttribute("href");
    await page.goto(issueHref);
    await settle(page);
    await shot(page, "hiba-reszletei-allapot-utvonal");

    // Szerkeszto nezet: a legorduloben CSAK a megengedett kovetkezo allapotok
    // vannak - a workflow szabalyai a felulten is ervenyesulnek.
    const editButton = page.getByRole("button", { name: "Szerkesztés" }).first();
    if (await editButton.count()) {
      await editButton.click();
      await page.waitForTimeout(500);
      await shot(page, "hiba-szerkesztes-allapotvaltas");
    }

    await page.goto("/workflow");
    await settle(page);
    await shot(page, "workflow-tabla");

    await page.goto("/blockers");
    await settle(page);
    await shot(page, "akadalylista");

    await page.goto(`${projectHref}/documents`);
    await settle(page);
    await shot(page, "dokumentumok-tervek");

    await page.goto(`${projectHref}/tig`);
    await settle(page);
    await shot(page, "tig-teljesitesigazolas");

    await admin.close();

    // ── 2. A jogosultsagi rendszer: UGYANAZ az oldal, negy szereppel ──────
    // Ez a prezentacio legerosebb kepsora: nem kell magyarazni, latszik.
    console.log("\nJogosultsagi osszehasonlitas (ugyanaz a /issues oldal):");
    for (const role of ["admin", "muvezeto", "teszt1", "teszt2"]) {
      const context = await browser.newContext({
        storageState: authFile(role),
        viewport: DESKTOP,
        baseURL: BASE_URL
      });
      const rolePage = await context.newPage();
      await rolePage.goto("/issues");
      await settle(rolePage);
      await shot(rolePage, `jogosultsag-${role}`);
      await context.close();
    }

    // ── 3. Mobil nezet (a termek elsodleges hasznalati modja) ─────────────
    console.log("\nMobil kepek:");
    const mobile = await browser.newContext({
      storageState: authFile("admin"),
      viewport: MOBILE,
      isMobile: true,
      hasTouch: true,
      baseURL: BASE_URL
    });
    const mobilePage = await mobile.newPage();

    await mobilePage.goto("/");
    await settle(mobilePage);
    await shot(mobilePage, "mobil-attekintes");

    await mobilePage.goto("/issues");
    await settle(mobilePage);
    await shot(mobilePage, "mobil-hibalista");

    // A "Tobb" fiok: a mobil navigacio, amit tobb korben csiszoltunk.
    const moreButton = mobilePage.getByRole("button", { name: "Több" });
    if (await moreButton.count()) {
      await moreButton.click();
      await mobilePage.waitForTimeout(500);
      await shot(mobilePage, "mobil-tobb-menu");
    }

    await mobile.close();
  } finally {
    await browser.close();
  }

  console.log(`\nKesz. A kepek helye: ${OUT_DIR}\n`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
