import { expect, test } from "@playwright/test";
import { apiContextFor, browserContextFor } from "../fixtures/auth";
import { TEST_COMPANY_1, TEST_COMPANY_2 } from "../test-data";

/**
 * A 4244548 commitban javitott resek orzese.
 *
 * Ezek a lyukak statikus atvizsgalassal kerultek elo, nem kezi teszteléssel -
 * pontosan azert, mert a kezi teszt-terv sem fedte oket (a TIG exportot peldaul
 * csak adminkent probaltuk, akinek amugy is joga van hozza). Ez a fajl azt
 * biztositja, hogy egy kesobbi atiras ne nyithassa vissza oket eszrevetlenul.
 *
 * Itt csak az ADAT-FUGGETLEN allitasok vannak. A hatokor-fuggo reszek (idegen
 * projekt dokumentumanak meresei, idegen projekt akadalya) a regresszios
 * csomagban vannak, mert ott jonnek letre a szukseges fixture-ok.
 */

test.describe("TIG export jogosultsagi kapu", () => {
  // Nem letezo csomag-azonositoval dolgozunk, es ez SZANDEKOS:
  //
  //   javitas ELOTT: a vegpont eloszor lekerte a csomagot -> nincs ilyen -> 404
  //   javitas UTAN:  eloszor a jogosultsagot nezi        -> nincs jog  -> 403
  //
  // Igy a teszt teszt-adat nelkul is kulonbseget tud tenni a ket allapot
  // kozott, es pont a legsulyosabb rest (penzugyi adat barkinek) orzi.
  const MISSING_PACKAGE = "TIG-NEMLETEZIK";

  for (const role of ["muvezeto", "teszt1", "teszt2", "megrendelo"] as const) {
    test(`${role} nem toltheti le a TIG exportot`, async ({ playwright, baseURL }) => {
      const api = await apiContextFor(playwright, role, baseURL!);

      try {
        for (const format of ["xlsx", "pdf"]) {
          const response = await api.get(`/api/tig/${MISSING_PACKAGE}/export/${format}`);
          expect(
            response.status(),
            `${role} nem 403-at kapott a ${format} exportra - a jogosultsagi kapu hianyzik vagy megkerulheto`
          ).toBe(403);
        }
      } finally {
        await api.dispose();
      }
    });
  }

  for (const role of ["admin", "pm"] as const) {
    test(`${role} atmegy a jogosultsagi kapun`, async ({ playwright, baseURL }) => {
      const api = await apiContextFor(playwright, role, baseURL!);

      try {
        // Kontrollteszt: a kapu ne legyen TUL szigoru. A 404 itt a helyes
        // valasz (a csomag tenyleg nem letezik) - a lenyeg, hogy nem 403.
        const response = await api.get(`/api/tig/${MISSING_PACKAGE}/export/xlsx`);
        expect(response.status(), `${role} nem jut el a csomag-keresesig`).toBe(404);
      } finally {
        await api.dispose();
      }
    });
  }
});

test.describe("Alvallalkozo-lista szivargas", () => {
  // A cegnevek listaja onmagaban uzleti informacio (ki dolgozik a
  // megrendelonek), ezert az alvallalkozo csak a SAJAT ceget lathatja.
  test("teszt1 csak a sajat ceget latja", async ({ browser }) => {
    const context = await browserContextFor(browser, "teszt1");
    const page = await context.newPage();

    try {
      await page.goto("/subcontractors");

      await expect(page.locator("a.entity-row", { hasText: TEST_COMPANY_1 })).toHaveCount(1);
      await expect(
        page.locator("a.entity-row", { hasText: TEST_COMPANY_2 }),
        "teszt1 latja a masik ceget is - ceg-szures nelkul jon a lista"
      ).toHaveCount(0);
    } finally {
      await context.close();
    }
  });

  test("admin minden ceget lat", async ({ browser }) => {
    const context = await browserContextFor(browser, "admin");
    const page = await context.newPage();

    try {
      await page.goto("/subcontractors");

      // Kontrollteszt: ha ez is ures lenne, a fenti teszt hamis biztonsagot adna.
      await expect(page.locator("a.entity-row", { hasText: TEST_COMPANY_1 })).toHaveCount(1);
      await expect(page.locator("a.entity-row", { hasText: TEST_COMPANY_2 })).toHaveCount(1);
    } finally {
      await context.close();
    }
  });
});
