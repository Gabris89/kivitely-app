import type { BlockerItem, Issue, Project, TigPackage, TigPackageStatus } from "@/types";
import { isIssueTigReady } from "@/lib/issueMetrics";
import { issueStatusLabels, issueStatusOrder } from "@/lib/workflow";

// ── Aggregált dashboard – tiszta (I/O-mentes) számítási réteg ───────────────
// Minden függvény MÁR BETÖLTÖTT tömbökön dolgozik, nem hív Supabase-t. Ezért
// külön modul és nem a repository.ts része:
//  1) a repository az I/O réteg, és már így is 2300+ sor,
//  2) tiszta függvényként ez az egész fájl tesztelhető adatbázis nélkül
//     (a backlogban nyitott tétel, hogy nulla teszt van a repóban).
// Lásd: docs/dashboard-plan.md

// Ezekben a státuszokban a hiba már nem "él" a terepen, tehát nem lehet lejárt.
const settledIssueStatuses: Issue["status"][] = ["accepted", "tig_ready", "closed"];
const activeBlockerStatuses: BlockerItem["status"][] = ["open", "in_progress", "waiting_external"];
// A TIG csomag ezekben a státuszokban már "leigazoltnak" számít pénzügyileg.
const approvedTigStatuses: TigPackageStatus[] = ["approved", "sent"];

export const tigStatusLabels: Record<TigPackageStatus, string> = {
  draft: "Piszkozat",
  ready_for_review: "Jóváhagyásra vár",
  approved: "Jóváhagyva",
  sent: "Elküldve"
};

export const tigStatusOrder: TigPackageStatus[] = ["draft", "ready_for_review", "approved", "sent"];

export type BarRow = {
  key: string;
  label: string;
  count: number;
  /** Opcionális másodlagos érték (Ft), ahol a sáv pénzt is jelöl. */
  valueHuf?: number;
  /** Opcionális cél-URL, ha a sorra kattintva tovább lehet lépni. */
  href?: string;
};

export type SubcontractorRow = {
  name: string;
  openIssues: number;
  overdueIssues: number;
  /** Átlagos átfutás nyitástól lezárásig, napban. null = még nincs lezárt hiba. */
  avgClosureDays: number | null;
  /** TIG-ready, de még jóvá nem hagyott csomagban lévő / csomagon kívüli érték. */
  uncertifiedValueHuf: number;
};

export type BlockerSummary = {
  active: number;
  critical: number;
  /** Az aktív akadályok átlagos kora napban. null = nincs aktív akadály. */
  avgAgeDays: number | null;
  oldest: { id: string; title: string; projectName: string; ageDays: number }[];
};

export type TigSummary = {
  rows: BarRow[];
  packageCount: number;
  totalNetHuf: number;
  /** TIG-ready hibák értéke, amik semmilyen csomagban nincsenek benne. */
  unpackagedValueHuf: number;
  unpackagedCount: number;
};

export type ProjectRow = {
  publicId: string;
  name: string;
  openIssues: number;
  overdueIssues: number;
  activeBlockers: number;
  uncertifiedValueHuf: number;
};

export type DashboardData = {
  kpi: {
    openIssues: number;
    overdueIssues: number;
    activeBlockers: number;
    uncertifiedValueHuf: number;
  };
  tig: TigSummary;
  subcontractors: SubcontractorRow[];
  issuesByStatus: BarRow[];
  blockers: BlockerSummary;
  /** Csak a globális ("Minden projekt") nézetben töltjük ki. */
  projects: ProjectRow[];
};

function toDate(value?: string) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function daysBetween(from: Date, to: Date) {
  return Math.max(0, Math.round((to.getTime() - from.getTime()) / 86_400_000));
}

export function isIssueOverdue(issue: Issue, now: Date) {
  if (settledIssueStatuses.includes(issue.status)) return false;
  const due = toDate(issue.dueDate);
  return due ? due.getTime() < now.getTime() : false;
}

export function isIssueOpen(issue: Issue) {
  return issue.status !== "closed";
}

/**
 * Átlagos átfutás nyitástól lezárásig, napban.
 *
 * KÖZELÍTÉS: az app ma nem tárol külön `closed_at` mezőt, és nincs teljes
 * státuszváltás-napló sem, ezért a lezárt hibák `updatedAt - createdAt`
 * különbségét használjuk. Ez felfelé torzít, ha a hibát lezárás UTÁN még
 * szerkesztették. Ha egyszer lesz `issue_events`-alapú státusztörténet, ez az
 * egyetlen hely, amit át kell írni.
 */
function averageClosureDays(issues: Issue[]) {
  const durations = issues
    .filter((issue) => issue.status === "closed")
    .map((issue) => {
      const created = toDate(issue.createdAt);
      const updated = toDate(issue.updatedAt);
      return created && updated ? daysBetween(created, updated) : null;
    })
    .filter((value): value is number => value !== null);

  if (!durations.length) return null;
  return Math.round((durations.reduce((sum, value) => sum + value, 0) / durations.length) * 10) / 10;
}

/**
 * Az a pénz, ami bizonyíthatóan elvégzett munka, de még nincs jóváhagyott
 * (approved/sent) TIG csomagban. Ez a dashboard legfontosabb száma: a
 * kivitelezésben a leggyakoribb valós veszteség az elvégzett, dokumentált,
 * de soha ki nem számlázott tétel.
 */
function uncertifiedValue(issues: Issue[], settledIssueIds: Set<string>) {
  return issues
    .filter((issue) => isIssueTigReady(issue) && !settledIssueIds.has(issue.id))
    .reduce((sum, issue) => sum + issue.valueHuf, 0);
}

function buildTigSummary(issues: Issue[], tigPackages: TigPackage[], packagedIssueIds: Set<string>): TigSummary {
  const rows: BarRow[] = tigStatusOrder.map((status) => {
    const packages = tigPackages.filter((tigPackage) => tigPackage.status === status);
    return {
      key: status,
      label: tigStatusLabels[status],
      count: packages.length,
      valueHuf: packages.reduce((sum, tigPackage) => sum + (tigPackage.netValueHuf ?? tigPackage.grossValueHuf), 0)
    };
  });

  const unpackaged = issues.filter((issue) => isIssueTigReady(issue) && !packagedIssueIds.has(issue.id));

  return {
    rows,
    packageCount: tigPackages.length,
    totalNetHuf: rows.reduce((sum, row) => sum + (row.valueHuf || 0), 0),
    unpackagedValueHuf: unpackaged.reduce((sum, issue) => sum + issue.valueHuf, 0),
    unpackagedCount: unpackaged.length
  };
}

function buildSubcontractorRows(issues: Issue[], settledIssueIds: Set<string>, now: Date): SubcontractorRow[] {
  const names = Array.from(new Set(issues.map((issue) => issue.subcontractor).filter(Boolean)));

  return names
    .map((name) => {
      const own = issues.filter((issue) => issue.subcontractor === name);
      return {
        name,
        openIssues: own.filter(isIssueOpen).length,
        overdueIssues: own.filter((issue) => isIssueOverdue(issue, now)).length,
        avgClosureDays: averageClosureDays(own),
        uncertifiedValueHuf: uncertifiedValue(own, settledIssueIds)
      };
    })
    // "Ki csúszik a legjobban": először a lejárt hibák száma dönt, holtversenyben
    // a nyitott darabszám, végül a bent ragadt pénz.
    .sort(
      (a, b) =>
        b.overdueIssues - a.overdueIssues ||
        b.openIssues - a.openIssues ||
        b.uncertifiedValueHuf - a.uncertifiedValueHuf
    );
}

function buildBlockerSummary(blockers: BlockerItem[], now: Date): BlockerSummary {
  const active = blockers.filter((blocker) => activeBlockerStatuses.includes(blocker.status));
  const ages = active.map((blocker) => {
    const created = toDate(blocker.createdAt);
    return { blocker, ageDays: created ? daysBetween(created, now) : 0 };
  });

  return {
    active: active.length,
    critical: active.filter((blocker) => blocker.severity === "critical").length,
    avgAgeDays: ages.length
      ? Math.round((ages.reduce((sum, item) => sum + item.ageDays, 0) / ages.length) * 10) / 10
      : null,
    oldest: ages
      .sort((a, b) => b.ageDays - a.ageDays)
      .slice(0, 3)
      .map((item) => ({
        id: item.blocker.publicId,
        title: item.blocker.title,
        projectName: item.blocker.projectName,
        ageDays: item.ageDays
      }))
  };
}

function buildProjectRows(
  projects: Project[],
  issues: Issue[],
  blockers: BlockerItem[],
  settledIssueIds: Set<string>,
  now: Date
): ProjectRow[] {
  return projects
    .map((project) => {
      const own = issues.filter((issue) => issue.projectId === project.publicId);
      return {
        publicId: project.publicId,
        name: project.name,
        openIssues: own.filter(isIssueOpen).length,
        overdueIssues: own.filter((issue) => isIssueOverdue(issue, now)).length,
        activeBlockers: blockers.filter(
          (blocker) => blocker.projectId === project.publicId && activeBlockerStatuses.includes(blocker.status)
        ).length,
        uncertifiedValueHuf: uncertifiedValue(own, settledIssueIds)
      };
    })
    .sort((a, b) => b.overdueIssues - a.overdueIssues || b.openIssues - a.openIssues);
}

export type DashboardInput = {
  projects: Project[];
  issues: Issue[];
  blockers: BlockerItem[];
  tigPackages: TigPackage[];
  /** Tesztelhetőség miatt injektálható "most". */
  now?: Date;
};

export function buildDashboardData({ projects, issues, blockers, tigPackages, now = new Date() }: DashboardInput): DashboardData {
  // Egy hiba akkor van "csomagolva", ha bármelyik TIG csomag hivatkozik rá;
  // és akkor "leigazolva", ha jóváhagyott/elküldött csomagban van.
  const packagedIssueIds = new Set(tigPackages.flatMap((tigPackage) => tigPackage.issueIds));
  const settledIssueIds = new Set(
    tigPackages.filter((tigPackage) => approvedTigStatuses.includes(tigPackage.status)).flatMap((tigPackage) => tigPackage.issueIds)
  );

  return {
    kpi: {
      openIssues: issues.filter(isIssueOpen).length,
      overdueIssues: issues.filter((issue) => isIssueOverdue(issue, now)).length,
      activeBlockers: blockers.filter((blocker) => activeBlockerStatuses.includes(blocker.status)).length,
      uncertifiedValueHuf: uncertifiedValue(issues, settledIssueIds)
    },
    tig: buildTigSummary(issues, tigPackages, packagedIssueIds),
    subcontractors: buildSubcontractorRows(issues, settledIssueIds, now),
    issuesByStatus: issueStatusOrder
      .map((status) => ({
        key: status,
        label: issueStatusLabels[status],
        count: issues.filter((issue) => issue.status === status).length
      }))
      // A soha elő nem forduló státuszok csak zajt adnak a diagramhoz.
      .filter((row) => row.count > 0),
    blockers: buildBlockerSummary(blockers, now),
    projects: buildProjectRows(projects, issues, blockers, settledIssueIds, now)
  };
}
