export type IssueStatus =
  | "draft"
  | "open"
  | "assigned"
  | "in_progress"
  | "ready_for_review"
  | "accepted"
  | "rejected"
  | "tig_ready"
  | "closed";
export type Priority = "low" | "normal" | "high" | "critical";
export type UserRole = "admin" | "project_manager" | "site_manager" | "subcontractor" | "viewer";
export type EvidenceType = "before_photo" | "after_photo" | "document" | "comment" | "signature";

export type Project = {
  id: string;
  name: string;
  address: string;
  client: string;
  phase: string;
  progress: number;
};

export type Issue = {
  id: string;
  title: string;
  description: string;
  location: string;
  area: string;
  trade: string;
  subcontractor: string;
  assignee: string;
  dueDate: string;
  status: IssueStatus;
  priority: Priority;
  photosBefore: number;
  photosAfter: number;
  valueHuf: number;
  createdAt: string;
  updatedAt: string;
  tags: string[];
  tigReady?: boolean;
  requiredProof?: EvidenceType[];
};

export type EvidencePhoto = {
  id: string;
  issueId: string;
  type: "before_photo" | "after_photo";
  label: string;
  uploadedBy: string;
  uploadedAt: string;
  url?: string;
};

export type IssueEvent = {
  id: string;
  issueId: string;
  type: "created" | "assigned" | "status_changed" | "photo_uploaded" | "comment" | "tig_marked";
  title: string;
  description: string;
  actor: string;
  createdAt: string;
};

export type Subcontractor = {
  id: string;
  name: string;
  trade: string;
  contact: string;
  phone: string;
  openIssues: number;
  overdueIssues: number;
  readyIssues: number;
  weeklyClosureRate: number;
};

export type Activity = {
  id: string;
  icon: string;
  title: string;
  description: string;
  time: string;
};

export type TigItem = {
  id: string;
  title: string;
  subcontractor: string;
  valueHuf: number;
  proofCount: number;
  included: boolean;
};

export type TigPackage = {
  id: string;
  projectId: string;
  subcontractor: string;
  status: "draft" | "ready_for_review" | "approved" | "sent";
  issueIds: string[];
  grossValueHuf: number;
  proofCount: number;
  createdAt: string;
  updatedAt: string;
};

export type DashboardMetrics = {
  openIssues: number;
  overdueIssues: number;
  readyIssues: number;
  approvedIssues: number;
  tigValueHuf: number;
  missingProofCount: number;
};
