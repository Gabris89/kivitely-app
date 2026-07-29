import { expect, test } from "@playwright/test";
import { ACCOUNTS, ROLE_KEYS } from "../accounts";
import { apiContextFor } from "../fixtures/auth";
import { EXPECTED_PROJECT_COUNT } from "../test-data";

/**
 * A latasi kor visszamerese fiokonkent, egyetlen keresbol.
 *
 * Az /api/whoami vegpont visszaadja a bejelentkezett fiok szerepet es a
 * kiszamolt hatokort (hany projektet lat, van-e ceg-szures). Ez pontosan az,
 * amit a src/lib/visibility.ts eldont, ezert itt lehet a legolcsobban
 * ellenorizni - UI-kattintgatas nelkul.
 *
 * Ha ez a fajl elbukik, a hiba a visibility.ts-ben vagy a teszt-adatban van;
 * a feluleti teszteket el se erdemes olvasni addig.
 */

const PORTFOLIO_ROLES = ["admin", "pm"];
const SUBCONTRACTOR_ROLES = ["teszt1", "teszt2"];

for (const role of ROLE_KEYS) {
  test(`${role}: szerep es hatokor`, async ({ playwright, baseURL }) => {
    const api = await apiContextFor(playwright, role, baseURL!);

    try {
      const response = await api.get("/api/whoami");
      expect(response.status()).toBe(200);

      const whoami = await response.json();
      const account = ACCOUNTS[role];

      expect(whoami.email).toBe(account.email);
      expect(whoami.workflowRole).toBe(account.workflowRole);
      expect(whoami.isActive).toBe(true);

      // A portfolio-szerepek (admin, projektvezeto) tagsag nelkul is mindent
      // latnak - naluk nincs projekt-szukites.
      const isPortfolio = PORTFOLIO_ROLES.includes(role);
      expect(whoami.visibility.unrestricted).toBe(isPortfolio);
      expect(whoami.visibility.projectCount).toBe(EXPECTED_PROJECT_COUNT[role]);

      // Ceg-szures CSAK az alvallalkozokra vonatkozik. Az epitesvezeto es a
      // megtekinto a sajat projektjeikben MINDEN ceg munkajat latjak.
      expect(whoami.visibility.subcontractorFiltered).toBe(SUBCONTRACTOR_ROLES.includes(role));

      // Alvallalkozonal a ceg-kotes megleteert kulon is kiallunk: ha ez ures,
      // a fiok fail-closed agra fut es semmit nem lat - ilyenkor a tobbi teszt
      // "helyesen" bukna el, csak epp rossz okbol.
      if (SUBCONTRACTOR_ROLES.includes(role)) {
        expect(whoami.subcontractorId, "Az alvallalkozo nincs ceghez kotve").toBeTruthy();
      }
    } finally {
      await api.dispose();
    }
  });
}
