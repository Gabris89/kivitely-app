import path from "node:path";

/**
 * A hat teszt-fiok egyetlen igazsagforrasa.
 *
 * FIGYELEM: ezek a VALODI, adatbazisban letezo fiokok. A
 * supabase/test-data-permissions.sql eredetileg @example.com cimeket
 * felteteleztt, de a fiokok a gyakorlatban mas cimen jottek letre - a szerepek
 * viszont mar helyesek. Ezert itt a tenyleges cimek szerepelnek.
 *
 * Az alvallalkozo szerephez a teszt1/teszt2 @example.com fiokokat hasznaljuk,
 * mert CSAK azok vannak ceghez kotve (alvallalkozo@gmail.com nincs, igy az a
 * fail-closed agra futna es semmit nem latna - azzal nem lehetne merni).
 *
 * A jelszavak SOHA nem kerulnek ide: a .env.test.local fajlbol jonnek, ami a
 * .gitignore ".env*.local" sora miatt automatikusan kimarad a verziokovetesbol.
 */

export type RoleKey = "admin" | "pm" | "muvezeto" | "teszt1" | "teszt2" | "megrendelo";

export type Account = {
  /** Bejelentkezesi e-mail. */
  email: string;
  /** A .env.test.local kulcsa, ami a jelszot tartalmazza. */
  passwordEnv: string;
  /** Ahogy a menu aljan megjelenik (workflowRoleLabels a permissions.ts-ben). */
  roleLabel: string;
  /** A /api/whoami valaszaban vart workflowRole. */
  workflowRole: string;
};

export const ACCOUNTS: Record<RoleKey, Account> = {
  admin: {
    email: "admin@gmail.com",
    passwordEnv: "E2E_PASSWORD_ADMIN",
    roleLabel: "Adminisztrátor",
    workflowRole: "admin"
  },
  pm: {
    email: "projektvezeto@gmail.com",
    passwordEnv: "E2E_PASSWORD_PM",
    roleLabel: "Projektvezető",
    workflowRole: "project_manager"
  },
  muvezeto: {
    email: "epitesvezeto@gmail.com",
    passwordEnv: "E2E_PASSWORD_MUVEZETO",
    roleLabel: "Építésvezető",
    workflowRole: "site_manager"
  },
  teszt1: {
    email: "teszt1@example.com",
    passwordEnv: "E2E_PASSWORD_TESZT1",
    roleLabel: "Alvállalkozó",
    workflowRole: "subcontractor"
  },
  teszt2: {
    email: "teszt2@example.com",
    passwordEnv: "E2E_PASSWORD_TESZT2",
    roleLabel: "Alvállalkozó",
    workflowRole: "subcontractor"
  },
  megrendelo: {
    email: "megtekinto@gmail.com",
    passwordEnv: "E2E_PASSWORD_MEGRENDELO",
    roleLabel: "Megtekintő",
    workflowRole: "viewer"
  }
};

export const ROLE_KEYS = Object.keys(ACCOUNTS) as RoleKey[];

/** A globalSetup ide menti a bejelentkezett munkameneteket (gitignore). */
export function storageStatePath(role: RoleKey) {
  return path.join(__dirname, ".auth", `${role}.json`);
}
