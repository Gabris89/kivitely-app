import type { UserRole } from "@/types";

/**
 * Jogosultsagi matrix - a 2. lepcso magja.
 *
 * FONTOS: ez a fajl szandekosan TISZTA (nincs benne se Supabase, se React,
 * se szerver-oldali import), hogy kliens komponensbol is importalhato legyen.
 * A szerver-oldali ellenorzes a permissions.server.ts-ben van.
 *
 * Lasd: docs/permissions-plan.md
 */

export type PermissionAction =
  | "project.create"
  | "project.update"
  | "project.delete"
  | "issue.create"
  | "issue.update"
  | "issue.delete"
  | "evidence.create"
  | "evidence.delete"
  | "blocker.create"
  | "blocker.update"
  | "blocker.delete"
  | "subcontractor.create"
  | "subcontractor.update"
  | "subcontractor.delete"
  | "document.create"
  | "document.delete"
  | "measurement.create"
  | "measurement.update"
  | "measurement.delete"
  | "measurement.calibrate"
  | "tig.create"
  | "tig.update"
  | "tig.delete"
  | "money.view";

const ADMIN_ONLY: UserRole[] = ["admin"];
const MANAGEMENT: UserRole[] = ["admin", "project_manager"];
const SITE_TEAM: UserRole[] = ["admin", "project_manager", "site_manager"];
const SITE_TEAM_AND_SUBCONTRACTOR: UserRole[] = ["admin", "project_manager", "site_manager", "subcontractor"];

/**
 * Egyetlen igazsagforras: melyik szerep mit csinalhat.
 * A `viewer` szandekosan sehol nem szerepel - csak olvashat.
 */
export const permissionMatrix: Record<PermissionAction, UserRole[]> = {
  // Projekt: torolni CSAK admin tud (a torles az egesz hibalistat viszi).
  "project.create": MANAGEMENT,
  "project.update": MANAGEMENT,
  "project.delete": ADMIN_ONLY,

  // Hiba: az alvallalkozo szerkesztheti (ezen keresztul lep allapotot),
  // de nem hozhat letre es nem torolhet. A tenyleges allapotvaltast
  // tovabbra is a workflow.ts rolePermissions tablaja korlatozza.
  "issue.create": SITE_TEAM,
  "issue.update": SITE_TEAM_AND_SUBCONTRACTOR,
  "issue.delete": MANAGEMENT,

  // Bizonyitek: az alvallalkozo fo feladata a fenykepes bizonyitas.
  "evidence.create": SITE_TEAM_AND_SUBCONTRACTOR,
  "evidence.delete": MANAGEMENT,

  // Akadaly: az alvallalkozo bejelentheti, de nem zarhatja le es nem torli.
  "blocker.create": SITE_TEAM_AND_SUBCONTRACTOR,
  "blocker.update": SITE_TEAM,
  "blocker.delete": MANAGEMENT,

  // Alvallalkozo-torzsadat: szerzodeses adat, ezert csak vezetoi szint.
  "subcontractor.create": MANAGEMENT,
  "subcontractor.update": MANAGEMENT,
  "subcontractor.delete": MANAGEMENT,

  // Dokumentum: az alvallalkozo NEM tolthet fel tervet.
  "document.create": SITE_TEAM,
  "document.delete": MANAGEMENT,

  // Terv-meres es kalibralas: helyszini munka, alvallalkozo nelkul.
  "measurement.create": SITE_TEAM,
  "measurement.update": SITE_TEAM,
  "measurement.delete": MANAGEMENT,
  "measurement.calibrate": SITE_TEAM,

  // TIG: penzugyi kihatasa van, ezert vezetoi szint.
  "tig.create": MANAGEMENT,
  "tig.update": MANAGEMENT,
  "tig.delete": MANAGEMENT,

  // Penzugyi ertekek megjelenitese (dashboard, TIG osszegek).
  "money.view": MANAGEMENT
};

export const workflowRoleLabels: Record<UserRole, string> = {
  admin: "Adminisztrátor",
  project_manager: "Projektvezető",
  site_manager: "Építésvezető",
  subcontractor: "Alvállalkozó",
  viewer: "Megtekintő"
};

const actionLabels: Record<PermissionAction, string> = {
  "project.create": "projekt létrehozásához",
  "project.update": "projekt módosításához",
  "project.delete": "projekt törléséhez",
  "issue.create": "hiba rögzítéséhez",
  "issue.update": "hiba módosításához",
  "issue.delete": "hiba törléséhez",
  "evidence.create": "fénykép feltöltéséhez",
  "evidence.delete": "fénykép törléséhez",
  "blocker.create": "akadály bejelentéséhez",
  "blocker.update": "akadály módosításához",
  "blocker.delete": "akadály törléséhez",
  "subcontractor.create": "alvállalkozó felviteléhez",
  "subcontractor.update": "alvállalkozó módosításához",
  "subcontractor.delete": "alvállalkozó törléséhez",
  "document.create": "dokumentum feltöltéséhez",
  "document.delete": "dokumentum törléséhez",
  "measurement.create": "mérés rögzítéséhez",
  "measurement.update": "mérés módosításához",
  "measurement.delete": "mérés törléséhez",
  "measurement.calibrate": "terv kalibrálásához",
  "tig.create": "TIG csomag létrehozásához",
  "tig.update": "TIG csomag módosításához",
  "tig.delete": "TIG csomag törléséhez",
  "money.view": "pénzügyi adatok megtekintéséhez"
};

export function can(role: UserRole, action: PermissionAction): boolean {
  return permissionMatrix[action].includes(role);
}

/** Ember altal olvashato, magyar nyelvu elutasito uzenet. */
export function permissionDeniedMessage(action: PermissionAction, role: UserRole): string {
  return `Nincs jogosultságod a ${actionLabels[action]} (jelenlegi szerep: ${workflowRoleLabels[role]}).`;
}

/**
 * Szerializalhato jogosultsag-csomag, amit a szerver komponens atad
 * a kliens komponenseknek. Igy a UI ugyanabbol a tablabol dolgozik,
 * mint a szerveroldali ellenorzes.
 */
export type PermissionFlags = Record<PermissionAction, boolean>;

export function buildPermissionFlags(role: UserRole): PermissionFlags {
  const entries = (Object.keys(permissionMatrix) as PermissionAction[]).map((action) => [action, can(role, action)]);
  return Object.fromEntries(entries) as PermissionFlags;
}
