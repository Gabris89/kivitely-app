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
import type { BlockerItem, BlockerSeverity, BlockerStatus, EvidencePhoto, EvidenceType, Issue, IssueEvent, IssueStatus, PlanMeasurement, PlanMeasurementPoint, PlanMeasurementType, Priority, Project, ProjectDocument, ProjectDocumentType, ProjectDocumentVisibility, Subcontractor, TigItem, TigPackage, WorkLog, WorkLogStatus } from "@/types";
import { canMoveIssue, issueStatusLabels } from "@/lib/workflow";
import { getSupabaseClient } from "@/lib/supabase/client";

export type CreateProjectInput = {
  name: string;
  address?: string;
  client?: string;
  phase?: string;
};

export type CreateProjectResult = {
  project: Project;
  mode: "supabase" | "mock";
};

export type CreateIssueInput = {
  title: string;
  projectId: string;
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

export type UpdateIssueInput = {
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
  status?: IssueStatus;
};

export type UpdateIssueResult = {
  issue: Issue | null;
  mode: "supabase" | "mock";
};

export type CreateBlockerInput = {
  projectId: string;
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

export type UpdateBlockerInput = {
  title: string;
  description: string;
  trade?: string;
  area?: string;
  severity?: BlockerSeverity;
  status: BlockerStatus;
  resolutionNote?: string;
  responsibleName?: string;
};

export type UpdateBlockerResult = {
  blocker: BlockerItem | null;
  mode: "supabase" | "mock";
};

export type DeleteBlockerResult = {
  ok: boolean;
  mode: "supabase" | "mock";
};

export type CreateSubcontractorInput = {
  name: string;
  trade?: string;
  contactName?: string;
  phone?: string;
};

export type CreateSubcontractorResult = {
  subcontractor: Subcontractor;
  mode: "supabase" | "mock";
};

export type UpdateSubcontractorInput = {
  name: string;
  trade?: string;
  contactName?: string;
  phone?: string;
};

export type UpdateSubcontractorResult = {
  subcontractor: Subcontractor | null;
  mode: "supabase" | "mock";
};

export type DeleteSubcontractorResult = {
  ok: boolean;
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

export type DeleteIssueResult = {
  ok: boolean;
  mode: "supabase" | "mock";
};

export type CreateProjectDocumentInput = {
  projectId: string;
  documentType: Extract<ProjectDocumentType, "architectural_plan" | "technical_plan" | "material_spec" | "photo_document" | "other">;
  title: string;
  description?: string;
  trade?: string;
  area?: string;
  revision?: string;
  visibility?: ProjectDocumentVisibility;
  file: File;
  mimeType?: string;
};

export type CreateProjectDocumentResult = {
  document: ProjectDocument;
  mode: "supabase" | "mock";
};

export type DeleteProjectDocumentResult = {
  ok: boolean;
  mode: "supabase" | "mock";
};

export type CreatePlanMeasurementInput = {
  documentId: string;
  pageNumber: number;
  measurementType: PlanMeasurementType;
  points: PlanMeasurementPoint[];
  calculatedValue: number;
  label?: string;
  note?: string;
};

export type CreatePlanMeasurementResult = {
  measurement: PlanMeasurement | null;
  mode: "supabase" | "mock";
};

export type DeletePlanMeasurementResult = {
  ok: boolean;
  mode: "supabase" | "mock";
};

export type UpdatePlanMeasurementInput = {
  measurementId: string;
  points: PlanMeasurementPoint[];
  calculatedValue: number;
  label?: string;
  note?: string;
};

export type SavePlanCalibrationResult = {
  ok: boolean;
  mode: "supabase" | "mock";
};

type SupabaseIssueRow = {
  id: string;
  public_id: string;
  project_id: string;
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
  projects?: { name: string | null; public_id: string | null } | null;
};

type SupabaseProjectRow = {
  id: string;
  public_id: string;
  name: string;
  address: string | null;
  client: string | null;
  phase: string | null;
  progress: number | null;
};

type SupabaseSubcontractorRow = {
  id: string;
  public_id: string;
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
  public_id: string;
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
  projects?: { name: string | null; public_id: string | null } | null;
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

type SupabasePlanMeasurementRow = {
  id: string;
  document_id: string;
  page_number: number;
  measurement_type: PlanMeasurementType;
  points: PlanMeasurementPoint[];
  calculated_value: number;
  label: string | null;
  note: string | null;
  created_by_profile_id: string | null;
  created_at: string;
};

function dateOnly(value?: string | null) {
  return value?.slice(0, 10) || "";
}

function numberValue(value: number | string | null | undefined) {
  return Number(value || 0);
}

const issueEvidenceBucket = "issue-evidence";
const projectDocumentsBucket = "project-documents";

function mapIssue(row: SupabaseIssueRow): Issue {
  const evidence = row.issue_evidence || [];

  return {
    id: row.public_id,
    projectId: row.projects?.public_id || "",
    projectName: row.projects?.name || "Nincs megadva",
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
    publicId: row.public_id,
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
    publicId: row.public_id,
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

function getProjectDocumentPublicUrl(storagePath?: string | null) {
  const supabase = getSupabaseClient();
  if (!supabase || !storagePath?.startsWith("projects/")) return undefined;

  return supabase.storage.from(projectDocumentsBucket).getPublicUrl(storagePath).data.publicUrl;
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
  if (type === "application/pdf") return "pdf";
  if (type === "image/png") return "png";
  if (type === "image/webp") return "webp";
  if (type === "image/heic") return "heic";
  if (type === "image/heif") return "heif";
  if (type === "text/plain") return "txt";
  if (type === "application/msword") return "doc";
  if (type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") return "docx";
  if (type === "application/vnd.ms-excel") return "xls";
  if (type === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet") return "xlsx";
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
    publicId: row.public_id,
    projectId: row.projects?.public_id || "",
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
    url: getProjectDocumentPublicUrl(row.storage_path),
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

function mapPlanMeasurement(row: SupabasePlanMeasurementRow): PlanMeasurement {
  return {
    id: row.id,
    documentId: row.document_id,
    pageNumber: row.page_number,
    measurementType: row.measurement_type,
    points: row.points,
    calculatedValue: row.calculated_value,
    label: row.label || undefined,
    note: row.note || undefined,
    createdByProfileId: row.created_by_profile_id || undefined,
    createdAt: row.created_at
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
      .map((id) => Number(id.replace("HIB-", "")))
      .filter((value) => Number.isFinite(value))
  ) + 1;

  return `HIB-${nextNumber}`;
}

async function listSupabaseIssues(projectId?: string) {
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  let query = supabase
    .from("issues")
    .select("*,subcontractors(name),issue_evidence(evidence_type),projects(name,public_id)")
    .order("updated_at", { ascending: false });

  if (projectId) {
    const projectDbId = await getSupabaseProjectDbId(projectId);
    if (!projectDbId) return [];
    query = query.eq("project_id", projectDbId);
  }

  const { data, error } = await query;

  logSupabaseReadError("issues", error);

  if (error) return null;
  const rows = (data as SupabaseIssueRow[] | null) || [];
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

export async function listProjects() {
  const supabase = getSupabaseClient();
  if (!supabase) return [mockProject];

  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .order("created_at", { ascending: true });

  logSupabaseReadError("projects list", error);

  const rows = data as SupabaseProjectRow[] | null;
  if (error || !rows?.length) return [mockProject];
  return rows.map(mapProject);
}

export async function getProjectByPublicId(publicId: string) {
  const supabase = getSupabaseClient();
  if (!supabase) return publicId === mockProject.publicId ? mockProject : null;

  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("public_id", publicId)
    .maybeSingle();

  logSupabaseReadError("project by public id", error);

  return !error && data ? mapProject(data as SupabaseProjectRow) : null;
}

async function getSupabaseProjectDbId(publicId: string) {
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("projects")
    .select("id")
    .eq("public_id", publicId)
    .maybeSingle();

  logSupabaseReadError("project id lookup", error);

  return error ? null : data?.id || null;
}

function nextPublicProjectId(publicIds: string[]) {
  const nextNumber = Math.max(
    0,
    ...publicIds
      .map((id) => Number(id.replace("PRJ-", "")))
      .filter((value) => Number.isFinite(value))
  ) + 1;

  return `PRJ-${String(nextNumber).padStart(3, "0")}`;
}

function createMockProjectRecord(input: CreateProjectInput): Project {
  return {
    id: `mock-project-${Date.now()}`,
    publicId: `PRJ-M${String(Date.now()).slice(-3)}`,
    name: input.name,
    address: input.address || "",
    client: input.client || "",
    phase: input.phase || "Tervezés",
    progress: 0
  };
}

async function createSupabaseProject(input: CreateProjectInput) {
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  const { data: existingProjects, error: existingError } = await supabase
    .from("projects")
    .select("public_id");

  logSupabaseReadError("project public ids for insert", existingError);

  if (existingError) return null;

  const publicId = nextPublicProjectId((existingProjects || []).map((row) => row.public_id));

  const { data, error } = await supabase
    .from("projects")
    .insert({
      public_id: publicId,
      name: input.name,
      address: input.address || null,
      client: input.client || null,
      phase: input.phase || null,
      progress: 0
    })
    .select("*")
    .single();

  logSupabaseWriteError("projects", error);

  return error || !data ? null : mapProject(data as SupabaseProjectRow);
}

export async function createProjectRecord(input: CreateProjectInput): Promise<CreateProjectResult> {
  const supabaseProject = await createSupabaseProject(input);

  if (supabaseProject) {
    return {
      project: supabaseProject,
      mode: "supabase"
    };
  }

  return {
    project: createMockProjectRecord(input),
    mode: "mock"
  };
}

export async function listIssues(projectId?: string) {
  return (await listSupabaseIssues(projectId)) || mockIssues;
}

export async function getIssue(id: string, projectId?: string) {
  const issues = await listIssues(projectId);
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

export async function getSubcontractorByPublicId(publicId: string) {
  const subcontractors = await listSubcontractors();
  return subcontractors.find((subcontractor) => subcontractor.publicId === publicId);
}

async function getSupabaseSubcontractorDbId(publicId: string) {
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("subcontractors")
    .select("id")
    .eq("public_id", publicId)
    .maybeSingle();

  logSupabaseReadError("subcontractor id lookup", error);

  return error ? null : data?.id || null;
}

function nextPublicSubcontractorId(publicIds: string[]) {
  const nextNumber = Math.max(
    0,
    ...publicIds
      .map((id) => Number(id.replace("ALV-", "")))
      .filter((value) => Number.isFinite(value))
  ) + 1;

  return `ALV-${String(nextNumber).padStart(3, "0")}`;
}

function createMockSubcontractor(input: CreateSubcontractorInput): Subcontractor {
  return {
    id: `mock-subcontractor-${Date.now()}`,
    publicId: `ALV-M${String(Date.now()).slice(-3)}`,
    name: input.name,
    trade: input.trade || "Nincs megadva",
    contact: input.contactName || "Nincs megadva",
    phone: input.phone || "",
    openIssues: 0,
    overdueIssues: 0,
    readyIssues: 0,
    weeklyClosureRate: 0
  };
}

async function createSupabaseSubcontractor(input: CreateSubcontractorInput) {
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  const { data: existing, error: existingError } = await supabase
    .from("subcontractors")
    .select("public_id");

  logSupabaseReadError("subcontractor public ids for insert", existingError);

  if (existingError) return null;

  const publicId = nextPublicSubcontractorId((existing || []).map((row) => row.public_id));

  const { data, error } = await supabase
    .from("subcontractors")
    .insert({
      public_id: publicId,
      name: input.name,
      trade: input.trade || null,
      contact_name: input.contactName || null,
      phone: input.phone || null
    })
    .select("*")
    .single();

  logSupabaseWriteError("subcontractors", error);

  return error || !data ? null : mapSubcontractor(data as SupabaseSubcontractorRow, []);
}

export async function createSubcontractorRecord(input: CreateSubcontractorInput): Promise<CreateSubcontractorResult> {
  const supabaseSubcontractor = await createSupabaseSubcontractor(input);

  if (supabaseSubcontractor) {
    return {
      subcontractor: supabaseSubcontractor,
      mode: "supabase"
    };
  }

  return {
    subcontractor: createMockSubcontractor(input),
    mode: "mock"
  };
}

async function updateSupabaseSubcontractor(publicId: string, input: UpdateSubcontractorInput) {
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("subcontractors")
    .update({
      name: input.name,
      trade: input.trade || null,
      contact_name: input.contactName || null,
      phone: input.phone || null
    })
    .eq("public_id", publicId)
    .select("*")
    .maybeSingle();

  logSupabaseWriteError("subcontractor update", error);

  if (error || !data) return null;
  return mapSubcontractor(data as SupabaseSubcontractorRow, await listIssues());
}

export async function updateSubcontractorRecord(publicId: string, input: UpdateSubcontractorInput): Promise<UpdateSubcontractorResult> {
  const updated = await updateSupabaseSubcontractor(publicId, input);

  if (updated) {
    return {
      subcontractor: updated,
      mode: "supabase"
    };
  }

  return {
    subcontractor: null,
    mode: "mock"
  };
}

async function deleteSupabaseSubcontractor(publicId: string) {
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  const subcontractorDbId = await getSupabaseSubcontractorDbId(publicId);
  if (!subcontractorDbId) return null;

  const { error } = await supabase.from("subcontractors").delete().eq("id", subcontractorDbId);

  logSupabaseWriteError("subcontractor delete", error);

  return error ? null : true;
}

export async function deleteSubcontractorRecord(publicId: string): Promise<DeleteSubcontractorResult> {
  const supabaseDeleted = await deleteSupabaseSubcontractor(publicId);

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

export function listTigItems(): TigItem[] {
  return mockTigItems;
}

export async function listTigPackages(projectId: string) {
  const supabase = getSupabaseClient();
  if (!supabase) return mockTigPackages;

  const projectDbId = await getSupabaseProjectDbId(projectId);
  if (!projectDbId) return [];

  const { data, error } = await supabase
    .from("tig_packages")
    .select("*,subcontractors(name),tig_package_issues(issue_id)")
    .eq("project_id", projectDbId)
    .order("updated_at", { ascending: false });

  logSupabaseReadError("tig_packages", error);

  if (error) return mockTigPackages;
  const rows = (data as SupabaseTigPackageRow[] | null) || [];
  return rows.map(mapTigPackage);
}

export async function listWorkLogs(projectId: string) {
  const supabase = getSupabaseClient();
  if (!supabase) return mockWorkLogs;

  const projectDbId = await getSupabaseProjectDbId(projectId);
  if (!projectDbId) return [];

  const { data, error } = await supabase
    .from("work_logs")
    .select("*,projects(name),profiles(display_name)")
    .eq("project_id", projectDbId)
    .order("work_date", { ascending: false })
    .order("created_at", { ascending: false });

  logSupabaseReadError("work_logs", error);

  if (error) return mockWorkLogs;
  const rows = (data as SupabaseWorkLogRow[] | null) || [];
  return rows.map(mapWorkLog);
}

export async function listProjectDocuments(projectId: string) {
  const supabase = getSupabaseClient();
  if (!supabase) return mockProjectDocuments;

  const projectDbId = await getSupabaseProjectDbId(projectId);
  if (!projectDbId) return [];

  const { data, error } = await supabase
    .from("project_documents")
    .select("*,projects(name),profiles(display_name)")
    .eq("project_id", projectDbId)
    .order("is_current", { ascending: false })
    .order("created_at", { ascending: false });

  logSupabaseReadError("project_documents", error);

  if (error) return mockProjectDocuments;
  const rows = (data as SupabaseProjectDocumentRow[] | null) || [];
  return rows.map(mapProjectDocument);
}

function createMockProjectDocument(input: CreateProjectDocumentInput, projectData: Project): ProjectDocument {
  const now = new Date().toISOString();
  const mimeType = input.mimeType || input.file.type || "application/octet-stream";
  const fileExtension = extensionFromMime(mimeType);
  const fileName = safeStorageFileName(input.file.name, fileExtension);

  return {
    id: `mock-project-document-${Date.now()}`,
    projectId: projectData.id,
    projectName: projectData.name,
    documentType: input.documentType,
    title: input.title,
    description: input.description || undefined,
    trade: input.trade || undefined,
    area: input.area || undefined,
    storagePath: `mock/project-documents/${fileName}`,
    fileName,
    mimeType,
    fileSizeBytes: input.file.size,
    revision: input.revision || undefined,
    visibility: input.visibility || "project_team",
    isCurrent: true,
    createdAt: now,
    updatedAt: now
  };
}

async function createSupabaseProjectDocument(input: CreateProjectDocumentInput) {
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  const projectData = await getProjectByPublicId(input.projectId);
  if (!projectData) return null;

  const mimeType = input.mimeType || input.file.type || "application/octet-stream";
  const fileExtension = extensionFromMime(mimeType);
  const fileName = safeStorageFileName(input.file.name, fileExtension);
  const storagePath = `projects/${projectData.id}/${input.documentType}/${Date.now()}-${fileName}`;
  const fileBody = new Blob([await input.file.arrayBuffer()], {
    type: mimeType
  });

  const { error: uploadError } = await supabase.storage
    .from(projectDocumentsBucket)
    .upload(storagePath, fileBody, {
      contentType: mimeType,
      upsert: false
    });

  logSupabaseWriteError("project documents storage", uploadError);

  if (uploadError) return null;

  const { error } = await supabase
    .from("project_documents")
    .insert({
      project_id: projectData.id,
      document_type: input.documentType,
      title: input.title,
      description: input.description || null,
      trade: input.trade || null,
      area: input.area || null,
      storage_path: storagePath,
      file_name: fileName,
      mime_type: mimeType,
      file_size_bytes: input.file.size,
      revision: input.revision || null,
      visibility: input.visibility || "project_team",
      is_current: true
    });

  logSupabaseWriteError("project_documents", error);

  if (error) {
    await supabase.storage.from(projectDocumentsBucket).remove([storagePath]);
    return null;
  }

  const now = new Date().toISOString();

  return {
    id: `supabase-project-document-${Date.now()}`,
    projectId: projectData.id,
    projectName: projectData.name,
    documentType: input.documentType,
    title: input.title,
    description: input.description || undefined,
    trade: input.trade || undefined,
    area: input.area || undefined,
    storagePath,
    fileName,
    mimeType,
    fileSizeBytes: input.file.size,
    revision: input.revision || undefined,
    visibility: input.visibility || "project_team",
    isCurrent: true,
    createdAt: now,
    updatedAt: now,
    url: getProjectDocumentPublicUrl(storagePath)
  };
}

export async function createProjectDocumentRecord(input: CreateProjectDocumentInput): Promise<CreateProjectDocumentResult> {
  const projectData = (await getProjectByPublicId(input.projectId)) || mockProject;
  const supabaseDocument = await createSupabaseProjectDocument(input);

  if (supabaseDocument) {
    return {
      document: supabaseDocument,
      mode: "supabase"
    };
  }

  return {
    document: createMockProjectDocument(input, projectData),
    mode: "mock"
  };
}

async function deleteSupabaseProjectDocument(documentId: string) {
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  const { data: document, error: lookupError } = await supabase
    .from("project_documents")
    .select("id,storage_path")
    .eq("id", documentId)
    .maybeSingle();

  logSupabaseReadError("project document delete lookup", lookupError);

  if (lookupError || !document) return null;

  const { error: deleteError } = await supabase.from("project_documents").delete().eq("id", documentId);

  logSupabaseWriteError("project document delete", deleteError);

  if (deleteError) return null;

  const storagePath = typeof document.storage_path === "string" ? document.storage_path : "";
  if (storagePath.startsWith("projects/")) {
    const { error: storageDeleteError } = await supabase.storage.from(projectDocumentsBucket).remove([storagePath]);
    logSupabaseWriteError("project document storage delete", storageDeleteError);
  }

  return true;
}

export async function deleteProjectDocumentRecord(documentId: string): Promise<DeleteProjectDocumentResult> {
  const supabaseDeleted = await deleteSupabaseProjectDocument(documentId);

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

export async function listPlanMeasurements(documentId: string): Promise<PlanMeasurement[]> {
  const supabase = getSupabaseClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("plan_measurements")
    .select("*")
    .eq("document_id", documentId)
    .order("created_at", { ascending: false });

  logSupabaseReadError("plan_measurements", error);

  const rows = data as SupabasePlanMeasurementRow[] | null;
  if (error || !rows) return [];
  return rows.map(mapPlanMeasurement);
}

export async function createPlanMeasurementRecord(input: CreatePlanMeasurementInput): Promise<CreatePlanMeasurementResult> {
  const supabase = getSupabaseClient();
  if (!supabase) return { measurement: null, mode: "mock" };

  const { data, error } = await supabase
    .from("plan_measurements")
    .insert({
      document_id: input.documentId,
      page_number: input.pageNumber,
      measurement_type: input.measurementType,
      points: input.points,
      calculated_value: input.calculatedValue,
      label: input.label || null,
      note: input.note || null
    })
    .select("*")
    .single();

  logSupabaseWriteError("plan_measurements", error);

  if (error || !data) return { measurement: null, mode: "mock" };
  return { measurement: mapPlanMeasurement(data as SupabasePlanMeasurementRow), mode: "supabase" };
}

export async function deletePlanMeasurementRecord(measurementId: string): Promise<DeletePlanMeasurementResult> {
  const supabase = getSupabaseClient();
  if (!supabase) return { ok: false, mode: "mock" };

  const { error } = await supabase.from("plan_measurements").delete().eq("id", measurementId);

  logSupabaseWriteError("plan_measurements delete", error);

  return { ok: !error, mode: error ? "mock" : "supabase" };
}

export async function updatePlanMeasurementRecord(input: UpdatePlanMeasurementInput): Promise<CreatePlanMeasurementResult> {
  const supabase = getSupabaseClient();
  if (!supabase) return { measurement: null, mode: "mock" };

  const { data, error } = await supabase
    .from("plan_measurements")
    .update({
      points: input.points,
      calculated_value: input.calculatedValue,
      label: input.label || null,
      note: input.note || null
    })
    .eq("id", input.measurementId)
    .select("*")
    .single();

  logSupabaseWriteError("plan_measurements update", error);

  if (error || !data) return { measurement: null, mode: "mock" };
  return { measurement: mapPlanMeasurement(data as SupabasePlanMeasurementRow), mode: "supabase" };
}

export async function getPlanCalibration(documentId: string): Promise<number | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("plan_calibrations")
    .select("meters_per_unit")
    .eq("document_id", documentId)
    .maybeSingle();

  logSupabaseReadError("plan_calibrations", error);

  if (error || !data) return null;
  return (data as { meters_per_unit: number }).meters_per_unit;
}

export async function savePlanCalibration(documentId: string, metersPerUnit: number): Promise<SavePlanCalibrationResult> {
  const supabase = getSupabaseClient();
  if (!supabase) return { ok: false, mode: "mock" };

  const { error } = await supabase
    .from("plan_calibrations")
    .upsert({ document_id: documentId, meters_per_unit: metersPerUnit, updated_at: new Date().toISOString() });

  logSupabaseWriteError("plan_calibrations", error);

  return { ok: !error, mode: error ? "mock" : "supabase" };
}

export async function listActiveBlockers(projectId: string) {
  const activeStatuses: BlockerStatus[] = ["open", "in_progress", "waiting_external"];
  const fallback = mockBlockerItems.filter((blocker) => activeStatuses.includes(blocker.status));
  const supabase = getSupabaseClient();
  if (!supabase) return fallback;

  const projectDbId = await getSupabaseProjectDbId(projectId);
  if (!projectDbId) return [];

  const { data, error } = await supabase
    .from("blocker_list")
    .select("*")
    .eq("project_id", projectDbId)
    .in("status", activeStatuses)
    .order("created_at", { ascending: false });

  logSupabaseReadError("blocker_list", error);

  const rows = data as SupabaseBlockerRow[] | null;
  if (error) return fallback;
  if (!rows?.length) return [];

  const withRelations = await attachBlockerRelations(rows);
  return withRelations.map(mapBlocker);
}

export async function listBlockers(projectId?: string) {
  const supabase = getSupabaseClient();
  if (!supabase) return mockBlockerItems;

  let query = supabase.from("blocker_list").select("*").order("created_at", { ascending: false });

  if (projectId) {
    const projectDbId = await getSupabaseProjectDbId(projectId);
    if (!projectDbId) return [];
    query = query.eq("project_id", projectDbId);
  }

  const { data, error } = await query;

  logSupabaseReadError("blocker_list", error);

  if (error) return mockBlockerItems;
  const rows = (data as SupabaseBlockerRow[] | null) || [];
  const withRelations = await attachBlockerRelations(rows);
  return withRelations.map(mapBlocker);
}

export async function getBlockerByPublicId(publicId: string) {
  const blockers = await listBlockers();
  return blockers.find((blocker) => blocker.publicId === publicId);
}

async function getSupabaseBlockerDbId(publicId: string) {
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("blocker_list")
    .select("id")
    .eq("public_id", publicId)
    .maybeSingle();

  logSupabaseReadError("blocker id lookup", error);

  return error ? null : data?.id || null;
}

async function updateSupabaseBlocker(publicId: string, input: UpdateBlockerInput) {
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  const responsibleResult = input.responsibleName
    ? await supabase.from("profiles").select("id,display_name").eq("display_name", input.responsibleName).maybeSingle()
    : null;

  logSupabaseReadError("profiles for blocker update", responsibleResult?.error || null);

  const responsible = responsibleResult?.error ? null : responsibleResult?.data || null;
  const isNewlyResolved = input.status === "resolved" || input.status === "closed";

  const { data, error } = await supabase
    .from("blocker_list")
    .update({
      title: input.title,
      description: input.description,
      trade: input.trade || null,
      area: input.area || null,
      severity: normalizeBlockerSeverity(input.severity),
      status: input.status,
      resolution_note: input.resolutionNote || null,
      resolved_at: isNewlyResolved ? new Date().toISOString() : null,
      responsible_profile_id: responsible?.id || null,
      updated_at: new Date().toISOString()
    })
    .eq("public_id", publicId)
    .select("*")
    .maybeSingle();

  logSupabaseWriteError("blocker update", error);

  if (error || !data) return null;
  const [withRelations] = await attachBlockerRelations([data as SupabaseBlockerRow]);
  return mapBlocker(withRelations);
}

export async function updateBlockerRecord(publicId: string, input: UpdateBlockerInput): Promise<UpdateBlockerResult> {
  const updated = await updateSupabaseBlocker(publicId, input);

  if (updated) {
    return { blocker: updated, mode: "supabase" };
  }

  return { blocker: null, mode: "mock" };
}

async function deleteSupabaseBlocker(publicId: string) {
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  const blockerDbId = await getSupabaseBlockerDbId(publicId);
  if (!blockerDbId) return null;

  const { error } = await supabase.from("blocker_list").delete().eq("id", blockerDbId);

  logSupabaseWriteError("blocker delete", error);

  return error ? null : true;
}

export async function deleteBlockerRecord(publicId: string): Promise<DeleteBlockerResult> {
  const supabaseDeleted = await deleteSupabaseBlocker(publicId);

  if (supabaseDeleted) {
    return { ok: true, mode: "supabase" };
  }

  if (getSupabaseClient()) {
    return { ok: false, mode: "mock" };
  }

  return { ok: true, mode: "mock" };
}

async function attachBlockerRelations(rows: SupabaseBlockerRow[]) {
  const supabase = getSupabaseClient();
  if (!supabase) return rows;

  const [{ data: projects, error: projectError }, { data: profiles, error: profileError }] = await Promise.all([
    supabase.from("projects").select("id,name,public_id"),
    supabase.from("profiles").select("id,display_name")
  ]);

  logSupabaseReadError("projects for blocker_list", projectError);
  logSupabaseReadError("profiles for blocker_list", profileError);

  const projectInfo = new Map((projects || []).map((project) => [project.id, { name: project.name, public_id: project.public_id }]));
  const profileNames = new Map((profiles || []).map((profile) => [profile.id, profile.display_name]));

  return rows.map((row) => ({
    ...row,
    projects: projectInfo.get(row.project_id) || null,
    created_by: { display_name: row.created_by_profile_id ? profileNames.get(row.created_by_profile_id) || null : null },
    responsible: { display_name: row.responsible_profile_id ? profileNames.get(row.responsible_profile_id) || null : null }
  }));
}

function normalizeBlockerSeverity(severity?: BlockerSeverity) {
  const allowed: BlockerSeverity[] = ["low", "normal", "high", "critical"];
  return severity && allowed.includes(severity) ? severity : "normal";
}

function nextPublicBlockerId(publicIds: string[]) {
  const nextNumber = Math.max(
    0,
    ...publicIds
      .map((id) => Number(id.replace("AKA-", "")))
      .filter((value) => Number.isFinite(value))
  ) + 1;

  return `AKA-${String(nextNumber).padStart(3, "0")}`;
}

function createMockBlocker(input: CreateBlockerInput): BlockerItem {
  const today = new Date().toISOString().slice(0, 10);

  return {
    id: `mock-blocker-${Date.now()}`,
    publicId: `AKA-M${String(Date.now()).slice(-3)}`,
    projectId: mockProject.publicId,
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

  const project = await getProjectByPublicId(input.projectId);
  if (!project) return null;

  const responsibleResult = input.responsibleName
    ? await supabase
        .from("profiles")
        .select("id,display_name")
        .eq("display_name", input.responsibleName)
        .maybeSingle()
    : null;

  logSupabaseReadError("profiles for blocker insert", responsibleResult?.error || null);

  const responsible = responsibleResult?.error ? null : responsibleResult?.data || null;

  const { data: existingBlockers, error: existingError } = await supabase
    .from("blocker_list")
    .select("public_id");

  logSupabaseReadError("blocker public ids for insert", existingError);

  if (existingError) return null;

  const publicId = nextPublicBlockerId((existingBlockers || []).map((row) => row.public_id));

  const { data, error } = await supabase
    .from("blocker_list")
    .insert({
      public_id: publicId,
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
    publicId,
    projectId: project.publicId,
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

  const [projectDbId, { data: subcontractors, error: subcontractorError }, { data: existingIssues, error: issueIdError }] = await Promise.all([
    getSupabaseProjectDbId(input.projectId),
    supabase.from("subcontractors").select("id,name").order("created_at", { ascending: true }),
    supabase.from("issues").select("public_id")
  ]);

  logSupabaseReadError("subcontractors for issue insert", subcontractorError);
  logSupabaseReadError("issue public ids for issue insert", issueIdError);

  if (!projectDbId || subcontractorError || issueIdError) {
    return null;
  }

  const subcontractor = subcontractors?.find((item) => item.name === input.subcontractor) || subcontractors?.[0] || null;
  const publicId = nextPublicIssueId((existingIssues || []).map((issue) => issue.public_id));

  const { data, error } = await supabase
    .from("issues")
    .insert({
      public_id: publicId,
      project_id: projectDbId,
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
    .select("*,subcontractors(name),issue_evidence(evidence_type),projects(name,public_id)")
    .single();

  logSupabaseWriteError("issues", error);

  return error || !data ? null : mapIssue(data as SupabaseIssueRow);
}

export function createIssue(input: CreateIssueInput): Issue {
  const nextNumber = Math.max(...mockIssues.map((issue) => Number(issue.id.replace("HIB-", "")))) + 1;
  const today = new Date().toISOString().slice(0, 10);

  return {
    id: `HIB-${nextNumber}`,
    projectId: input.projectId,
    projectName: mockProject.name,
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

async function updateSupabaseIssue(publicId: string, input: UpdateIssueInput): Promise<Issue | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  const currentIssue = await getIssue(publicId);
  if (!currentIssue) return null;

  const issueDbId = await getSupabaseIssueDbId(publicId);
  if (!issueDbId) return null;

  const { data: subcontractors, error: subcontractorError } = await supabase
    .from("subcontractors")
    .select("id,name");

  logSupabaseReadError("subcontractors for issue update", subcontractorError);

  const subcontractor = subcontractors?.find((item) => item.name === input.subcontractor) || null;
  const targetStatus = input.status && canMoveIssue(currentIssue, input.status) ? input.status : currentIssue.status;

  const { data, error } = await supabase
    .from("issues")
    .update({
      title: input.title,
      description: input.description || "",
      location: input.location,
      area: input.area || "Nincs megadva",
      trade: input.trade || "Nincs megadva",
      subcontractor_id: subcontractor?.id || null,
      assignee_name: input.assignee || subcontractor?.name || "Nincs megadva",
      due_date: input.dueDate,
      priority: normalizePriority(input.priority),
      value_huf: input.valueHuf || 0,
      status: targetStatus,
      updated_at: new Date().toISOString()
    })
    .eq("id", issueDbId)
    .select("*,subcontractors(name),issue_evidence(evidence_type),projects(name,public_id)")
    .single();

  logSupabaseWriteError("issue update", error);

  if (error || !data) return null;

  if (targetStatus !== currentIssue.status) {
    await createSupabaseStatusEvent(currentIssue, issueDbId, targetStatus);
  }

  return mapIssue(data as SupabaseIssueRow);
}

export async function updateIssueRecord(publicId: string, input: UpdateIssueInput): Promise<UpdateIssueResult> {
  const updated = await updateSupabaseIssue(publicId, input);

  if (updated) {
    return { issue: updated, mode: "supabase" };
  }

  return { issue: null, mode: "mock" };
}

async function deleteSupabaseIssue(publicId: string) {
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  const issueDbId = await getSupabaseIssueDbId(publicId);
  if (!issueDbId) return null;

  const { error } = await supabase.from("issues").delete().eq("id", issueDbId);

  logSupabaseWriteError("issue delete", error);

  return error ? null : true;
}

export async function deleteIssueRecord(publicId: string): Promise<DeleteIssueResult> {
  const supabaseDeleted = await deleteSupabaseIssue(publicId);

  if (supabaseDeleted) {
    return { ok: true, mode: "supabase" };
  }

  if (getSupabaseClient()) {
    return { ok: false, mode: "mock" };
  }

  return { ok: true, mode: "mock" };
}

