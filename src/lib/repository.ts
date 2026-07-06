import {
  evidencePhotos as mockEvidencePhotos,
  issueEvents as mockIssueEvents,
  issues as mockIssues,
  project as mockProject,
  subcontractors as mockSubcontractors,
  tigItems as mockTigItems,
  tigPackages as mockTigPackages
} from "@/data/mock";
import type { EvidencePhoto, EvidenceType, Issue, IssueEvent, IssueStatus, Priority, Project, Subcontractor, TigItem, TigPackage } from "@/types";
import { canMoveIssue } from "@/lib/workflow";
import { getSupabaseClient } from "@/lib/supabase/client";

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

type SupabaseIssueRow = {
  id: string;
  public_id: string;
  title: string;
  description: string | null;
  location: string | null;
  area: string | null;
  trade: string | null;
  assignee_name: string | null;
  due_date: string | null;
  status: IssueStatus;
  priority: Priority;
  value_huf: number | string | null;
  created_at: string;
  updated_at: string;
  subcontractors?: { name: string | null } | null;
  issue_evidence?: { evidence_type: EvidenceType }[] | null;
};

type SupabaseProjectRow = {
  id: string;
  name: string;
  address: string | null;
  client: string | null;
  phase: string | null;
  progress: number | null;
};

type SupabaseSubcontractorRow = {
  id: string;
  name: string;
  trade: string | null;
  contact_name: string | null;
  phone: string | null;
};

type SupabaseEvidenceRow = {
  id: string;
  issue_id: string;
  evidence_type: "before_photo" | "after_photo";
  label: string | null;
  uploaded_by: string | null;
  uploaded_at: string;
};

type SupabaseIssueEventRow = {
  id: string;
  issue_id: string;
  event_type: IssueEvent["type"];
  title: string;
  description: string | null;
  actor_id: string | null;
  created_at: string;
};

type SupabaseTigPackageRow = {
  id: string;
  project_id: string;
  public_id: string;
  status: TigPackage["status"];
  gross_value_huf: number | string | null;
  created_at: string;
  updated_at: string;
  subcontractors?: { name: string | null } | null;
  tig_package_issues?: { issue_id: string }[] | null;
};

function dateOnly(value?: string | null) {
  return value?.slice(0, 10) || "";
}

function numberValue(value: number | string | null | undefined) {
  return Number(value || 0);
}

function mapIssue(row: SupabaseIssueRow): Issue {
  const evidence = row.issue_evidence || [];

  return {
    id: row.public_id,
    title: row.title,
    description: row.description || "",
    location: row.location || "Nincs megadva",
    area: row.area || "Nincs megadva",
    trade: row.trade || "Nincs megadva",
    subcontractor: row.subcontractors?.name || "Nincs megadva",
    assignee: row.assignee_name || "Nincs megadva",
    dueDate: dateOnly(row.due_date),
    status: row.status,
    priority: row.priority,
    photosBefore: evidence.filter((item) => item.evidence_type === "before_photo").length,
    photosAfter: evidence.filter((item) => item.evidence_type === "after_photo").length,
    valueHuf: numberValue(row.value_huf),
    createdAt: dateOnly(row.created_at),
    updatedAt: dateOnly(row.updated_at),
    tags: ["supabase", row.trade || "szakág"].filter(Boolean)
  };
}

function mapProject(row: SupabaseProjectRow): Project {
  return {
    id: row.id,
    name: row.name,
    address: row.address || "",
    client: row.client || "",
    phase: row.phase || "",
    progress: row.progress || 0
  };
}

function mapSubcontractor(row: SupabaseSubcontractorRow, issues: Issue[]): Subcontractor {
  const relatedIssues = issues.filter((issue) => issue.subcontractor === row.name);

  return {
    id: row.id,
    name: row.name,
    trade: row.trade || "Nincs megadva",
    contact: row.contact_name || "Nincs megadva",
    phone: row.phone || "",
    openIssues: relatedIssues.filter((issue) => issue.status !== "closed").length,
    overdueIssues: relatedIssues.filter((issue) => issue.priority === "critical" && issue.status !== "closed").length,
    readyIssues: relatedIssues.filter((issue) => issue.status === "ready_for_review" || issue.status === "tig_ready").length,
    weeklyClosureRate: 0
  };
}

function mapEvidence(row: SupabaseEvidenceRow, issueId: string): EvidencePhoto {
  return {
    id: row.id,
    issueId,
    type: row.evidence_type,
    label: row.label || "Bizonyíték",
    uploadedBy: row.uploaded_by || "Supabase",
    uploadedAt: row.uploaded_at
  };
}

function mapIssueEvent(row: SupabaseIssueEventRow, issueId: string): IssueEvent {
  return {
    id: row.id,
    issueId,
    type: row.event_type,
    title: row.title,
    description: row.description || "",
    actor: row.actor_id || "Supabase",
    createdAt: row.created_at
  };
}

function mapTigPackage(row: SupabaseTigPackageRow): TigPackage {
  return {
    id: row.public_id,
    projectId: row.project_id,
    subcontractor: row.subcontractors?.name || "Nincs megadva",
    status: row.status,
    issueIds: row.tig_package_issues?.map((item) => item.issue_id) || [],
    grossValueHuf: numberValue(row.gross_value_huf),
    proofCount: 0,
    createdAt: dateOnly(row.created_at),
    updatedAt: dateOnly(row.updated_at)
  };
}

function logSupabaseReadError(scope: string, error: { message?: string } | null) {
  if (error) {
    console.warn(`Supabase read failed for ${scope}: ${error.message || "unknown error"}`);
  }
}

async function listSupabaseIssues() {
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("issues")
    .select("*,subcontractors(name),issue_evidence(evidence_type)")
    .order("updated_at", { ascending: false });

  logSupabaseReadError("issues", error);

  const rows = data as SupabaseIssueRow[] | null;
  if (error || !rows?.length) return null;
  return rows.map(mapIssue);
}

async function getSupabaseIssueDbId(publicId: string) {
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("issues")
    .select("id")
    .eq("public_id", publicId)
    .maybeSingle();

  logSupabaseReadError("issue id lookup", error);

  return error ? null : data?.id || null;
}

export async function getProject() {
  const supabase = getSupabaseClient();
  if (!supabase) return mockProject;

  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  logSupabaseReadError("projects", error);

  return !error && data ? mapProject(data as SupabaseProjectRow) : mockProject;
}

export async function listIssues() {
  return (await listSupabaseIssues()) || mockIssues;
}

export async function getIssue(id: string) {
  const issues = await listIssues();
  return issues.find((issue) => issue.id === id);
}

export async function getIssueEvidence(issueId: string) {
  const issueDbId = await getSupabaseIssueDbId(issueId);
  const supabase = getSupabaseClient();
  const result = issueDbId && supabase
    ? await supabase
        .from("issue_evidence")
        .select("*")
        .eq("issue_id", issueDbId)
        .order("uploaded_at", { ascending: true })
    : null;
  const rows = result?.data as SupabaseEvidenceRow[] | null | undefined;

  logSupabaseReadError("issue_evidence", result?.error || null);

  return rows?.length ? rows.map((row) => mapEvidence(row, issueId)) : mockEvidencePhotos.filter((photo) => photo.issueId === issueId);
}

export async function getIssueEvents(issueId: string) {
  const issueDbId = await getSupabaseIssueDbId(issueId);
  const supabase = getSupabaseClient();
  const result = issueDbId && supabase
    ? await supabase
        .from("issue_events")
        .select("*")
        .eq("issue_id", issueDbId)
        .order("created_at", { ascending: true })
    : null;
  const rows = result?.data as SupabaseIssueEventRow[] | null | undefined;

  logSupabaseReadError("issue_events", result?.error || null);

  return rows?.length ? rows.map((row) => mapIssueEvent(row, issueId)) : mockIssueEvents.filter((event) => event.issueId === issueId);
}

export async function listSubcontractors() {
  const supabase = getSupabaseClient();
  const issues = await listIssues();
  const result = supabase
    ? await supabase
        .from("subcontractors")
        .select("*")
        .order("name", { ascending: true })
    : null;
  const rows = result?.data as SupabaseSubcontractorRow[] | null | undefined;

  logSupabaseReadError("subcontractors", result?.error || null);

  return rows?.length ? rows.map((row) => mapSubcontractor(row, issues)) : mockSubcontractors;
}

export function listTigItems(): TigItem[] {
  return mockTigItems;
}

export async function listTigPackages() {
  const supabase = getSupabaseClient();
  if (!supabase) return mockTigPackages;

  const { data, error } = await supabase
    .from("tig_packages")
    .select("*,subcontractors(name),tig_package_issues(issue_id)")
    .order("updated_at", { ascending: false });

  logSupabaseReadError("tig_packages", error);

  const rows = data as SupabaseTigPackageRow[] | null;
  if (error) return mockTigPackages;
  return rows?.length ? rows.map(mapTigPackage) : mockTigPackages;
}

export function createIssue(input: CreateIssueInput): Issue {
  const nextNumber = Math.max(...mockIssues.map((issue) => Number(issue.id.replace("KIV-", "")))) + 1;
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
