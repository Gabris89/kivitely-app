/**
 * A supabase/test-data-permissions.sql altal letrehozott adatok NEVEI.
 *
 * Miert nev es nem azonosito: a public_id-ket (HIB-xxx, PRJ-xxx, ALV-xxx) az
 * SQL dinamikusan, max+1 alapjan generalja, tehat kornyezetenkent mas lehet.
 * A cimek viszont fixek, es szandekosan beszedesek. Ezert minden allitas nev
 * szerint keres.
 *
 * Mellekhaszon: a regresszios tesztek adatot hoznak letre, ami minden abszolut
 * darabszamot elrontana - a nev szerinti keresest viszont nem zavarja.
 */

export const TEST_ISSUE_1 = "Test hiba 1 - Test ceg 2, 1. projekt";
export const TEST_ISSUE_2 = "Test hiba 2 - Test ceg 1, 1. projekt";
export const TEST_ISSUE_3 = "Test hiba 3 - Test ceg 1, 2. projekt";

export const TEST_PROJECT_2 = "Test projekt 2";

export const TEST_COMPANY_1 = "Test ceg 1";
export const TEST_COMPANY_2 = "Test ceg 2";

/**
 * A jogosultsagi igazsagtablazat (test-data-permissions.sql, 272-280. sor).
 *
 * true  = a fioknak LATNIA kell a hibat
 * false = NEM lathatja (a lista ne tartalmazza, a kozvetlen URL 404 legyen)
 */
export const VISIBILITY_MATRIX = {
  admin: { [TEST_ISSUE_1]: true, [TEST_ISSUE_2]: true, [TEST_ISSUE_3]: true, project2: true },
  pm: { [TEST_ISSUE_1]: true, [TEST_ISSUE_2]: true, [TEST_ISSUE_3]: true, project2: true },
  // Tagja az 1. projektnek, de nem a 2.-nak. Cegre nincs szukitve.
  muvezeto: { [TEST_ISSUE_1]: true, [TEST_ISSUE_2]: true, [TEST_ISSUE_3]: false, project2: false },
  // Test ceg 1. A 3. hiba a sajat cege, DE a 2. projektben - projekt-szinten kizart.
  teszt1: { [TEST_ISSUE_1]: false, [TEST_ISSUE_2]: true, [TEST_ISSUE_3]: false, project2: false },
  // Test ceg 2. Tagja MINDKET projektnek, de csak a sajat cege hibait latja.
  teszt2: { [TEST_ISSUE_1]: true, [TEST_ISSUE_2]: false, [TEST_ISSUE_3]: false, project2: true },
  // Csak olvas, egyebkent ugyanaz a latasi kor, mint a muvezetonel.
  megrendelo: { [TEST_ISSUE_1]: true, [TEST_ISSUE_2]: true, [TEST_ISSUE_3]: false, project2: false }
} as const;

/**
 * Vart projekt-darabszam fiokonkent (/api/whoami visibility.projectCount).
 * A portfolio-szerepeknel null, mert ok nincsenek projektre szukitve.
 */
export const EXPECTED_PROJECT_COUNT: Record<string, number | null> = {
  admin: null,
  pm: null,
  muvezeto: 1,
  teszt1: 1,
  teszt2: 2,
  megrendelo: 1
};
