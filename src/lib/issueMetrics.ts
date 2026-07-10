import type { DashboardMetrics, EvidencePhoto, Issue, TigItem } from "@/types";

const approvedStatuses: Issue["status"][] = ["accepted", "tig_ready", "closed"];
const tigEligibleStatuses: Issue["status"][] = ["accepted", "tig_ready"];
const reviewReadyStatuses: Issue["status"][] = ["ready_for_review", "accepted", "tig_ready"];

function getEvidenceCounts(issue: Issue, photos?: EvidencePhoto[]) {
  if (photos) {
    return {
      beforeCount: photos.filter((photo) => photo.type === "before_photo").length,
      afterCount: photos.filter((photo) => photo.type === "after_photo").length
    };
  }

  return {
    beforeCount: issue.photosBefore,
    afterCount: issue.photosAfter
  };
}

export function calculateDashboardMetrics(issues: Issue[], tigItems: TigItem[]): DashboardMetrics {
  return {
    openIssues: issues.filter((issue) => issue.status !== "closed").length,
    overdueIssues: issues.filter((issue) => issue.priority === "critical" && !approvedStatuses.includes(issue.status)).length,
    readyIssues: issues.filter((issue) => issue.status === "ready_for_review").length,
    approvedIssues: issues.filter((issue) => approvedStatuses.includes(issue.status)).length,
    tigValueHuf: tigItems.filter((item) => item.included).reduce((sum, item) => sum + item.valueHuf, 0),
    missingProofCount: issues.reduce((sum, issue) => {
      const needsAfterPhoto = reviewReadyStatuses.includes(issue.status) && issue.photosAfter === 0;
      const needsBeforePhoto = issue.photosBefore === 0;
      return sum + Number(needsAfterPhoto) + Number(needsBeforePhoto);
    }, 0)
  };
}

export function getIssueProofScore(issue: Issue, photos?: EvidencePhoto[]) {
  const { beforeCount, afterCount } = getEvidenceCounts(issue, photos);
  const required = 2;
  const score = Number(beforeCount > 0) + Number(afterCount > 0);
  return Math.round((score / required) * 100);
}

export function getEvidenceChecklistStatus(issue: Issue, photos?: EvidencePhoto[]) {
  const { beforeCount, afterCount } = getEvidenceCounts(issue, photos);

  return {
    beforePhoto: beforeCount > 0,
    afterPhoto: afterCount > 0,
    description: issue.description.trim().length > 12,
    accepted: tigEligibleStatuses.includes(issue.status)
  };
}

export function getIssueTigReadiness(issue: Issue, photos?: EvidencePhoto[]) {
  const checklist = getEvidenceChecklistStatus(issue, photos);
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
