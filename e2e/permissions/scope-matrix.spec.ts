import { expect, test } from "@playwright/test";
import { ROLE_KEYS, type RoleKey } from "../accounts";
import { browserContextFor } from "../fixtures/auth";
import { TEST_ISSUE_1, TEST_ISSUE_2, TEST_ISSUE_3, TEST_PROJECT_2, VISIBILITY_MATRIX } from "../test-data";

/**
 * A jogosultsagi igazsagtablazat visszamerese.
 *
 * Ez a fajl a supabase/test-data-permissions.sql vegen levo tablazatot kepezi
 * le egy az egyben. A teszt-adat ket ellentetes esetre van kitalalva:
 *
 *   - Teszt 1: a SAJAT cege hibaja egy olyan projektben, aminek NEM tagja
 *     -> a projekt-szukitesnek kell megfognia
 *   - Teszt 2: IDEGEN ceg hibaja egy olyan projektben, aminek TAGJA
 *     -> a ceg-szukitesnek kell megfognia
 *
 * A ketto egyutt bizonyitja, hogy a szures ketdimenzios, nem csak az egyik
 * tengelyen mukodik.
 */

const ISSUES = [TEST_ISSUE_1, TEST_ISSUE_2, TEST_ISSUE_3];

// A tablazat kulcsai futasidoben allnak ossze a cim-konstansokbol, ezert a
// TypeScript-nek itt egy lazabb alakot adunk.
const matrix = VISIBILITY_MATRIX as unknown as Record<RoleKey, Record<string, boolean>>;

// Az admin mindent lat, ezert TOLE kerjuk el a kozvetlen URL-eket: egy
// korlatozott fiok definicio szerint nem tudja megadni annak a hibanak a
// cimet, amit nem lathat.
const issueHrefs = new Map<string, string>();
let project2Href = "";

test.beforeAll(async ({ browser }) => {
  const context = await browserContextFor(browser, "admin");
  const page = await context.newPage();

  try {
    await page.goto("/issues");

    for (const title of ISSUES) {
      const row = page.locator("a.entity-row", { hasText: title }).first();
      await expect(
        row,
        `Az admin sem latja ezt a hibat: "${title}". Lefuttattad a supabase/test-data-permissions.sql fajlt?`
      ).toBeVisible();
      issueHrefs.set(title, (await row.getAttribute("href")) || "");
    }

    await page.goto("/projects");
    const projectRow = page.locator("a.entity-row", { hasText: TEST_PROJECT_2 }).first();
    await expect(projectRow, `Az admin sem latja a(z) "${TEST_PROJECT_2}" projektet.`).toBeVisible();
    project2Href = (await projectRow.getAttribute("href")) || "";
  } finally {
    await context.close();
  }
});

for (const role of ROLE_KEYS) {
  test.describe(role, () => {
    test("a hibalista pontosan a lathato hibakat tartalmazza", async ({ browser }) => {
      const context = await browserContextFor(browser, role);
      const page = await context.newPage();

      try {
        await page.goto("/issues");

        for (const title of ISSUES) {
          const row = page.locator("a.entity-row", { hasText: title });

          if (matrix[role][title]) {
            await expect(row, `${role} NEM latja, pedig latnia kellene: ${title}`).toHaveCount(1);
          } else {
            await expect(row, `${role} LATJA, pedig nem szabadna: ${title}`).toHaveCount(0);
          }
        }
      } finally {
        await context.close();
      }
    });

    test("a hatokoron kivuli hiba kozvetlen URL-je 404", async ({ browser }) => {
      const hidden = ISSUES.filter((title) => !matrix[role][title]);
      test.skip(hidden.length === 0, "Ez a szerep minden teszt-hibat lat, nincs mit ellenorizni.");

      const context = await browserContextFor(browser, role);
      const page = await context.newPage();

      try {
        for (const title of hidden) {
          const href = issueHrefs.get(title)!;
          const response = await page.goto(href);

          // Szandekosan 404 es nem 403: a 403 elarulna, hogy a hiba letezik,
          // csak nincs hozza jogod. A 404 nem arul el semmit.
          expect(response?.status(), `${role} nem 404-et kapott erre: ${title} (${href})`).toBe(404);
        }
      } finally {
        await context.close();
      }
    });

    test("a nem tagsagi projekt kozvetlen URL-je 404", async ({ browser }) => {
      test.skip(matrix[role].project2, "Ez a szerep latja a 2. projektet.");

      const context = await browserContextFor(browser, role);
      const page = await context.newPage();

      try {
        const response = await page.goto(project2Href);
        expect(response?.status(), `${role} el tudja erni a(z) "${TEST_PROJECT_2}" projektet`).toBe(404);
      } finally {
        await context.close();
      }
    });
  });
}
