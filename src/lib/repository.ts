import { evidencePhotos, issueEvents, issues, tigPackages } from "@/data/mock";
import type { Issue, IssueStatus, Priority } from "@/types";
import { canMoveIssue } from "@/lib/workflow";

export type CreateIssueInput = {
  title: string;
  description?: string;
  location: string;
  area?: string;
  trade?: string;
  subcontractor: string;
  assignee?: string;
  dueDate: string;
  priority?: Priority;
  valueHuf?: number;
};

export function listIssues() {
  return issues;
}

export function getIssue(id: string) {
  return issues.find((issue) => issue.id === id);
}

export function getIssueEvidence(issueId: string) {
  return evidencePhotos.filter((photo) => photo.issueId === issueId);
}

export function getIssueEvents(issueId: string) {
  return issueEvents.filter((event) => event.issueId === issueId);
}

export function listTigPackages() {
  return tigPackages;
}

export function createIssue(input: CreateIssueInput): Issue {
  const nextNumber = Math.max(...issues.map((issue) => Number(issue.id.replace("KIV-", "")))) + 1;
  const today = new Date().toISOString().slice(0, 10);

  return {
    id: `KIV-${nextNumber}`,
    title: input.title,
    description: input.description || "",
    location: input.location,
    area: input.area || "Nincs megadva",
    trade: input.trade || "Nincs megadva",
    subcontractor: input.subcontractor,
    assignee: input.assignee || "Nincs megadva",
    dueDate: input.dueDate,
    status: "open",
    priority: input.priority || "normal",
    photosBefore: 0,
    photosAfter: 0,
    valueHuf: input.valueHuf || 0,
    createdAt: today,
    updatedAt: today,
    tags: ["demo", "új"]
  };
}

export function moveIssueStatus(issue: Issue, targetStatus: IssueStatus) {
  if (!canMoveIssue(issue, targetStatus, "project_manager")) {
    return {
      ok: false,
      error: `Nem engedélyezett státuszváltás: ${issue.status} → ${targetStatus}`
    };
  }

  return {
    ok: true,
    issue: {
      ...issue,
      status: targetStatus,
      updatedAt: new Date().toISOString().slice(0, 10)
    }
  };
}
