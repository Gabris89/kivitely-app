import {
  blockerItems as mockBlockerItems,
  evidencePhotos as mockEvidencePhotos,
  issueEvents as mockIssueEvents,
  issues as mockIssues,
  project as mockProject,
  projectDocuments as mockProjectDocuments,
  subcontractors as mockSubcontractors,
  tigItems as mockTigItems,
  tigPackages as mockTigPackages,
  workLogs as mockWorkLogs
} from "@/data/mock";
import type { BlockerItem, BlockerSeverity, BlockerStatus, EvidencePhoto, EvidenceType, Issue, IssueEvent, IssueStatus, Priority, Project, ProjectDocument, ProjectDocumentType, ProjectDocumentVisibility, Subcontractor, TigItem, TigPackage, WorkLog, WorkLogStatus } from "@/types";
import { canMoveIssue, issueStatusLabels } from "@/lib/workflow";
import { getSupabaseClient } from "@/lib/supabase/client";

export type CreateIssueInput = {
  title: string;
  project?: string;
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

export type CreateIssueResult = {
  issue: Issue;
  mode: "supabase" | "mock";
};

export type CreateBlockerInput = {
  title: string;
  description: string;
  trade?: string;
  area?: string;
  severity?: BlockerSeverity;
  responsibleName?: string;
};

export type CreateBlockerResult = {
  blocker: BlockerItem;
  mode: "supabase" | "mock";
};

export type CreateIssueEvidenceInput = {
  type: "before_photo" | "after_photo";
  label?: string;
  file?: File;
};

export type CreateIssueEvidenceResult = {
  evidence: EvidencePhoto;
  mode: "supabase" | "mock";
};

export type DeleteIssueEvidenceResult = {
  ok: boolean;
  mode: "supabase" | "mock";
};

export type MoveIssueStatusResult =
  | {
      ok: true;
      issue: Issue;
      mode: "supabase" | "mock";
    }
  | {
      ok: false;
      error: string;
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
  storage_path: string | null;
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

type SupabaseWorkLogRow = {
  id: string;
  project_id: string;
  profile_id: string | null;
  trade: string | null;
  work_date: string;
  description: string;
  quantity: number | string | null;
  unit: string | null;
  status: WorkLogStatus;
  created_at: string;
  updated_at: string;
  projects?: { name: string | null } | null;
  profiles?: { display_name: string | null } | null;
};

type SupabaseBlockerRow = {
  id: string;
  project_id: string;
  created_by_profile_id: string | null;
  responsible_profile_id: string | null;
  title: string;
  description: string;
  trade: string | null;
  area: string | null;
  status: BlockerStatus;
  severity: BlockerSeverity;
  resolution_note: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
  projects?: { name: string | null } | null;
  created_by?: { display_name: string | null } | null;
  responsible?: { display_name: string | null } | null;
};

type SupabaseProjectDocumentRow = {
  id: string;
  project_id: string;
  uploaded_by_profile_id: string | null;
  document_type: ProjectDocumentType;
  title: string;
  description: string | null;
  trade: string | null;
  area: string | null;
  storage_path: string | null;
  file_name: string | null;
  mime_type: string | null;
  file_size_bytes: number | string | null;
  revision: string | null;
  visibility: ProjectDocumentVisibility;
  is_current: boolean;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
  projects?: { name: string | null } | null;
  profiles?: { display_name: string | null } | null;
};

function dateOnly(value?: string | null) {
  return value?.slice(0, 10) || "";
}

function numberValue(value: number | string | null | undefined) {
  return Number(value || 0);
}

const issueEvidenceBucket = "issue-evidence";

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

function getIssueEvidencePublicUrl(storagePath?: string | null) {
  const supabase = getSupabaseClient();
  if (!supabase || !storagePath?.startsWith("issues/")) return undefined;

  return supabase.storage.from(issueEvidenceBucket).getPublicUrl(storagePath).data.publicUrl;
}

function mapEvidence(row: SupabaseEvidenceRow, issueId: string): EvidencePhoto {
  return {
    id: row.id,
    issueId,
    type: row.evidence_type,
    label: row.label || "Bizonyíték",
    uploadedBy: row.uploaded_by || "Supabase",
    uploadedAt: row.uploaded_at,
    url: getIssueEvidencePublicUrl(row.storage_path),
    storagePath: row.storage_path || undefined
  };
}

function createMockEvidence(issueId: string, input: CreateIssueEvidenceInput): EvidencePhoto {
  const now = new Date().toISOString();

  return {
    id: `mock-${issueId}-${input.type}-${Date.now()}`,
    issueId,
    type: input.type,
    label: input.label || (input.type === "before_photo" ? "Előtte fotó metadata" : "Utána fotó metadata"),
    uploadedBy: "Mock fallback",
    uploadedAt: now
  };
}

function safeStorageFileName(fileName: string, fallbackExtension = "jpg") {
  const normalized = fileName
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "");

  if (normalized.includes(".")) return normalized;
  return `${normalized || "evidence"}.${fallbackExtension}`;
}

function extensionFromMime(type?: string) {
  if (type === "image/png") return "png";
  if (type === "image/webp") return "webp";
  if (type === "image/heic") return "heic";
  if (type === "image/heif") return "heif";
  return "jpg";
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

function mapWorkLog(row: SupabaseWorkLogRow): WorkLog {
  return {
    id: row.id,
    projectId: row.project_id,
    projectName: row.projects?.name || "Nincs megadva",
    profileId: row.profile_id || "",
    profileName: row.profiles?.display_name || "Nincs megadva",
    trade: row.trade || "Nincs megadva",
    workDate: dateOnly(row.work_date),
    description: row.description,
    quantity: row.quantity === null ? undefined : numberValue(row.quantity),
    unit: row.unit || undefined,
    status: row.status,
    createdAt: dateOnly(row.created_at),
    updatedAt: dateOnly(row.updated_at)
  };
}

function mapBlocker(row: SupabaseBlockerRow): BlockerItem {
  return {
    id: row.id,
    projectId: row.project_id,
    projectName: row.projects?.name || "Nincs megadva",
    createdByProfileId: row.created_by_profile_id || "",
    createdByName: row.created_by?.display_name || "Nincs megadva",
    responsibleProfileId: row.responsible_profile_id || undefined,
    responsibleName: row.responsible?.display_name || "Nincs megadva",
    title: row.title,
    description: row.description,
    trade: row.trade || undefined,
    area: row.area || undefined,
    status: row.status,
    severity: row.severity,
    resolutionNote: row.resolution_note || undefined,
    resolvedAt: dateOnly(row.resolved_at),
    createdAt: dateOnly(row.created_at),
    updatedAt: dateOnly(row.updated_at)
  };
}

function mapProjectDocument(row: SupabaseProjectDocumentRow): ProjectDocument {
  return {
    id: row.id,
    projectId: row.project_id,
    projectName: row.projects?.name || "Nincs megadva",
    uploadedByProfileId: row.uploaded_by_profile_id || undefined,
    uploadedByName: row.profiles?.display_name || undefined,
    documentType: row.document_type,
    title: row.title,
    description: row.description || undefined,
    trade: row.trade || undefined,
    area: row.area || undefined,
    storagePath: row.storage_path || undefined,
    fileName: row.file_name || undefined,
    mimeType: row.mime_type || undefined,
    fileSizeBytes: row.file_size_bytes === null ? undefined : numberValue(row.file_size_bytes),
    revision: row.revision || undefined,
    visibility: row.visibility,
    isCurrent: row.is_current,
    archivedAt: dateOnly(row.archived_at),
    createdAt: dateOnly(row.created_at),
    updatedAt: dateOnly(row.updated_at)
  };
}

function logSupabaseReadError(scope: string, error: { message?: string } | null) {
  if (error) {
    console.warn(`Supabase read failed for ${scope}: ${error.message || "unknown error"}`);
  }
}

function logSupabaseWriteError(scope: string, error: { message?: string } | null) {
  if (error) {
    console.warn(`Supabase write failed for ${scope}: ${error.message || "unknown error"}`);
  }
}

function normalizePriority(priority?: Priority) {
  const allowed: Priority[] = ["low", "normal", "high", "critical"];
  return priority && allowed.includes(priority) ? priority : "normal";
}

function nextPublicIssueId(publicIds: string[]) {
  const nextNumber = Math.max(
    100,
    ...publicIds
      .map((id) => Number(id.replace("KIV-", "")))
      .filter((value) => Number.isFinite(value))
  ) + 1;

  return `KIV-${nextNumber}`;
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

async function createSupabaseIssueEvidence(issueId: string, input: CreateIssueEvidenceInput) {
  const issueDbId = await getSupabaseIssueDbId(issueId);
  const supabase = getSupabaseClient();

  if (!issueDbId || !supabase) return null;

  const uploadedAt = new Date().toISOString();
  const evidenceLabel = input.label || (input.type === "before_photo" ? "Előtte fotó metadata" : "Utána fotó metadata");
  let storagePath = `metadata-only/${issueId}/${input.type}/${Date.now()}`;

  if (input.file) {
    const fileExtension = extensionFromMime(input.file.type);
    const fileName = safeStorageFileName(input.file.name, fileExtension);
    storagePath = `issues/${issueId}/${input.type}/${Date.now()}-${fileName}`;

    const fileBody = new Blob([await input.file.arrayBuffer()], {
      type: input.file.type || "application/octet-stream"
    });

    const { error: uploadError } = await supabase.storage
      .from(issueEvidenceBucket)
      .upload(storagePath, fileBody, {
        contentType: input.file.type || "application/octet-stream",
        upsert: false
      });

    logSupabaseWriteError("issue evidence storage", uploadError);

    if (uploadError) return null;
  }

  const { data, error } = await supabase
    .from("issue_evidence")
    .insert({
      issue_id: issueDbId,
      evidence_type: input.type,
      storage_path: storagePath,
      label: evidenceLabel,
      uploaded_at: uploadedAt
    })
    .select("*")
    .single();

  logSupabaseWriteError("issue evidence", error);

  return error || !data ? null : mapEvidence(data as SupabaseEvidenceRow, issueId);
}

export async function createIssueEvidenceRecord(issueId: string, input: CreateIssueEvidenceInput): Promise<CreateIssueEvidenceResult> {
  const supabaseEvidence = await createSupabaseIssueEvidence(issueId, input);

  if (supabaseEvidence) {
    return {
      evidence: supabaseEvidence,
      mode: "supabase"
    };
  }

  return {
    evidence: createMockEvidence(issueId, input),
    mode: "mock"
  };
}

async function deleteSupabaseIssueEvidence(issueId: string, evidenceId: string) {
  const issueDbId = await getSupabaseIssueDbId(issueId);
  const supabase = getSupabaseClient();

  if (!issueDbId || !supabase) return null;

  const { data: evidence, error: lookupError } = await supabase
    .from("issue_evidence")
    .select("id,storage_path")
    .eq("id", evidenceId)
    .eq("issue_id", issueDbId)
    .maybeSingle();

  logSupabaseReadError("issue evidence delete lookup", lookupError);

  if (lookupError || !evidence) return null;

  const { error: deleteError } = await supabase
    .from("issue_evidence")
    .delete()
    .eq("id", evidenceId)
    .eq("issue_id", issueDbId);

  logSupabaseWriteError("issue evidence delete", deleteError);

  if (deleteError) return null;

  const storagePath = typeof evidence.storage_path === "string" ? evidence.storage_path : "";
  if (storagePath.startsWith("issues/")) {
    const { error: storageDeleteError } = await supabase.storage
      .from(issueEvidenceBucket)
      .remove([storagePath]);

    logSupabaseWriteError("issue evidence storage delete", storageDeleteError);
  }

  return true;
}

export async function deleteIssueEvidenceRecord(issueId: string, evidenceId: string): Promise<DeleteIssueEvidenceResult> {
  const supabaseDeleted = await deleteSupabaseIssueEvidence(issueId, evidenceId);

  if (supabaseDeleted) {
    return {
      ok: true,
      mode: "supabase"
    };
  }

  if (getSupabaseClient()) {
    return {
      ok: false,
      mode: "mock"
    };
  }

  return {
    ok: true,
    mode: "mock"
  };
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

export async function listWorkLogs() {
  const supabase = getSupabaseClient();
  if (!supabase) return mockWorkLogs;

  const { data, error } = await supabase
    .from("work_logs")
    .select("*,projects(name),profiles(display_name)")
    .order("work_date", { ascending: false })
    .order("created_at", { ascending: false });

  logSupabaseReadError("work_logs", error);

  const rows = data as SupabaseWorkLogRow[] | null;
  if (error) return mockWorkLogs;
  return rows?.length ? rows.map(mapWorkLog) : mockWorkLogs;
}

export async function listProjectDocuments() {
  const supabase = getSupabaseClient();
  if (!supabase) return mockProjectDocuments;

  const { data, error } = await supabase
    .from("project_documents")
    .select("*,projects(name),profiles(display_name)")
    .order("is_current", { ascending: false })
    .order("created_at", { ascending: false });

  logSupabaseReadError("project_documents", error);

  const rows = data as SupabaseProjectDocumentRow[] | null;
  if (error) return mockProjectDocuments;
  return rows?.length ? rows.map(mapProjectDocument) : mockProjectDocuments;
}

export async function listActiveBlockers() {
  const activeStatuses: BlockerStatus[] = ["open", "in_progress", "waiting_external"];
  const fallback = mockBlockerItems.filter((blocker) => activeStatuses.includes(blocker.status));
  const supabase = getSupabaseClient();
  if (!supabase) return fallback;

  const { data, error } = await supabase
    .from("blocker_list")
    .select("*")
    .in("status", activeStatuses)
    .order("created_at", { ascending: false });

  logSupabaseReadError("blocker_list", error);

  const rows = data as SupabaseBlockerRow[] | null;
  if (error) return fallback;
  if (!rows?.length) return fallback;

  const [{ data: projects, error: projectError }, { data: profiles, error: profileError }] = await Promise.all([
    supabase.from("projects").select("id,name"),
    supabase.from("profiles").select("id,display_name")
  ]);

  logSupabaseReadError("projects for blocker_list", projectError);
  logSupabaseReadError("profiles for blocker_list", profileError);

  const projectNames = new Map((projects || []).map((project) => [project.id, project.name]));
  const profileNames = new Map((profiles || []).map((profile) => [profile.id, profile.display_name]));

  return rows.map((row) => mapBlocker({
    ...row,
    projects: { name: projectNames.get(row.project_id) || null },
    created_by: { display_name: row.created_by_profile_id ? profileNames.get(row.created_by_profile_id) || null : null },
    responsible: { display_name: row.responsible_profile_id ? profileNames.get(row.responsible_profile_id) || null : null }
  }));
}

function normalizeBlockerSeverity(severity?: BlockerSeverity) {
  const allowed: BlockerSeverity[] = ["low", "normal", "high", "critical"];
  return severity && allowed.includes(severity) ? severity : "normal";
}

function createMockBlocker(input: CreateBlockerInput): BlockerItem {
  const today = new Date().toISOString().slice(0, 10);

  return {
    id: `mock-blocker-${Date.now()}`,
    projectId: mockProject.id,
    projectName: mockProject.name,
    createdByProfileId: "mock-user",
    createdByName: "Mock fallback",
    responsibleName: input.responsibleName || "Nincs megadva",
    title: input.title,
    description: input.description,
    trade: input.trade || undefined,
    area: input.area || undefined,
    status: "open",
    severity: normalizeBlockerSeverity(input.severity),
    createdAt: today,
    updatedAt: today
  };
}

async function createSupabaseBlocker(input: CreateBlockerInput): Promise<BlockerItem | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  const { data: projects, error: projectError } = await supabase
    .from("projects")
    .select("id,name")
    .order("created_at", { ascending: true })
    .limit(1);

  logSupabaseReadError("projects for blocker insert", projectError);

  if (projectError || !projects?.length) return null;

  const project = projects[0];
  const responsibleResult = input.responsibleName
    ? await supabase
        .from("profiles")
        .select("id,display_name")
        .eq("display_name", input.responsibleName)
        .maybeSingle()
    : null;

  logSupabaseReadError("profiles for blocker insert", responsibleResult?.error || null);

  const responsible = responsibleResult?.error ? null : responsibleResult?.data || null;

  const { data, error } = await supabase
    .from("blocker_list")
    .insert({
      project_id: project.id,
      responsible_profile_id: responsible?.id || null,
      title: input.title,
      description: input.description,
      trade: input.trade || null,
      area: input.area || null,
      status: "open",
      severity: normalizeBlockerSeverity(input.severity)
    });

  logSupabaseWriteError("blocker_list", error);

  if (error) return null;

  const today = new Date().toISOString().slice(0, 10);
  return {
    id: `supabase-blocker-${Date.now()}`,
    projectId: project.id,
    projectName: project.name,
    createdByProfileId: "",
    createdByName: "Supabase",
    responsibleProfileId: responsible?.id || undefined,
    responsibleName: responsible?.display_name || input.responsibleName || "Nincs megadva",
    title: input.title,
    description: input.description,
    trade: input.trade || undefined,
    area: input.area || undefined,
    status: "open",
    severity: normalizeBlockerSeverity(input.severity),
    createdAt: today,
    updatedAt: today
  };
}

export async function createBlockerRecord(input: CreateBlockerInput): Promise<CreateBlockerResult> {
  const supabaseBlocker = await createSupabaseBlocker(input);

  if (supabaseBlocker) {
    return {
      blocker: supabaseBlocker,
      mode: "supabase"
    };
  }

  return {
    blocker: createMockBlocker(input),
    mode: "mock"
  };
}

async function createSupabaseIssue(input: CreateIssueInput) {
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  const [{ data: projects, error: projectError }, { data: subcontractors, error: subcontractorError }, { data: existingIssues, error: issueIdError }] = await Promise.all([
    supabase.from("projects").select("id,name").order("created_at", { ascending: true }),
    supabase.from("subcontractors").select("id,name").order("created_at", { ascending: true }),
    supabase.from("issues").select("public_id")
  ]);

  logSupabaseReadError("projects for issue insert", projectError);
  logSupabaseReadError("subcontractors for issue insert", subcontractorError);
  logSupabaseReadError("issue public ids for issue insert", issueIdError);

  if (projectError || subcontractorError || issueIdError || !projects?.length) {
    return null;
  }

  const project = projects.find((item) => item.name === input.project) || projects[0];
  const subcontractor = subcontractors?.find((item) => item.name === input.subcontractor) || subcontractors?.[0] || null;
  const publicId = nextPublicIssueId((existingIssues || []).map((issue) => issue.public_id));

  const { data, error } = await supabase
    .from("issues")
    .insert({
      public_id: publicId,
      project_id: project.id,
      subcontractor_id: subcontractor?.id || null,
      title: input.title,
      description: input.description || "",
      location: input.location,
      area: input.area || "Nincs megadva",
      trade: input.trade || "Nincs megadva",
      assignee_name: input.assignee || subcontractor?.name || "Nincs megadva",
      due_date: input.dueDate,
      status: "open",
      priority: normalizePriority(input.priority),
      value_huf: input.valueHuf || 0
    })
    .select("*,subcontractors(name),issue_evidence(evidence_type)")
    .single();

  logSupabaseWriteError("issues", error);

  return error || !data ? null : mapIssue(data as SupabaseIssueRow);
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

export async function createIssueRecord(input: CreateIssueInput): Promise<CreateIssueResult> {
  const supabaseIssue = await createSupabaseIssue(input);

  if (supabaseIssue) {
    return {
      issue: supabaseIssue,
      mode: "supabase"
    };
  }

  return {
    issue: createIssue(input),
    mode: "mock"
  };
}

export function moveIssueStatus(issue: Issue, targetStatus: IssueStatus): MoveIssueStatusResult {
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
    },
    mode: "mock"
  };
}

async function updateSupabaseIssueStatus(issue: Issue, targetStatus: IssueStatus) {
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  const issueDbId = await getSupabaseIssueDbId(issue.id);
  if (!issueDbId) return null;

  const { data, error } = await supabase
    .from("issues")
    .update({
      status: targetStatus,
      updated_at: new Date().toISOString()
    })
    .eq("id", issueDbId)
    .select("*,subcontractors(name),issue_evidence(evidence_type)")
    .single();

  logSupabaseWriteError("issue status", error);

  return error || !data ? null : {
    issue: mapIssue(data as SupabaseIssueRow),
    issueDbId
  };
}

async function createSupabaseStatusEvent(issue: Issue, issueDbId: string, targetStatus: IssueStatus) {
  const supabase = getSupabaseClient();
  if (!supabase) return false;

  const { error } = await supabase
    .from("issue_events")
    .insert({
      issue_id: issueDbId,
      event_type: "status_changed",
      from_status: issue.status,
      to_status: targetStatus,
      title: "Státuszváltás rögzítve",
      description: `${issueStatusLabels[issue.status]} → ${issueStatusLabels[targetStatus]}`
    });

  logSupabaseWriteError("issue status event", error);

  return !error;
}

export async function moveIssueStatusRecord(issue: Issue, targetStatus: IssueStatus): Promise<MoveIssueStatusResult> {
  if (!canMoveIssue(issue, targetStatus, "project_manager")) {
    return {
      ok: false,
      error: `Nem engedélyezett státuszváltás: ${issue.status} → ${targetStatus}`
    };
  }

  const supabaseResult = await updateSupabaseIssueStatus(issue, targetStatus);

  if (supabaseResult) {
    await createSupabaseStatusEvent(issue, supabaseResult.issueDbId, targetStatus);

    return {
      ok: true,
      issue: supabaseResult.issue,
      mode: "supabase"
    };
  }

  return moveIssueStatus(issue, targetStatus);
}
