import { expect, test, type APIRequestContext } from "@playwright/test";
import { apiContextFor, browserContextFor } from "../fixtures/auth";

/**
 * R7-R8: TIG export letoltes, plusz a hatokor-fuggo resze az 1. resnek.
 *
 * Egy TIG csomag letrehozasa a UI-n hosszu lanc (egy hibat vegig kell vinni a
 * workflow-n tig_ready allapotig, bizonyitekokkal), amit ez a teszt
 * szandekosan NEM jatszik el: torekeny lenne, es nem ezt akarjuk merni. Ehelyett
 * egy MAR LETEZO csomagot keresunk. Ha nincs, a teszt kihagyja magat, es
 * megmondja, mit csinalj.
 *
 * A letoltott fajlt a "magic byte"-javal ellenorizzuk (xlsx = ZIP, azaz "PK";
 * pdf = "%PDF"). Ez becsuletesen annyit allit, hogy a fajl valos es nem ures -
 * hogy "megnyilik Excelben", az kezi ellenorzes marad.
 */

test.describe.configure({ mode: "serial" });

let adminApi: APIRequestContext;
let packageId = "";

test.beforeAll(async ({ browser, playwright, baseURL }) => {
  adminApi = await apiContextFor(playwright, "admin", baseURL!);

  const context = await browserContextFor(browser, "admin");
  const page = await context.newPage();

  try {
    await page.goto("/projects");
    const projectHrefs = await page.locator("a.entity-row").evaluateAll((nodes) =>
      nodes.map((node) => (node as HTMLAnchorElement).getAttribute("href") || "")
    );

    // Vegigjarjuk a projekteket, amig talalunk egy TIG csomagot.
    for (const href of projectHrefs) {
      const id = href.split("/").filter(Boolean).pop();
      if (!id) continue;

      await page.goto(`/projects/${id}/tig`);
      const exportLink = page.locator('a[href*="/export/xlsx"]').first();

      if (await exportLink.count()) {
        const exportHref = (await exportLink.getAttribute("href")) || "";
        packageId = decodeURIComponent(exportHref.split("/api/tig/")[1]?.split("/")[0] || "");
        break;
      }
    }
  } finally {
    await context.close();
  }
});

test.afterAll(async () => {
  await adminApi.dispose();
});

test("R7 - xlsx export letoltes", async () => {
  test.skip(
    !packageId,
    "Nincs egyetlen TIG csomag sem. Hozz letre egyet kezzel a TIG oldalon, utana ez a teszt automatikusan fut."
  );

  const response = await adminApi.get(`/api/tig/${encodeURIComponent(packageId)}/export/xlsx`);
  expect(response.status()).toBe(200);

  const body = await response.body();
  expect(body.length, "Az xlsx ures").toBeGreaterThan(100);
  // Az xlsx valojaban ZIP: minden ervenyes fajl "PK"-val kezdodik.
  expect(body.subarray(0, 2).toString("latin1"), "Nem ervenyes xlsx (ZIP) fajl").toBe("PK");
});

test("R8 - pdf export letoltes", async () => {
  test.skip(!packageId, "Nincs egyetlen TIG csomag sem.");

  const response = await adminApi.get(`/api/tig/${encodeURIComponent(packageId)}/export/pdf`);
  expect(response.status()).toBe(200);

  const body = await response.body();
  expect(body.length, "A pdf ures").toBeGreaterThan(100);
  expect(body.subarray(0, 4).toString("latin1"), "Nem ervenyes pdf fajl").toBe("%PDF");
});

test("1. res - valodi csomagot sem tolthet le, akinek nincs joga", async ({ playwright, baseURL }) => {
  test.skip(!packageId, "Nincs egyetlen TIG csomag sem.");

  // A permissions csomagban ez nem letezo azonositoval fut (adat-fuggetlenul).
  // Itt egy VALODI csomagon ismeteljuk meg: igy az is kiderul, ha a kapu csak
  // a "nincs ilyen" againak koszonhetoen mukodne.
  for (const role of ["megrendelo", "teszt1"] as const) {
    const api = await apiContextFor(playwright, role, baseURL!);

    try {
      const response = await api.get(`/api/tig/${encodeURIComponent(packageId)}/export/xlsx`);
      expect(response.status(), `${role} le tudta tolteni egy valodi csomag penzugyi exportjat`).toBe(403);
    } finally {
      await api.dispose();
    }
  }
});
