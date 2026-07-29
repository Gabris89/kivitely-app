import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import { apiContextFor, browserContextFor } from "../fixtures/auth";
import { marked, pngUpload } from "../fixtures/media";
import { TEST_PROJECT_2 } from "../test-data";

/**
 * R5 (akadaly) es R6 (dokumentum) adminkent, plusz a ket HATOKOR-FUGGO
 * biztonsagi allitas.
 *
 * Miert itt vannak a biztonsagi tesztek: a 2. es 3. res ellenorzesehez olyan
 * adat kell (dokumentum es akadaly a 2. projektben), ami sem a seedben, sem a
 * teszt-adatban nincs meg. Itt viszont adminkent letre tudjuk hozni, ezert a
 * fixture es az allitas egy helyen marad.
 *
 * A vizsgalt szerep mindket esetben a MUVEZETO (site_manager), mert nala all
 * elo a lenyeg: a szerep-jog megengedne a muveletet, a hatokornek kell
 * megfognia. Egy alvallalkozo mar a szerep-jogon elbukna, az nem bizonyitana
 * semmit.
 */

test.describe.configure({ mode: "serial" });

let page: Page;
let adminApi: APIRequestContext;
let projectId = "";
let project2Id = "";

const BLOCKER_TITLE = marked("R5 teszt akadaly");
const DOCUMENT_TITLE = marked("R6 teszt dokumentum");

// A letrehozott rekordok azonositoi, hogy a futas vegen eltakarithassuk oket.
// Enelkul minden futas hagyna maga utan egy akadalyt es egy dokumentumot.
let createdBlockerId = "";
let createdDocumentId = "";

test.beforeAll(async ({ browser, playwright, baseURL }) => {
  const context = await browserContextFor(browser, "admin");
  page = await context.newPage();
  adminApi = await apiContextFor(playwright, "admin", baseURL!);

  await page.goto("/projects");
  const rows = page.locator("a.entity-row");

  projectId = ((await rows.first().getAttribute("href")) || "").split("/").filter(Boolean).pop() || "";
  expect(projectId, "Nem talalhato egyetlen projekt sem").toBeTruthy();

  const project2Row = rows.filter({ hasText: TEST_PROJECT_2 }).first();
  await expect(project2Row, `Nincs meg a(z) "${TEST_PROJECT_2}" - futtasd a test-data-permissions.sql-t`).toBeVisible();
  project2Id = ((await project2Row.getAttribute("href")) || "").split("/").filter(Boolean).pop() || "";
});

test.afterAll(async () => {
  // Takaritas: ami itt keletkezett, az itt is szunjon meg. A hibakat
  // szandekosan elnyeljuk - egy sikertelen takaritas ne buktassa a futast,
  // a RUN_ID jeloles miatt a maradek amugy is megkeresheto.
  if (createdBlockerId) {
    await adminApi.delete(`/api/projects/${projectId}/blockers/${createdBlockerId}`).catch(() => undefined);
  }

  if (createdDocumentId) {
    await adminApi.delete(`/api/documents/${createdDocumentId}`).catch(() => undefined);
  }

  await adminApi.dispose();
  await page.context().close();
});

test("R5 - akadaly bejelentese es lezarasa", async () => {
  await page.goto(`/projects/${projectId}/blockers/new`);

  await page.fill('input[name="title"]', BLOCKER_TITLE);
  await page.fill('textarea[name="description"]', "E2E teszt akadaly leirasa.");
  await page.getByRole("button", { name: "Akadály rögzítése" }).click();
  await expect(page.getByText(/Akadály rögzítve/i)).toBeVisible({ timeout: 20_000 });

  // Megnyitas a listarol, majd lezaras.
  await page.goto(`/projects/${projectId}/blockers`);
  await page.locator("a.entity-row", { hasText: BLOCKER_TITLE }).first().click();

  // A publicId az URL vegen van - a takaritashoz kell.
  createdBlockerId = page.url().split("/").filter(Boolean).pop() || "";

  await page.getByRole("button", { name: "Szerkesztés" }).click();
  await page.selectOption('select[name="status"]', "resolved");
  await page.getByRole("button", { name: "Mentés" }).click();

  await expect(page.getByText("Akadály frissítve.")).toBeVisible({ timeout: 15_000 });
});

test("R6 - dokumentum feltoltese a 2. projektbe", async () => {
  // Szandekosan a 2. projektbe toltunk fel: ez lesz a kovetkezo teszt
  // fixture-je is (a muvezeto ezt a projektet NEM latja).
  await page.goto(`/projects/${project2Id}/documents`);

  await page.fill('input[name="title"]', DOCUMENT_TITLE);
  await page.selectOption('select[name="documentType"]', "photo_document");
  await page.locator('input[name="file"]').setInputFiles(pngUpload("e2e-terv.png"));
  await page.getByRole("button", { name: /Feltölt/i }).click();

  await expect(page.locator(".document-row", { hasText: DOCUMENT_TITLE })).toBeVisible({ timeout: 30_000 });
});

test("2. res - a muvezeto nem er hozza idegen projekt tervenek mereseihez", async ({ playwright, baseURL }) => {
  // A dokumentum azonositoja az API-bol jon: a feluleten nem jelenik meg.
  const listResponse = await adminApi.get(`/api/projects/${project2Id}/documents`);
  expect(listResponse.status()).toBe(200);

  const documents = (await listResponse.json()).data as { id: string; title: string }[];
  const target = documents.find((doc) => doc.title === DOCUMENT_TITLE);
  expect(target, "Nem talalhato a most feltoltott dokumentum").toBeTruthy();
  createdDocumentId = target!.id;

  const muvezetoApi = await apiContextFor(playwright, "muvezeto", baseURL!);

  try {
    // Olvasas: a muvezeto nem tagja a 2. projektnek, ezert ures listat kap.
    const readResponse = await muvezetoApi.get(`/api/documents/${target!.id}/measurements`);
    const readBody = await readResponse.json();
    expect(readBody.data, "A muvezeto latja egy nem lathato projekt tervenek mereseit").toEqual([]);

    // Iras: a measurement.create jog megvan neki, a hatokornek kell tiltania.
    const writeResponse = await muvezetoApi.post(`/api/documents/${target!.id}/measurements`, {
      data: {
        measurementType: "length",
        pageNumber: 1,
        points: [
          { x: 0.1, y: 0.1 },
          { x: 0.2, y: 0.2 }
        ],
        calculatedValue: 1.23,
        label: marked("nem szabadna letrejonnie")
      }
    });
    expect(writeResponse.status(), "A muvezeto merest tudott irni idegen projekt tervere").not.toBe(201);

    // Kettos ellenorzes adminnal: tenylegesen nem jott letre semmi.
    const verify = await adminApi.get(`/api/documents/${target!.id}/measurements`);
    expect((await verify.json()).data).toEqual([]);
  } finally {
    await muvezetoApi.dispose();
  }
});

test("3. res - a muvezeto nem modosithat idegen projekt akadalyat", async ({ playwright, baseURL }) => {
  // Fixture: akadaly a 2. projektben, adminkent letrehozva.
  const createResponse = await adminApi.post(`/api/projects/${project2Id}/blockers`, {
    data: {
      title: marked("idegen projekt akadalya"),
      description: "A muvezetonek nem szabadna hozzaernie.",
      severity: "normal"
    }
  });
  expect(createResponse.ok(), "Nem sikerult letrehozni a teszt-akadalyt").toBeTruthy();

  const blocker = (await createResponse.json()).data as { publicId: string; title: string };
  const muvezetoApi = await apiContextFor(playwright, "muvezeto", baseURL!);

  try {
    const patchResponse = await muvezetoApi.patch(`/api/projects/${project2Id}/blockers/${blocker.publicId}`, {
      data: {
        title: "ELTERITVE",
        description: "Ennek nem szabadna atmennie.",
        status: "closed"
      }
    });

    expect(patchResponse.ok(), "A muvezeto modositani tudta egy nem lathato projekt akadalyat").toBeFalsy();

    // A cim tenylegesen valtozatlan maradt-e.
    const verify = await adminApi.get(`/api/projects/${project2Id}/blockers`);
    const current = ((await verify.json()).data as { publicId: string; title: string }[]).find(
      (item) => item.publicId === blocker.publicId
    );
    expect(current?.title, "Az akadaly cime megvaltozott").toBe(blocker.title);
  } finally {
    await muvezetoApi.dispose();
    await adminApi.delete(`/api/projects/${project2Id}/blockers/${blocker.publicId}`);
  }
});
