import type { DashboardMetrics, Issue, TigItem } from "@/types";

const acceptedStatuses: Issue["status"][] = ["accepted", "tig_ready", "closed"];
const reviewReadyStatuses: Issue["status"][] = ["ready_for_review", "accepted", "tig_ready"];

export function calculateDashboardMetrics(issues: Issue[], tigItems: TigItem[]): DashboardMetrics {
  return {
    openIssues: issues.filter((issue) => issue.status !== "closed").length,
    overdueIssues: issues.filter((issue) => issue.priority === "critical" && !acceptedStatuses.includes(issue.status)).length,
    readyIssues: issues.filter((issue) => issue.status === "ready_for_review").length,
    approvedIssues: issues.filter((issue) => acceptedStatuses.includes(issue.status)).length,
    tigValueHuf: tigItems.filter((item) => item.included).reduce((sum, item) => sum + item.valueHuf, 0),
    missingProofCount: issues.reduce((sum, issue) => {
      const needsAfterPhoto = reviewReadyStatuses.includes(issue.status) && issue.photosAfter === 0;
      const needsBeforePhoto = issue.photosBefore === 0;
      return sum + Number(needsAfterPhoto) + Number(needsBeforePhoto);
    }, 0)
  };
}

export function getIssueProofScore(issue: Issue) {
  const required = 2;
  const score = Number(issue.photosBefore > 0) + Number(issue.photosAfter > 0);
  return Math.round((score / required) * 100);
}

export function getEvidenceChecklistStatus(issue: Issue) {
  return {
    beforePhoto: issue.photosBefore > 0,
    afterPhoto: issue.photosAfter > 0,
    description: issue.description.trim().length > 12,
    accepted: acceptedStatuses.includes(issue.status)
  };
}

export function getIssueTigReadiness(issue: Issue) {
  const checklist = getEvidenceChecklistStatus(issue);
  const ready = checklist.beforePhoto && checklist.afterPhoto && checklist.description && checklist.accepted;

  return {
    ready,
    label: ready ? "TIG-ready" : "TIG hiányos",
    missing: [
      !checklist.beforePhoto ? "előtte fotó" : "",
      !checklist.afterPhoto ? "utána fotó" : "",
      !checklist.description ? "műszaki leírás" : "",
      !checklist.accepted ? "elfogadott státusz" : ""
    ].filter(Boolean)
  };
}

export function isIssueTigReady(issue: Issue) {
  return issue.status === "tig_ready" || getIssueTigReadiness(issue).ready;
}
