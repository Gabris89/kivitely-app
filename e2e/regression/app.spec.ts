import { expect, test } from "@playwright/test";
import { browserContextFor } from "../fixtures/auth";
import { marked } from "../fixtures/media";
import { TEST_PROJECT_2 } from "../test-data";

/**
 * R10-R13: a maradek regresszios pontok.
 *
 * R9 (teljesitmenynaplo bejegyzes rogzitese) SZANDEKOSAN kimarad: a
 * /projects/[id]/work-logs oldal ma csak olvasashato, nincs rajta rogzito
 * urlap. Amint lesz, ide kerul a teszt.
 */

test.describe.configure({ mode: "serial" });

test("R10 - alvallalkozo torzsadat szerkesztese", async ({ browser }) => {
  const context = await browserContextFor(browser, "admin");
  const page = await context.newPage();

  try {
    await page.goto("/subcontractors");
    await page.locator("a.entity-row").first().click();

    // A szakma mezot irjuk at: nem kotelezo, es nem befolyasol mas tesztet.
    const tradeInput = page.locator('input[name="trade"]');
    await expect(tradeInput).toBeVisible();

    const original = (await tradeInput.inputValue()) || "";
    await tradeInput.fill(marked("szakma"));
    await page.getByRole("button", { name: "Mentés" }).click();

    // Mentes utan a lista oldalra navigal vissza.
    await page.waitForURL(/\/subcontractors$/, { timeout: 15_000 });

    // Visszaallitas, hogy a teszt ne hagyjon nyomot.
    await page.locator("a.entity-row").first().click();
    await page.locator('input[name="trade"]').fill(original);
    await page.getByRole("button", { name: "Mentés" }).click();
    await page.waitForURL(/\/subcontractors$/, { timeout: 15_000 });
  } finally {
    await context.close();
  }
});

test("R11 - projektvaltas a fejlec legordulojevel", async ({ browser }) => {
  const context = await browserContextFor(browser, "admin");
  const page = await context.newPage();

  try {
    await page.goto("/projects");
    const firstHref = (await page.locator("a.entity-row").first().getAttribute("href")) || "";
    await page.goto(firstHref);

    // A valto egy gomb, ami egy listat nyit; abban a projektek gombkent vannak.
    await page.locator(".project-switcher button").first().click();
    const option = page.locator(".project-switcher-option", { hasText: TEST_PROJECT_2 }).first();
    await expect(option, "A projektvalto nem kinalja fel a 2. projektet").toBeVisible();
    await option.click();

    // Atvaltott-e tenylegesen masik projektre.
    await expect(page).not.toHaveURL(firstHref, { timeout: 15_000 });
    await expect(page.locator("h1")).toContainText(TEST_PROJECT_2, { timeout: 15_000 });
  } finally {
    await context.close();
  }
});

test("R12 - a kezdolap kartyai adatot mutatnak", async ({ browser }) => {
  const context = await browserContextFor(browser, "admin");
  const page = await context.newPage();

  try {
    await page.goto("/");

    const cards = page.locator(".stat-card");
    await expect(cards.first()).toBeVisible();

    const values = await cards.locator("strong").allTextContents();
    expect(values.length, "Nincs egyetlen statisztika-kartya sem").toBeGreaterThan(0);

    for (const value of values) {
      // A leggyakoribb torest keressuk: NaN, undefined vagy ures ertek.
      expect(value.trim(), `Ervenytelen ertek a kezdolapon: "${value}"`).toMatch(/^[\d\s.,%A-Za-zÀ-ű]+$/);
      expect(value).not.toContain("NaN");
      expect(value).not.toContain("undefined");
    }
  } finally {
    await context.close();
  }
});

test("R13 - bejelentkezes nelkul egyetlen oldal sem tolt be adatot", async ({ browser }) => {
  // Szandekosan NEM a kijelentkezes gombot nyomjuk meg: a Supabase signOut
  // globalisan ervenytelenitene a fiok osszes munkamenetet, tehat elrontana a
  // tobbi teszt elmentett bejelentkezeset. A biztonsagilag lenyeges felet -
  // hogy bejelentkezes nelkul nincs adat - anonim kontextussal merjuk.
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    for (const path of ["/", "/projects", "/issues", "/subcontractors"]) {
      await page.goto(path);
      await expect(page, `A(z) ${path} oldal bejelentkezes nelkul is betoltott`).toHaveURL(/\/login/, {
        timeout: 15_000
      });
    }
  } finally {
    await context.close();
  }
});
