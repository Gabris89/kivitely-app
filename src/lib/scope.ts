// Kivitely – navigációs scope segédfüggvények.
//
// Alapelv: a navigáció szerkezete nem változik attól, hogy "bent vagy-e" egy
// projektben. A jelenlegi projekt (scope) csak azt dönti el, MELYIK adaton
// dolgoznak a modulok. Ezek a tiszta függvények képezik le a jelenlegi
// útvonalat egy másik scope-ra úgy, hogy a modul (hibák / akadályok / workflow
// stb.) megmaradjon, ahol értelmezhető.

const PROJECT_SEGMENT_RE = /^\/projects\/([^/]+)(?:\/|$)/;

export type ModuleKey =
  | "dashboard"
  | "issues"
  | "blockers"
  | "workflow"
  | "documents"
  | "work-logs"
  | "tig"
  | "subcontractors"
  | "projects";

// A jelenlegi útvonalból kiolvassa a projekt publicId-ját.
// A "/projects/new" (új projekt létrehozása) NEM projekt-kontextus.
export function getScopeProjectId(pathname: string): string | null {
  const match = pathname.match(PROJECT_SEGMENT_RE);
  if (!match) return null;
  const id = match[1];
  if (id === "new") return null;
  return id;
}

// Melyik modulban vagyunk éppen – függetlenül attól, hogy globális vagy
// projekt-scope-ú útvonalon.
export function getModuleKey(pathname: string): ModuleKey | null {
  const projectId = getScopeProjectId(pathname);

  if (projectId) {
    const rest = pathname.slice(`/projects/${projectId}`.length);
    if (rest === "") return "dashboard";
    if (rest.startsWith("/issues")) return "issues";
    if (rest.startsWith("/blockers")) return "blockers";
    if (rest.startsWith("/workflow")) return "workflow";
    if (rest.startsWith("/documents")) return "documents";
    if (rest.startsWith("/work-logs")) return "work-logs";
    if (rest.startsWith("/tig")) return "tig";
    return "dashboard";
  }

  if (pathname === "/") return "dashboard";
  if (pathname === "/projects" || pathname.startsWith("/projects/new")) return "projects";
  if (pathname.startsWith("/issues")) return "issues";
  if (pathname.startsWith("/blockers")) return "blockers";
  if (pathname.startsWith("/workflow")) return "workflow";
  if (pathname.startsWith("/subcontractors")) return "subcontractors";
  return null;
}

// A modulok, amelyeknek van projekt-scope-ú útvonaluk (érték = a projekt URL
// utótagja a /projects/{id} után).
const PROJECT_ROUTE_SUFFIX: Partial<Record<ModuleKey, string>> = {
  dashboard: "",
  issues: "/issues",
  blockers: "/blockers",
  workflow: "/workflow",
  documents: "/documents",
  "work-logs": "/work-logs",
  tig: "/tig"
};

// A modulok globális (minden projekt) útvonala.
const GLOBAL_ROUTE: Partial<Record<ModuleKey, string>> = {
  dashboard: "/",
  issues: "/issues",
  blockers: "/blockers",
  workflow: "/workflow",
  subcontractors: "/subcontractors",
  projects: "/projects"
};

// A jelenlegi útvonalat leképezi a cél-scope megfelelő útvonalára úgy, hogy a
// modul megmaradjon, ahol lehet. Mindig LISTA/áttekintő útvonalra visz (nem egy
// konkrét rekordra), mert a rekord a régi scope-hoz tartozik.
//
// targetProjectId === null  ->  "Minden projekt" (globális) nézet
// targetProjectId === "PRJ-001"  ->  az adott projekt nézete
export function resolveScopeHref(pathname: string, targetProjectId: string | null): string {
  const moduleKey = getModuleKey(pathname);

  if (targetProjectId) {
    if (moduleKey && moduleKey in PROJECT_ROUTE_SUFFIX) {
      return `/projects/${targetProjectId}${PROJECT_ROUTE_SUFFIX[moduleKey]}`;
    }
    // Globális-only modul (Alvállalkozók, Projektek) -> a projekt áttekintője.
    return `/projects/${targetProjectId}`;
  }

  if (moduleKey && moduleKey in GLOBAL_ROUTE) {
    return GLOBAL_ROUTE[moduleKey] as string;
  }
  // Csak-projekt modul (Dokumentumok, Teljesítménynapló, TIG) -> nincs globális
  // megfelelője, ezért az áttekintésre esünk vissza.
  return "/";
}
