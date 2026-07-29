import { expect, test, type Page } from "@playwright/test";
import { browserContextFor } from "../fixtures/auth";
import { marked, pngUpload } from "../fixtures/media";

/**
 * R1-R4: a hiba-eletciklus adminkent.
 *
 * Miert adminnal: neki mindenhez van joga es a hatokor sem szukiti, ezert ha
 * itt bukik valami, az NEM jogosultsagi hiba, hanem altalanos torres. Ez a
 * lista tehat azt meri, hogy a hatokor-szures bevezetese nem tort-e el
 * mukodo funkciot.
 *
 * A tesztek adatot hoznak letre, ezert sorosan futnak (lasd playwright.config.ts
 * "regression" project), es minden letrehozott rekord a RUN_ID jelolest kapja.
 */

test.describe.configure({ mode: "serial" });

let page: Page;
let projectId = "";
let issueUrl = "";

const ISSUE_TITLE = marked("R1 teszt hiba");

test.beforeAll(async ({ browser }) => {
  const context = await browserContextFor(browser, "admin");
  page = await context.newPage();

  // Az elso projekt azonositoja az URL-bol - nem drotozzuk be a PRJ-001-et,
  // mert a public_id kornyezetenkent mas lehet.
  await page.goto("/projects");
  const href = await page.locator("a.entity-row").first().getAttribute("href");
  projectId = (href || "").split("/").filter(Boolean).pop() || "";
  expect(projectId, "Nem talalhato egyetlen projekt sem").toBeTruthy();
});

test.afterAll(async () => {
  // Takaritas: a letrehozott hibat toroljuk, hogy ujrafuttathato legyen a
  // csomag, es ne gyuljon a szemet az adatbazisban.
  if (issueUrl) {
    await page.goto(issueUrl);
    const deleteButton = page.getByRole("button", { name: "Törlés" }).first();

    if (await deleteButton.isVisible().catch(() => false)) {
      await deleteButton.click();
      await page.getByRole("button", { name: /Törlés$/ }).last().click();
      await page.waitForURL(/\/issues$/).catch(() => undefined);
    }
  }

  await page.context().close();
});

test("R1 - uj hiba letrehozasa", async () => {
  await page.goto(`/projects/${projectId}/issues/new`);

  await page.fill('input[name="title"]', ISSUE_TITLE);
  await page.fill('input[name="location"]', "E2E helyszin");
  await page.selectOption('select[name="trade"]', { index: 1 });
  await page.selectOption('select[name="priority"]', "normal");
  await page.selectOption('select[name="subcontractor"]', { index: 1 });
  await page.fill('input[name="dueDate"]', "2026-12-31");

  await page.getByRole("button", { name: "Hiba rögzítése" }).click();

  // A form siker eseten megjeleniti a rogzitett azonositot es egy "Megnyitás"
  // linket - erre varunk, nem fix idore.
  const openLink = page.getByRole("link", { name: "Megnyitás" });
  await expect(openLink, "A hiba letrehozasa nem jelzett sikert").toBeVisible({ timeout: 20_000 });

  issueUrl = (await openLink.getAttribute("href")) || "";
  expect(issueUrl).toBeTruthy();
});

test("R1 - az uj hiba megjelenik a listan", async () => {
  await page.goto(`/projects/${projectId}/issues`);
  await expect(page.locator("a.entity-row", { hasText: ISSUE_TITLE })).toHaveCount(1);
});

test("R4 - fenykep feltoltese es galeria", async () => {
  await page.goto(issueUrl);

  const fileInput = page.locator('input[type="file"][accept="image/*"]').first();
  await expect(fileInput, "Nincs fenykep-feltolto a hiba reszletein").toBeAttached();
  await fileInput.setInputFiles(pngUpload(`${ISSUE_TITLE}.png`));

  // A feltoltes utan a galeriaban meg kell jelennie egy kepnek.
  await expect(page.locator(".photo-card, .photo-grid img").first()).toBeVisible({ timeout: 30_000 });
});

/** A legordulo ELSO eleme mindig a jelenlegi allapot ("... (jelenlegi)"). */
async function currentStatus() {
  return (await page.locator('select[name="status"] option').first().getAttribute("value")) || "";
}

/** Mentes, majd a ket lathato kovetkezmeny ellenorzese: az urlap bezarul, es
    megjelenik a visszajelzes az olvaso nezetben. */
async function saveEdit() {
  await page.getByRole("button", { name: "Mentés" }).click();
  await expect(page.locator('select[name="status"]'), "A mentes nem ment at").toBeHidden({ timeout: 15_000 });
  await expect(page.getByText("Hiba frissítve."), "Nincs visszajelzes a sikeres mentesrol").toBeVisible();
}

test("R2 - allapot lepteteset elore", async () => {
  // Egeszen az "Ellenőrzésre vár" allapotig lepkedunk, mert a workflow szerint
  // visszaleptetni CSAK harom allapotbol lehet (ready_for_review, accepted,
  // tig_ready) - a kovetkezo teszt onnan tud dolgozni.
  for (let step = 0; step < 4; step++) {
    await page.goto(issueUrl);
    await page.getByRole("button", { name: "Szerkesztés" }).click();

    if ((await currentStatus()) === "ready_for_review") break;

    const options = page.locator('select[name="status"] option');
    expect(await options.count(), "Nincs megengedett kovetkezo allapot").toBeGreaterThan(1);

    // Az elso nem-jelenlegi elem a workflow szerinti kovetkezo elorelepes.
    const next = await options.nth(1).getAttribute("value");
    await page.locator('select[name="status"]').selectOption(next!);
    await saveEdit();
  }

  await page.goto(issueUrl);
  await page.getByRole("button", { name: "Szerkesztés" }).click();
  expect(await currentStatus(), "Nem sikerult eljutni az ellenorzesre varo allapotig").toBe("ready_for_review");
});

test("R3 - visszaleptetes csak indokkal megy at", async () => {
  await page.goto(issueUrl);
  await page.getByRole("button", { name: "Szerkesztés" }).click();

  // Az egyetlen visszalepes innen: "Ellenőrzésre vár" -> "Folyamatban".
  await page.locator('select[name="status"]').selectOption("in_progress");

  const noteField = page.locator('[name="statusNote"]');
  await expect(noteField, "Visszaleptetesnel nem jelent meg az indok mezo").toBeVisible();

  // Indok nelkul el kell buknia...
  await page.getByRole("button", { name: "Mentés" }).click();
  await expect(page.getByText(/indokot kell írni/i)).toBeVisible();

  // ...indokkal viszont at kell mennie.
  await noteField.fill(marked("E2E visszaleptetes indoka"));
  await saveEdit();
});
