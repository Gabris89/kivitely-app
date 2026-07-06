import type { Issue, IssueStatus, UserRole } from "@/types";

export const issueStatusLabels: Record<IssueStatus, string> = {
  draft: "Piszkozat",
  open: "Nyitott",
  assigned: "Kiosztva",
  in_progress: "Folyamatban",
  ready_for_review: "Ellenőrzésre vár",
  accepted: "Elfogadva",
  rejected: "Visszadobva",
  tig_ready: "TIG-ready",
  closed: "Lezárva"
};

export const issueStatusOrder: IssueStatus[] = [
  "draft",
  "open",
  "assigned",
  "in_progress",
  "ready_for_review",
  "accepted",
  "rejected",
  "tig_ready",
  "closed"
];

const transitions: Record<IssueStatus, IssueStatus[]> = {
  draft: ["open", "assigned"],
  open: ["assigned", "rejected"],
  assigned: ["in_progress", "rejected"],
  in_progress: ["ready_for_review", "rejected"],
  ready_for_review: ["accepted", "rejected"],
  accepted: ["tig_ready", "closed"],
  rejected: ["assigned", "in_progress"],
  tig_ready: ["closed"],
  closed: []
};

const rolePermissions: Record<UserRole, IssueStatus[]> = {
  admin: issueStatusOrder,
  project_manager: ["open", "assigned", "in_progress", "ready_for_review", "accepted", "rejected", "tig_ready", "closed"],
  site_manager: ["draft", "open", "assigned", "in_progress", "ready_for_review", "rejected"],
  subcontractor: ["in_progress", "ready_for_review"],
  viewer: []
};

export function getAllowedStatusTransitions(issue: Issue, role: UserRole = "project_manager") {
  const allowed = new Set(rolePermissions[role]);
  return transitions[issue.status].filter((status) => allowed.has(status));
}

export function getNextStatuses(issue: Issue, role: UserRole = "project_manager") {
  return getAllowedStatusTransitions(issue, role);
}

export function canMoveIssue(issue: Issue, target: IssueStatus, role: UserRole = "project_manager") {
  return getAllowedStatusTransitions(issue, role).includes(target);
}

export function getWorkflowHint(issue: Issue) {
  switch (issue.status) {
    case "draft":
      return "Piszkozat. Ellenőrizd a helyszínt, leírást és a bizonyítási elvárást, mielőtt kiosztod.";
    case "open":
      return "Nyitott hiba. Következő lépés: felelős alvállalkozó és határidő kijelölése.";
    case "assigned":
      return "Kiosztva. Az alvállalkozónak el kell kezdenie a javítást vagy vissza kell jeleznie akadályt.";
    case "in_progress":
      return "Folyamatban. Készre jelentéshez utána fotó vagy dokumentált bizonyíték kell.";
    case "ready_for_review":
      return "Készre jelentve. Projektvezetői ellenőrzés és elfogadás következik.";
    case "accepted":
      return "Elfogadva. Ha a bizonyítékcsomag teljes, TIG előkészítésre jelölhető.";
    case "rejected":
      return "Visszadobva. Javítási indok és új határidő szükséges.";
    case "tig_ready":
      return "TIG-ready. A tétel készen áll teljesítésigazolási csomagba kerülni.";
    case "closed":
      return "Lezárva. Nincs további terepi teendő ezen a hibán.";
  }
}
