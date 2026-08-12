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
import type { BlockerItem, BlockerSeverity, BlockerStatus, EvidencePhoto, EvidenceType, Issue, IssueEvent, IssueStatus, PlanAnalysis, PlanAnalysisResult, PlanCalculationType, PlanMeasurement, PlanMeasurementPoint, PlanMeasurementType, PlanSelectionRect, Priority, Project, ProjectDocument, ProjectDocumentType, ProjectDocumentVisibility, Subcontractor, TigItem, TigPackage, WorkLog, WorkLogStatus } from "@/types";
import { canMoveIssue, isBackwardTransition, issueStatusLabels } from "@/lib/workflow";
import { getCurrentUser, getCurrentWorkflowRole } from "@/lib/currentUser";
import { canEditBlocker, workflowRoleLabels } from "@/lib/permissions";
import { ForbiddenError, PermissionError, hasPermission, requirePermission } from "@/lib/permissions.server";
import { getSupabaseClient } from "@/lib/supabase/client";
import { getServerSupabaseClient, isAuthConfigured } from "@/lib/supabase/server";
import { getVisibilityScope, isEmptyScope, scopeAllowsProject } from "@/lib/visibility";

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

export type UpdateProjectInput = {
  name: string;
  address?: string;
  client?: string;
  phase?: string;
  progress?: number;
};

export type UpdateProjectResult = {
  project: Project | null;
  mode: "supabase" | "mock";
};

export type DeleteProjectResult = {
  ok: boolean;
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
  /** Visszalepesnel (isBackwardTransition) kotelezo indok. Az idovonalra kerul,
      hogy ne csak az latszodjon, hogy valaki visszavont, hanem az is, miert. */
  statusNote?: string;
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

export type CreatePlanAnalysisInput = {
  documentId: string;
  pageNumber: number;
  selection: PlanSelectionRect;
  calculationType: PlanCalculationType;
  result: PlanAnalysisResult;
  confidence: number;
  userVerified?: boolean;
};

export type CreatePlanAnalysisResult = {
  analysis: PlanAnalysis | null;
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
  net_value_huf: number | string | null;
  performance_date: string | null;
  period_start: string | null;
  period_end: string | null;
  note: string | null;
  created_at: string;
  updated_at: string;
  subcontractors?: { name: string | null } | null;
  projects?: { public_id: string | null; name: string | null } | null;
  tig_package_issues?: {
    issue_id: string;
    issues?: { public_id: string | null; issue_evidence?: { evidence_type: string }[] | null } | null;
  }[] | null;
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

type SupabasePlanAnalysisRow = {
  id: string;
  document_id: string;
  page_number: number;
  selection: PlanSelectionRect;
  calculation_type: PlanCalculationType;
  result: PlanAnalysisResult;
  confidence: number | string;
  user_verified: boolean;
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
  // Publikus URL összeállítása – csak string-építés, nem igényel auth-ot (a
  // bucket publikus olvasásra), ezért marad az anon kliens.
  const anonClient = getSupabaseClient();
  if (!anonClient || !storagePath?.startsWith("issues/")) return undefined;

  return anonClient.storage.from(issueEvidenceBucket).getPublicUrl(storagePath).data.publicUrl;
}

function getProjectDocumentPublicUrl(storagePath?: string | null) {
  // Lásd fent: publikus URL, marad az anon kliens.
  const anonClient = getSupabaseClient();
  if (!anonClient || !storagePath?.startsWith("projects/")) return undefined;

  return anonClient.storage.from(projectDocumentsBucket).getPublicUrl(storagePath).data.publicUrl;
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
  const links = row.tig_package_issues || [];
  // proofCount SZÁRMAZTATOTT: a kapcsolt hibákhoz tartozó bizonyítékok (fotók)
  // összege – nem tárolt fix érték.
  const proofCount = links.reduce((sum, link) => sum + (link.issues?.issue_evidence?.length || 0), 0);

  return {
    id: row.public_id,
    // A publikus projektazonosító (PRJ-xxx), ha a join elérhető – így a csomag
    // ugyanazon a kulcson köthető projekthez, mint az Issue/BlockerItem.
    // Fallback a nyers UUID-ra, hogy a mező soha ne legyen üres.
    projectId: row.projects?.public_id || row.project_id,
    projectName: row.projects?.name || undefined,
    subcontractor: row.subcontractors?.name || "Nincs megadva",
    status: row.status,
    issueIds: links.map((item) => item.issues?.public_id || item.issue_id),
    grossValueHuf: numberValue(row.gross_value_huf),
    netValueHuf: numberValue(row.net_value_huf),
    proofCount,
    performanceDate: row.performance_date || undefined,
    periodStart: row.period_start || undefined,
    periodEnd: row.period_end || undefined,
    note: row.note || undefined,
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

function mapPlanAnalysis(row: SupabasePlanAnalysisRow): PlanAnalysis {
  return {
    id: row.id,
    documentId: row.document_id,
    pageNumber: row.page_number,
    selection: row.selection,
    calculationType: row.calculation_type,
    result: row.result,
    confidence: Number(row.confidence),
    userVerified: row.user_verified,
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
  const supabase = await getServerSupabaseClient();
  if (!supabase) return null;

  // 3. lepcso: a bejelentkezett felhasznalo latasi kore (src/lib/visibility.ts).
  const scope = await getVisibilityScope();
  if (isEmptyScope(scope)) return [];

  let query = supabase
    .from("issues")
    .select("*,subcontractors(name),issue_evidence(evidence_type),projects(name,public_id)")
    .order("updated_at", { ascending: false });

  if (projectId) {
    // getSupabaseProjectDbId hatokor-tudatos: a koron kivuli projektre null.
    const projectDbId = await getSupabaseProjectDbId(projectId);
    if (!projectDbId) return [];
    query = query.eq("project_id", projectDbId);
  } else if (scope.projectIds) {
    query = query.in("project_id", scope.projectIds);
  }

  // Alvallalkozo: a sajat projektjein belul is CSAK a sajat cege hibai.
  if (scope.subcontractorId) {
    query = query.eq("subcontractor_id", scope.subcontractorId);
  }

  const { data, error } = await query;

  logSupabaseReadError("issues", error);

  if (error) return null;
  const rows = (data as SupabaseIssueRow[] | null) || [];
  return rows.map(mapIssue);
}

async function getSupabaseIssueDbId(publicId: string) {
  const supabase = await getServerSupabaseClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("issues")
    .select("id,project_id,subcontractor_id")
    .eq("public_id", publicId)
    .maybeSingle();

  logSupabaseReadError("issue id lookup", error);

  if (error || !data) return null;

  // Masodik fojtopont, a projekt-oldali parja (getSupabaseProjectDbId). Minden
  // egy hibara mutato muvelet - fotok, esemenynaplo, modositas, torles - ezen
  // keresztul jut el a HIB-xxx azonositotol a DB id-ig. Ha itt szurunk, akkor
  // az "amit nem latsz, azt nem is irhatod" szabaly a REST API-n at is all,
  // nem csak a felületen: a kozvetlen PATCH /api/issues/HIB-xxx sem megy at.
  const row = data as { id: string; project_id: string | null; subcontractor_id: string | null };
  const scope = await getVisibilityScope();

  if (!scope.unrestricted) {
    if (!row.project_id || !scopeAllowsProject(scope, row.project_id)) return null;
    if (scope.subcontractorId && row.subcontractor_id !== scope.subcontractorId) return null;
  }

  return row.id;
}

export async function listProjects() {
  const supabase = await getServerSupabaseClient();
  if (!supabase) return [mockProject];

  const scope = await getVisibilityScope();
  if (isEmptyScope(scope)) return [];

  let query = supabase
    .from("projects")
    .select("*")
    .order("created_at", { ascending: true });

  if (scope.projectIds) {
    query = query.in("id", scope.projectIds);
  }

  const { data, error } = await query;

  logSupabaseReadError("projects list", error);

  const rows = data as SupabaseProjectRow[] | null;
  // Korabban itt ures eredmeny eseten a mock projekt jott vissza. Hatokorrel ez
  // szivargas lenne: aki egyetlen projektnek sem tagja, kapna egy projektet -
  // es a projektvalto is felajanlana. Ures halmaz maradjon ures.
  if (error || !rows?.length) return [];
  return rows.map(mapProject);
}

export async function getProjectByPublicId(publicId: string) {
  const supabase = await getServerSupabaseClient();
  if (!supabase) return publicId === mockProject.publicId ? mockProject : null;

  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("public_id", publicId)
    .maybeSingle();

  logSupabaseReadError("project by public id", error);

  if (error || !data) return null;

  // A kozvetlen URL-lel (/projects/PRJ-004) se lehessen bekukkantani egy olyan
  // projektbe, aminek nem vagyok tagja: itt null -> az oldal 404/AccessDenied.
  const row = data as SupabaseProjectRow;
  const scope = await getVisibilityScope();
  return scopeAllowsProject(scope, row.id) ? mapProject(row) : null;
}

async function getSupabaseProjectDbId(publicId: string) {
  const supabase = await getServerSupabaseClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("projects")
    .select("id")
    .eq("public_id", publicId)
    .maybeSingle();

  logSupabaseReadError("project id lookup", error);

  const projectDbId: string | null = error ? null : (data?.id as string | undefined) || null;
  if (!projectDbId) return null;

  // Egyetlen fojtopont: minden projektre szukitett lekerdezes (hibak, TIG,
  // teljesitmenynaplo, dokumentumok, akadalyok, TIG-jeloltek) ezen keresztul
  // forditja a PRJ-xxx azonositot DB id-ve. Ha itt szurunk, mindegyik egyszerre
  // lesz hatokor-helyes, es nem marad kifelejtett lista.
  const scope = await getVisibilityScope();
  return scopeAllowsProject(scope, projectDbId) ? projectDbId : null;
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
  const supabase = await getServerSupabaseClient();
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
  await requirePermission("project.create");
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

async function updateSupabaseProject(publicId: string, input: UpdateProjectInput) {
  const supabase = await getServerSupabaseClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("projects")
    .update({
      name: input.name,
      address: input.address || null,
      client: input.client || null,
      phase: input.phase || null,
      progress: input.progress ?? 0
    })
    .eq("public_id", publicId)
    .select("*")
    .maybeSingle();

  logSupabaseWriteError("project update", error);

  return error || !data ? null : mapProject(data as SupabaseProjectRow);
}

export async function updateProjectRecord(publicId: string, input: UpdateProjectInput): Promise<UpdateProjectResult> {
  await requirePermission("project.update");
  const updated = await updateSupabaseProject(publicId, input);

  if (updated) {
    return { project: updated, mode: "supabase" };
  }

  return { project: null, mode: "mock" };
}

async function deleteSupabaseProject(publicId: string) {
  const supabase = await getServerSupabaseClient();
  if (!supabase) return null;

  const projectDbId = await getSupabaseProjectDbId(publicId);
  if (!projectDbId) return null;

  const { error } = await supabase.from("projects").delete().eq("id", projectDbId);

  logSupabaseWriteError("project delete", error);

  return error ? null : true;
}

export async function deleteProjectRecord(publicId: string): Promise<DeleteProjectResult> {
  await requirePermission("project.delete");
  const supabaseDeleted = await deleteSupabaseProject(publicId);

  if (supabaseDeleted) {
    return { ok: true, mode: "supabase" };
  }

  if (isAuthConfigured()) {
    return { ok: false, mode: "mock" };
  }

  return {
    ok: true,
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
  const supabase = await getServerSupabaseClient();
  // Supabase nelkuli demo mod: mock adat, hogy az app vegigkattinthato legyen.
  if (!supabase) return mockEvidencePhotos.filter((photo) => photo.issueId === issueId);

  // Elesben viszont a hatokoron kivuli (vagy nem letezo) hiba URES listat kap.
  // Korabban ilyenkor is a mock fotok jottek vissza, mert a "nincs sor" agat
  // nem lehetett megkulonboztetni a "nincs jogod" agtol.
  const issueDbId = await getSupabaseIssueDbId(issueId);
  if (!issueDbId) return [];

  const { data, error } = await supabase
    .from("issue_evidence")
    .select("*")
    .eq("issue_id", issueDbId)
    .order("uploaded_at", { ascending: true });

  logSupabaseReadError("issue_evidence", error);

  if (error) return [];
  const rows = (data as SupabaseEvidenceRow[] | null) || [];
  return rows.map((row) => mapEvidence(row, issueId));
}

async function createSupabaseIssueEvidence(issueId: string, input: CreateIssueEvidenceInput) {
  const issueDbId = await getSupabaseIssueDbId(issueId);
  const supabase = await getServerSupabaseClient();

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
  await requirePermission("evidence.create");
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
  const supabase = await getServerSupabaseClient();

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
  await requirePermission("evidence.delete");
  const supabaseDeleted = await deleteSupabaseIssueEvidence(issueId, evidenceId);

  if (supabaseDeleted) {
    return {
      ok: true,
      mode: "supabase"
    };
  }

  if (isAuthConfigured()) {
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
  const supabase = await getServerSupabaseClient();
  // Lasd getIssueEvidence: demo modban mock, elesben a hatokoron kivuli hiba
  // ures naplot kap, nem demo-esemenyeket.
  if (!supabase) return mockIssueEvents.filter((event) => event.issueId === issueId);

  const issueDbId = await getSupabaseIssueDbId(issueId);
  if (!issueDbId) return [];

  const { data, error } = await supabase
    .from("issue_events")
    .select("*")
    .eq("issue_id", issueDbId)
    .order("created_at", { ascending: true });

  logSupabaseReadError("issue_events", error);

  if (error) return [];
  const rows = (data as SupabaseIssueEventRow[] | null) || [];
  return rows.map((row) => mapIssueEvent(row, issueId));
}

export async function listSubcontractors() {
  const supabase = await getServerSupabaseClient();
  const issues = await listIssues();
  const scope = supabase ? await getVisibilityScope() : null;
  // Alvallalkozo csak a SAJAT ceget latja a listan. A darabszamok amugy is a
  // mar leszukitett hiba-halmazbol jonnek, de a cegnevek listaja onmagaban is
  // uzleti informacio (ki dolgozik a megrendelonek).
  const result = supabase
    ? await (scope?.subcontractorId
        ? supabase.from("subcontractors").select("*").eq("id", scope.subcontractorId).order("name", { ascending: true })
        : supabase.from("subcontractors").select("*").order("name", { ascending: true }))
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
  const supabase = await getServerSupabaseClient();
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
  const supabase = await getServerSupabaseClient();
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
  await requirePermission("subcontractor.create");
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
  const supabase = await getServerSupabaseClient();
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
  await requirePermission("subcontractor.update");
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
  const supabase = await getServerSupabaseClient();
  if (!supabase) return null;

  const subcontractorDbId = await getSupabaseSubcontractorDbId(publicId);
  if (!subcontractorDbId) return null;

  const { error } = await supabase.from("subcontractors").delete().eq("id", subcontractorDbId);

  logSupabaseWriteError("subcontractor delete", error);

  return error ? null : true;
}

export async function deleteSubcontractorRecord(publicId: string): Promise<DeleteSubcontractorResult> {
  await requirePermission("subcontractor.delete");
  const supabaseDeleted = await deleteSupabaseSubcontractor(publicId);

  if (supabaseDeleted) {
    return {
      ok: true,
      mode: "supabase"
    };
  }

  if (isAuthConfigured()) {
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

// projectId elhagyható: az aggregált ("Minden projekt") dashboardnak az összes
// projekt csomagjaira szüksége van egyetlen lekérdezésben.
export async function listTigPackages(projectId?: string) {
  const supabase = await getServerSupabaseClient();
  if (!supabase) return mockTigPackages;

  const scope = await getVisibilityScope();
  if (isEmptyScope(scope)) return [];

  let query = supabase
    .from("tig_packages")
    .select("*,subcontractors(name),projects(public_id,name),tig_package_issues(issue_id, issues(public_id, issue_evidence(evidence_type)))")
    .order("updated_at", { ascending: false });

  if (projectId) {
    const projectDbId = await getSupabaseProjectDbId(projectId);
    if (!projectDbId) return [];
    query = query.eq("project_id", projectDbId);
  } else if (scope.projectIds) {
    query = query.in("project_id", scope.projectIds);
  }

  // A TIG csomag penzugyi dokumentum: alvallalkozo csak a sajatjat lathatja.
  if (scope.subcontractorId) {
    query = query.eq("subcontractor_id", scope.subcontractorId);
  }

  const { data, error } = await query;

  logSupabaseReadError("tig_packages", error);

  if (error) return mockTigPackages;
  const rows = (data as SupabaseTigPackageRow[] | null) || [];
  return rows.map(mapTigPackage);
}

export async function listWorkLogs(projectId: string) {
  const supabase = await getServerSupabaseClient();
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
  const supabase = await getServerSupabaseClient();
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
  const supabase = await getServerSupabaseClient();
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
  await requirePermission("document.create");
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
  const supabase = await getServerSupabaseClient();
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
  await requirePermission("document.delete");
  const supabaseDeleted = await deleteSupabaseProjectDocument(documentId);

  if (supabaseDeleted) {
    return {
      ok: true,
      mode: "supabase"
    };
  }

  if (isAuthConfigured()) {
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

/**
 * Dokumentum-fojtopont: lathatja-e a bejelentkezett felhasznalo ezt a tervet?
 *
 * A projekthez (getSupabaseProjectDbId) es a hibahoz (getSupabaseIssueDbId) mar
 * volt ilyen kapu, a dokumentumhoz nem: a meres- es kalibracio-vegpontok nyers
 * document uuid-val dolgoztak, igy barmely belepett felhasznalo elerhette
 * barmely projekt tervenek mereseit. Minden dokumentum-alapu muvelet ezen megy
 * at, hogy ne maradhasson kifelejtett hivas.
 *
 * Visszateres: a dokumentum azonositoja, ha lathato; null, ha nem lathato vagy
 * nem letezik - a ketto szandekosan megkulonboztethetetlen.
 */
async function getScopedDocumentId(documentId: string) {
  const supabase = await getServerSupabaseClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("project_documents")
    .select("id,project_id")
    .eq("id", documentId)
    .maybeSingle();

  logSupabaseReadError("document scope lookup", error);
  if (error || !data) return null;

  const row = data as { id: string; project_id: string | null };
  const scope = await getVisibilityScope();
  if (scope.unrestricted) return row.id;

  return row.project_id && scopeAllowsProject(scope, row.project_id) ? row.id : null;
}

/**
 * Ugyanaz meres-azonositora: a meres a dokumentumon keresztul orokli a
 * projekt-hatokort. A modosito/torlo vegpontok nyers measurementId-vel
 * dolgoznak, ezert kell ez a lepes.
 */
async function getScopedMeasurementId(measurementId: string) {
  const supabase = await getServerSupabaseClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("plan_measurements")
    .select("id,document_id")
    .eq("id", measurementId)
    .maybeSingle();

  logSupabaseReadError("measurement scope lookup", error);
  if (error || !data) return null;

  const row = data as { id: string; document_id: string };
  return (await getScopedDocumentId(row.document_id)) ? row.id : null;
}

export async function listPlanMeasurements(documentId: string): Promise<PlanMeasurement[]> {
  const supabase = await getServerSupabaseClient();
  if (!supabase) return [];

  const scopedDocumentId = await getScopedDocumentId(documentId);
  if (!scopedDocumentId) return [];

  const { data, error } = await supabase
    .from("plan_measurements")
    .select("*")
    .eq("document_id", scopedDocumentId)
    .order("created_at", { ascending: false });

  logSupabaseReadError("plan_measurements", error);

  const rows = data as SupabasePlanMeasurementRow[] | null;
  if (error || !rows) return [];
  return rows.map(mapPlanMeasurement);
}

export async function createPlanMeasurementRecord(input: CreatePlanMeasurementInput): Promise<CreatePlanMeasurementResult> {
  await requirePermission("measurement.create");
  const supabase = await getServerSupabaseClient();
  if (!supabase) return { measurement: null, mode: "mock" };

  // A szerep-jog (measurement.create) az epitesvezetot is beengedi, aki viszont
  // hatokor-korlatozott: csak a sajat projektjei tervere irhat.
  const scopedDocumentId = await getScopedDocumentId(input.documentId);
  if (!scopedDocumentId) return { measurement: null, mode: "supabase" };

  const { data, error } = await supabase
    .from("plan_measurements")
    .insert({
      document_id: scopedDocumentId,
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
  await requirePermission("measurement.delete");
  const supabase = await getServerSupabaseClient();
  if (!supabase) return { ok: false, mode: "mock" };

  const scopedMeasurementId = await getScopedMeasurementId(measurementId);
  if (!scopedMeasurementId) return { ok: false, mode: "supabase" };

  const { error } = await supabase.from("plan_measurements").delete().eq("id", scopedMeasurementId);

  logSupabaseWriteError("plan_measurements delete", error);

  return { ok: !error, mode: error ? "mock" : "supabase" };
}

export async function updatePlanMeasurementRecord(input: UpdatePlanMeasurementInput): Promise<CreatePlanMeasurementResult> {
  await requirePermission("measurement.update");
  const supabase = await getServerSupabaseClient();
  if (!supabase) return { measurement: null, mode: "mock" };

  const scopedMeasurementId = await getScopedMeasurementId(input.measurementId);
  if (!scopedMeasurementId) return { measurement: null, mode: "supabase" };

  const { data, error } = await supabase
    .from("plan_measurements")
    .update({
      points: input.points,
      calculated_value: input.calculatedValue,
      label: input.label || null,
      note: input.note || null
    })
    .eq("id", scopedMeasurementId)
    .select("*")
    .single();

  logSupabaseWriteError("plan_measurements update", error);

  if (error || !data) return { measurement: null, mode: "mock" };
  return { measurement: mapPlanMeasurement(data as SupabasePlanMeasurementRow), mode: "supabase" };
}

export async function getPlanCalibration(documentId: string): Promise<number | null> {
  const supabase = await getServerSupabaseClient();
  if (!supabase) return null;

  const scopedDocumentId = await getScopedDocumentId(documentId);
  if (!scopedDocumentId) return null;

  const { data, error } = await supabase
    .from("plan_calibrations")
    .select("meters_per_unit")
    .eq("document_id", scopedDocumentId)
    .maybeSingle();

  logSupabaseReadError("plan_calibrations", error);

  if (error || !data) return null;
  return (data as { meters_per_unit: number }).meters_per_unit;
}

export async function savePlanCalibration(documentId: string, metersPerUnit: number): Promise<SavePlanCalibrationResult> {
  await requirePermission("measurement.calibrate");
  const supabase = await getServerSupabaseClient();
  if (!supabase) return { ok: false, mode: "mock" };

  const scopedDocumentId = await getScopedDocumentId(documentId);
  if (!scopedDocumentId) return { ok: false, mode: "supabase" };

  const { error } = await supabase
    .from("plan_calibrations")
    .upsert({ document_id: scopedDocumentId, meters_per_unit: metersPerUnit, updated_at: new Date().toISOString() });

  logSupabaseWriteError("plan_calibrations", error);

  return { ok: !error, mode: error ? "mock" : "supabase" };
}

/**
 * Publikus hatokor-ellenorzes API-rol: lathatja-e a felhasznalo a dokumentumot?
 * A getScopedDocumentId fojtopont vekony burka, hogy a route-ok is elerjek anelkul,
 * hogy a belso segedet exportalnank. Visszateres: a dokumentum id-ja vagy null.
 */
export async function getScopedDocumentIdForApi(documentId: string): Promise<string | null> {
  return getScopedDocumentId(documentId);
}

export async function listPlanAnalyses(documentId: string): Promise<PlanAnalysis[]> {
  const supabase = await getServerSupabaseClient();
  if (!supabase) return [];

  const scopedDocumentId = await getScopedDocumentId(documentId);
  if (!scopedDocumentId) return [];

  const { data, error } = await supabase
    .from("plan_analyses")
    .select("*")
    .eq("document_id", scopedDocumentId)
    .order("created_at", { ascending: false });

  logSupabaseReadError("plan_analyses", error);

  const rows = data as SupabasePlanAnalysisRow[] | null;
  if (error || !rows) return [];
  return rows.map(mapPlanAnalysis);
}

export async function createPlanAnalysis(input: CreatePlanAnalysisInput): Promise<CreatePlanAnalysisResult> {
  // Ugyanaz a terv-munka kontextus, mint a meresnel: aki merhet, az elemezhet is.
  await requirePermission("measurement.create");
  const supabase = await getServerSupabaseClient();
  if (!supabase) return { analysis: null, mode: "mock" };

  // Hatokor: az epitesvezetot a measurement.create beengedi, de csak a sajat
  // projektjei tervere irhat - a dokumentum-fojtoponton at ellenorizzuk.
  const scopedDocumentId = await getScopedDocumentId(input.documentId);
  if (!scopedDocumentId) return { analysis: null, mode: "supabase" };

  // Deduplikalas: egy helyiseg = egy rekord. FONTOS: a kod a LAKAS szama, ami
  // minden szobaban ismetlodik (B3.01 NAPPALI, B3.01 FURDO, ...), ezert a kod
  // ONMAGABAN nem azonosit egy helyiseget - a KOD + NEV egyutt igen. Csak akkor
  // dedupalunk, ha mindketto megvan; a talalatot JS-ben szurjuk (megbizhatobb,
  // mint a jsonb-szuro), es id szerint toroljuk a korabbi(ak)at beszuras elott.
  const dedupCode = input.result.room.code?.trim();
  const dedupName = input.result.room.name?.trim();
  if (dedupCode && dedupName) {
    const { data: existing, error: listError } = await supabase
      .from("plan_analyses")
      .select("id,result")
      .eq("document_id", scopedDocumentId)
      .eq("calculation_type", input.calculationType);
    logSupabaseReadError("plan_analyses dedup lookup", listError);

    const dupIds = ((existing as { id: string; result: PlanAnalysisResult }[] | null) || [])
      .filter((row) => row.result?.room?.code?.trim() === dedupCode && row.result?.room?.name?.trim() === dedupName)
      .map((row) => row.id);

    if (dupIds.length) {
      const { error: dedupError } = await supabase.from("plan_analyses").delete().in("id", dupIds);
      logSupabaseWriteError("plan_analyses dedup", dedupError);
    }
  }

  const { data, error } = await supabase
    .from("plan_analyses")
    .insert({
      document_id: scopedDocumentId,
      page_number: input.pageNumber,
      selection: input.selection,
      calculation_type: input.calculationType,
      result: input.result,
      confidence: input.confidence,
      user_verified: input.userVerified ?? false
    })
    .select("*")
    .single();

  logSupabaseWriteError("plan_analyses", error);

  if (error || !data) return { analysis: null, mode: "mock" };
  return { analysis: mapPlanAnalysis(data as SupabasePlanAnalysisRow), mode: "supabase" };
}

export async function listActiveBlockers(projectId: string) {
  const activeStatuses: BlockerStatus[] = ["open", "in_progress", "waiting_external"];
  const fallback = mockBlockerItems.filter((blocker) => activeStatuses.includes(blocker.status));
  const supabase = await getServerSupabaseClient();
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
  const supabase = await getServerSupabaseClient();
  if (!supabase) return mockBlockerItems;

  const scope = await getVisibilityScope();
  if (isEmptyScope(scope)) return [];

  let query = supabase.from("blocker_list").select("*").order("created_at", { ascending: false });

  if (projectId) {
    const projectDbId = await getSupabaseProjectDbId(projectId);
    if (!projectDbId) return [];
    query = query.eq("project_id", projectDbId);
  } else if (scope.projectIds) {
    query = query.in("project_id", scope.projectIds);
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
  const supabase = await getServerSupabaseClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("blocker_list")
    .select("id,project_id")
    .eq("public_id", publicId)
    .maybeSingle();

  logSupabaseReadError("blocker id lookup", error);

  if (error || !data) return null;

  // Fojtopont: minden AKA-xxx -> DB id forditas hatokorre szurve. Ma a torles
  // amugy is csak vezetoi (korlatlan) szerepnek megy, de ha a jog kesobb
  // szelesedik, ne itt nyiljon vissza a res.
  const row = data as { id: string; project_id: string | null };
  const scope = await getVisibilityScope();
  if (scope.unrestricted) return row.id;

  return row.project_id && scopeAllowsProject(scope, row.project_id) ? row.id : null;
}

async function updateSupabaseBlocker(publicId: string, input: UpdateBlockerInput) {
  const supabase = await getServerSupabaseClient();
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

/**
 * Ket ut vezet ide:
 *   1. blocker.update jog (SITE_TEAM felfele) -> minden mezo modosithato;
 *   2. a bejelento sajat, meg Nyitott akadalya -> CSAK a leiro mezok.
 *
 * A 2. esetben az allapotot, a felelost es a megoldas-jegyzetet itt irjuk
 * vissza a meglevo ertekre, fuggetlenul attol, mit kuldott a kliens. Igy egy
 * kezzel osszerakott keres sem tud allapotot leptetni a matrix megkerulesevel.
 */
async function authorizeBlockerUpdate(publicId: string, input: UpdateBlockerInput): Promise<UpdateBlockerInput> {
  const role = await getCurrentWorkflowRole();

  // Hatokor eloszor, a szerep-jog ELOTT. A getBlockerByPublicId a mar
  // hatokorre szukitett listabol dolgozik, igy amit nem lat a felhasznalo, azt
  // nem is szerkesztheti - blocker.update joggal sem. Ez azert kell, mert az
  // epitesvezetonek van blocker.update joga, de o hatokor-korlatozott: csak a
  // sajat tagsagi projektjeiben. A nem letezo es a nem lathato akadaly
  // ugyanazt a valaszt adja, tehat a letezes nem derul ki.
  const existing = await getBlockerByPublicId(publicId);
  if (!existing) throw new PermissionError("blocker.update", role);

  if (await hasPermission("blocker.update")) return input;

  const user = await getCurrentUser();

  if (!canEditBlocker(role, existing, user?.profileId)) {
    throw new PermissionError("blocker.update", role);
  }

  return {
    ...input,
    status: existing.status,
    responsibleName: existing.responsibleName === "Nincs megadva" ? undefined : existing.responsibleName,
    resolutionNote: existing.resolutionNote
  };
}

export async function updateBlockerRecord(publicId: string, input: UpdateBlockerInput): Promise<UpdateBlockerResult> {
  const effectiveInput = await authorizeBlockerUpdate(publicId, input);
  const updated = await updateSupabaseBlocker(publicId, effectiveInput);

  if (updated) {
    return { blocker: updated, mode: "supabase" };
  }

  return { blocker: null, mode: "mock" };
}

async function deleteSupabaseBlocker(publicId: string) {
  const supabase = await getServerSupabaseClient();
  if (!supabase) return null;

  const blockerDbId = await getSupabaseBlockerDbId(publicId);
  if (!blockerDbId) return null;

  const { error } = await supabase.from("blocker_list").delete().eq("id", blockerDbId);

  logSupabaseWriteError("blocker delete", error);

  return error ? null : true;
}

export async function deleteBlockerRecord(publicId: string): Promise<DeleteBlockerResult> {
  await requirePermission("blocker.delete");
  const supabaseDeleted = await deleteSupabaseBlocker(publicId);

  if (supabaseDeleted) {
    return { ok: true, mode: "supabase" };
  }

  if (isAuthConfigured()) {
    return { ok: false, mode: "mock" };
  }

  return { ok: true, mode: "mock" };
}

async function attachBlockerRelations(rows: SupabaseBlockerRow[]) {
  const supabase = await getServerSupabaseClient();
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
  const supabase = await getServerSupabaseClient();
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
  await requirePermission("blocker.create");
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
  const supabase = await getServerSupabaseClient();
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
  // Ki vette fel a hibat. Az oszlop a kezdetek ota letezik, de eddig ures maradt,
  // igy meg az sem latszott, ki rogzitette. A 20260728090000 migracio teszi ra a
  // hivatkozast a profiles tablara.
  const currentUser = await getCurrentUser();

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
      value_huf: input.valueHuf || 0,
      created_by: currentUser?.profileId || null
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
  await requirePermission("issue.create");
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

async function createSupabaseStatusEvent(
  issue: Issue,
  issueDbId: string,
  targetStatus: IssueStatus,
  statusNote = ""
) {
  const supabase = await getServerSupabaseClient();
  if (!supabase) return false;

  const backward = isBackwardTransition(issue.status, targetStatus);
  const trail = `${issueStatusLabels[issue.status]} → ${issueStatusLabels[targetStatus]}`;

  const { error } = await supabase
    .from("issue_events")
    .insert({
      issue_id: issueDbId,
      event_type: "status_changed",
      from_status: issue.status,
      to_status: targetStatus,
      title: backward ? "Visszaléptetés rögzítve" : "Státuszváltás rögzítve",
      description: statusNote ? `${trail} – indok: ${statusNote}` : trail
    });

  logSupabaseWriteError("issue status event", error);

  return !error;
}

async function updateSupabaseIssue(publicId: string, input: UpdateIssueInput): Promise<Issue | null> {
  const supabase = await getServerSupabaseClient();
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
  // Az állapotmozgatást a BEJELENTKEZETT felhasználó szerepe engedélyezi, nem a
  // korábbi hardkódolt "project_manager". Lásd docs/permissions-plan.md.
  const actorRole = await getCurrentWorkflowRole();
  const wantsStatusChange = Boolean(input.status) && input.status !== currentIssue.status;

  // Korabban a tiltott allapotvaltas NEMAN visszaesett a regi allapotra, es a
  // felhasznalo "Hiba frissitve" uzenetet latott. Most ertheto hibat dobunk,
  // amit a route 403-kent ad vissza, a UI pedig kiir.
  if (wantsStatusChange && !canMoveIssue(currentIssue, input.status as IssueStatus, actorRole)) {
    throw new ForbiddenError(
      `A(z) „${issueStatusLabels[currentIssue.status]}” állapotból nem léptethető „${
        issueStatusLabels[input.status as IssueStatus]
      }” állapotba ${workflowRoleLabels[actorRole]} szerepkörrel.`
    );
  }

  // Visszalepes indok nelkul nem mehet at: enelkul az idovonal csak annyit
  // rogzitene, hogy "valaki visszavonta", azt nem, hogy miert.
  const statusNote = (input.statusNote || "").trim();

  if (wantsStatusChange && isBackwardTransition(currentIssue.status, input.status as IssueStatus) && !statusNote) {
    throw new ForbiddenError(
      `A(z) „${issueStatusLabels[currentIssue.status]}” → „${
        issueStatusLabels[input.status as IssueStatus]
      }” visszaléptetéshez indokot kell megadni.`
    );
  }

  const targetStatus = wantsStatusChange ? (input.status as IssueStatus) : currentIssue.status;

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
    await createSupabaseStatusEvent(currentIssue, issueDbId, targetStatus, statusNote);
  }

  return mapIssue(data as SupabaseIssueRow);
}

export async function updateIssueRecord(publicId: string, input: UpdateIssueInput): Promise<UpdateIssueResult> {
  await requirePermission("issue.update");
  const updated = await updateSupabaseIssue(publicId, input);

  if (updated) {
    return { issue: updated, mode: "supabase" };
  }

  return { issue: null, mode: "mock" };
}

async function deleteSupabaseIssue(publicId: string) {
  const supabase = await getServerSupabaseClient();
  if (!supabase) return null;

  const issueDbId = await getSupabaseIssueDbId(publicId);
  if (!issueDbId) return null;

  const { error } = await supabase.from("issues").delete().eq("id", issueDbId);

  logSupabaseWriteError("issue delete", error);

  return error ? null : true;
}

export async function deleteIssueRecord(publicId: string): Promise<DeleteIssueResult> {
  await requirePermission("issue.delete");
  const supabaseDeleted = await deleteSupabaseIssue(publicId);

  if (supabaseDeleted) {
    return { ok: true, mode: "supabase" };
  }

  if (isAuthConfigured()) {
    return { ok: false, mode: "mock" };
  }

  return { ok: true, mode: "mock" };
}

// ─────────────────────────────────────────────────────────────────────────────
// TIG (teljesítésigazolás) write flow
// Minden művelet authenticated kliensen (getServerSupabaseClient), soha nem anon.
// A csomag értéke a kapcsolt hibák valueHuf összege; a proofCount származtatott.
// ─────────────────────────────────────────────────────────────────────────────

type TigStatus = TigPackage["status"];

const tigSelect =
  "*,subcontractors(name),tig_package_issues(issue_id, issues(public_id, issue_evidence(evidence_type)))";

const TIG_TRANSITIONS: Record<TigStatus, TigStatus[]> = {
  draft: ["ready_for_review"],
  ready_for_review: ["approved", "draft"],
  approved: ["sent", "ready_for_review"],
  sent: []
};

export type CreateTigPackageInput = {
  projectId: string; // projekt public id
  subcontractorId: string; // alvállalkozó public id
  issueIds: string[]; // hiba public id-k
  performanceDate?: string | null;
  periodStart?: string | null;
  periodEnd?: string | null;
  note?: string | null;
};

export type TigMetaInput = {
  performanceDate?: string | null;
  periodStart?: string | null;
  periodEnd?: string | null;
  note?: string | null;
};

export type TigWriteResult = { package: TigPackage | null; ok: boolean; error?: string };

function nextPublicTigId(publicIds: string[]) {
  const nextNumber =
    Math.max(
      0,
      ...publicIds.map((id) => Number(String(id).replace("TIG-", ""))).filter((value) => Number.isFinite(value))
    ) + 1;
  return `TIG-${String(nextNumber).padStart(3, "0")}`;
}

async function getTigPackageByPublicId(publicId: string): Promise<TigPackage | null> {
  const supabase = await getServerSupabaseClient();
  if (!supabase) return null;

  const { data, error } = await supabase.from("tig_packages").select(tigSelect).eq("public_id", publicId).maybeSingle();
  logSupabaseReadError("tig package by public id", error);
  return !error && data ? mapTigPackage(data as SupabaseTigPackageRow) : null;
}

async function getTigPackageRef(publicId: string): Promise<{ id: string; status: TigStatus } | null> {
  const supabase = await getServerSupabaseClient();
  if (!supabase) return null;

  const { data, error } = await supabase.from("tig_packages").select("id, status").eq("public_id", publicId).maybeSingle();
  logSupabaseReadError("tig package id lookup", error);
  return error || !data ? null : (data as { id: string; status: TigStatus });
}

async function getIssueRefsByPublicIds(publicIds: string[]): Promise<{ id: string; value_huf: number | string | null }[]> {
  const supabase = await getServerSupabaseClient();
  if (!supabase || publicIds.length === 0) return [];

  const { data, error } = await supabase.from("issues").select("id, value_huf").in("public_id", publicIds);
  logSupabaseReadError("issue refs by public id", error);
  return error ? [] : ((data as { id: string; value_huf: number | string | null }[]) || []);
}

// A mock listTigItems kiváltása: az adott projekt adott alvállalkozójához tartozó
// tig_ready hibák, amelyekből TIG-tétel lehet. (A már csomagba tett hibák
// kiszűrése egyelőre nyitott – lásd terv.)
export async function listTigCandidateIssues(projectId: string, subcontractorPublicId: string): Promise<TigItem[]> {
  const supabase = await getServerSupabaseClient();
  if (!supabase) return mockTigItems;

  const [projectDbId, subDbId] = await Promise.all([
    getSupabaseProjectDbId(projectId),
    getSupabaseSubcontractorDbId(subcontractorPublicId)
  ]);
  if (!projectDbId || !subDbId) return [];

  const { data, error } = await supabase
    .from("issues")
    .select("id, public_id, title, value_huf, subcontractors(name), issue_evidence(evidence_type)")
    .eq("project_id", projectDbId)
    .eq("subcontractor_id", subDbId)
    .eq("status", "tig_ready");

  logSupabaseReadError("tig candidates", error);
  if (error || !data) return [];

  // Már valamely TIG csomagba tett hibák kizárása – egy hiba ne kerülhessen
  // két csomagba (kettős számlázás elkerülése). A hiba-id globálisan egyedi és
  // egy projekthez tartozik, ezért elég az összes csomag-kapcsolatot nézni.
  const { data: usedData, error: usedError } = await supabase.from("tig_package_issues").select("issue_id");
  logSupabaseReadError("tig used issues", usedError);
  const usedIds = new Set(((usedData as { issue_id: string }[] | null) || []).map((row) => row.issue_id));

  return (data as unknown as {
    id: string;
    public_id: string;
    title: string;
    value_huf: number | string | null;
    subcontractors?: { name: string | null } | null;
    issue_evidence?: { evidence_type: string }[] | null;
  }[])
    .filter((row) => !usedIds.has(row.id))
    .map((row) => ({
      id: row.public_id,
      title: row.title,
      subcontractor: row.subcontractors?.name || "Nincs megadva",
      valueHuf: numberValue(row.value_huf),
      proofCount: (row.issue_evidence || []).length,
      included: false
    }));
}

export async function createTigPackage(input: CreateTigPackageInput): Promise<TigWriteResult> {
  await requirePermission("tig.create");
  const supabase = await getServerSupabaseClient();
  if (!supabase) return { package: null, ok: false, error: "Nincs adatbázis-kapcsolat." };

  const [projectDbId, subDbId] = await Promise.all([
    getSupabaseProjectDbId(input.projectId),
    getSupabaseSubcontractorDbId(input.subcontractorId)
  ]);
  if (!projectDbId) return { package: null, ok: false, error: "Ismeretlen projekt." };
  if (!subDbId) return { package: null, ok: false, error: "Válassz alvállalkozót." };

  const issues = await getIssueRefsByPublicIds(input.issueIds);
  const value = issues.reduce((sum, issue) => sum + numberValue(issue.value_huf), 0);

  const { data: existing } = await supabase.from("tig_packages").select("public_id");
  const publicId = nextPublicTigId(((existing as { public_id: string }[]) || []).map((row) => row.public_id));

  const { data, error } = await supabase
    .from("tig_packages")
    .insert({
      public_id: publicId,
      project_id: projectDbId,
      subcontractor_id: subDbId,
      status: "draft",
      gross_value_huf: value,
      net_value_huf: value,
      performance_date: input.performanceDate || null,
      period_start: input.periodStart || null,
      period_end: input.periodEnd || null,
      note: input.note || null
    })
    .select("id, public_id")
    .single();

  logSupabaseWriteError("tig_packages insert", error);
  if (error || !data) return { package: null, ok: false, error: "A csomag létrehozása nem sikerült." };

  if (issues.length) {
    const links = issues.map((issue) => ({ tig_package_id: data.id, issue_id: issue.id }));
    const { error: linkError } = await supabase.from("tig_package_issues").insert(links);
    logSupabaseWriteError("tig_package_issues insert", linkError);
  }

  return { package: await getTigPackageByPublicId(publicId), ok: true };
}

export async function setTigPackageIssues(packagePublicId: string, issuePublicIds: string[]): Promise<TigWriteResult> {
  await requirePermission("tig.update");
  const supabase = await getServerSupabaseClient();
  if (!supabase) return { package: null, ok: false, error: "Nincs adatbázis-kapcsolat." };

  const ref = await getTigPackageRef(packagePublicId);
  if (!ref) return { package: null, ok: false, error: "Nincs ilyen csomag." };
  if (ref.status !== "draft") {
    return { package: await getTigPackageByPublicId(packagePublicId), ok: false, error: "Csak piszkozat szerkeszthető." };
  }

  await supabase.from("tig_package_issues").delete().eq("tig_package_id", ref.id);

  const issues = await getIssueRefsByPublicIds(issuePublicIds);
  if (issues.length) {
    const links = issues.map((issue) => ({ tig_package_id: ref.id, issue_id: issue.id }));
    const { error: linkError } = await supabase.from("tig_package_issues").insert(links);
    logSupabaseWriteError("tig_package_issues replace", linkError);
  }

  const value = issues.reduce((sum, issue) => sum + numberValue(issue.value_huf), 0);
  await supabase
    .from("tig_packages")
    .update({ gross_value_huf: value, net_value_huf: value, updated_at: new Date().toISOString() })
    .eq("id", ref.id);

  return { package: await getTigPackageByPublicId(packagePublicId), ok: true };
}

export async function updateTigPackageMeta(packagePublicId: string, meta: TigMetaInput): Promise<TigWriteResult> {
  await requirePermission("tig.update");
  const supabase = await getServerSupabaseClient();
  if (!supabase) return { package: null, ok: false, error: "Nincs adatbázis-kapcsolat." };

  const ref = await getTigPackageRef(packagePublicId);
  if (!ref) return { package: null, ok: false, error: "Nincs ilyen csomag." };

  const { error } = await supabase
    .from("tig_packages")
    .update({
      performance_date: meta.performanceDate ?? null,
      period_start: meta.periodStart ?? null,
      period_end: meta.periodEnd ?? null,
      note: meta.note ?? null,
      updated_at: new Date().toISOString()
    })
    .eq("id", ref.id);

  logSupabaseWriteError("tig_packages meta update", error);
  return { package: await getTigPackageByPublicId(packagePublicId), ok: !error, error: error ? "Mentés sikertelen." : undefined };
}

export async function moveTigPackageStatus(packagePublicId: string, nextStatus: TigStatus): Promise<TigWriteResult> {
  const supabase = await getServerSupabaseClient();
  if (!supabase) return { package: null, ok: false, error: "Nincs adatbázis-kapcsolat." };

  const ref = await getTigPackageRef(packagePublicId);
  if (!ref) return { package: null, ok: false, error: "Nincs ilyen csomag." };

  if (!TIG_TRANSITIONS[ref.status]?.includes(nextStatus)) {
    return {
      package: await getTigPackageByPublicId(packagePublicId),
      ok: false,
      error: `Nem megengedett állapotváltás: ${ref.status} → ${nextStatus}.`
    };
  }

  // Validációs kapu az "ellenőrzésre vár" állapothoz.
  if (nextStatus === "ready_for_review") {
    const full = await getTigPackageByPublicId(packagePublicId);
    if (!full || full.issueIds.length === 0) {
      return { package: full, ok: false, error: "Legalább egy tétel kell a csomagba." };
    }
    if (full.proofCount === 0) {
      return { package: full, ok: false, error: "Legalább egy fotós bizonyíték szükséges a tételeken." };
    }
  }

  const { error } = await supabase
    .from("tig_packages")
    .update({ status: nextStatus, updated_at: new Date().toISOString() })
    .eq("id", ref.id);

  logSupabaseWriteError("tig_packages status", error);
  return { package: await getTigPackageByPublicId(packagePublicId), ok: !error, error: error ? "Állapotváltás sikertelen." : undefined };
}

export async function deleteTigPackage(packagePublicId: string): Promise<{ ok: boolean; error?: string }> {
  await requirePermission("tig.delete");
  const supabase = await getServerSupabaseClient();
  if (!supabase) return { ok: false, error: "Nincs adatbázis-kapcsolat." };

  const ref = await getTigPackageRef(packagePublicId);
  if (!ref) return { ok: false, error: "Nincs ilyen csomag." };
  if (ref.status !== "draft") return { ok: false, error: "Csak piszkozat törölhető." };

  const { error } = await supabase.from("tig_packages").delete().eq("id", ref.id);
  logSupabaseWriteError("tig_packages delete", error);
  return { ok: !error, error: error ? "Törlés sikertelen." : undefined };
}

// ─────────────────────────────────────────────────────────────────────────────
// TIG export – részletes csomag-adat a PDF/Excel generáláshoz
// ─────────────────────────────────────────────────────────────────────────────

export type TigExportPhoto = { type: string; url: string };

export type TigExportIssue = {
  id: string;
  title: string;
  location: string;
  area: string;
  trade: string;
  valueHuf: number;
  photos: TigExportPhoto[];
};

export type TigPackageDetail = {
  id: string;
  status: TigPackage["status"];
  subcontractor: { name: string; trade: string; contact: string; phone: string };
  project: { name: string; address: string; client: string };
  performanceDate?: string;
  periodStart?: string;
  periodEnd?: string;
  note?: string;
  netValueHuf: number;
  proofCount: number;
  createdAt: string;
  issues: TigExportIssue[];
};

export async function getTigPackageDetail(packagePublicId: string): Promise<TigPackageDetail | null> {
  const supabase = await getServerSupabaseClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("tig_packages")
    .select(
      "public_id, project_id, status, gross_value_huf, net_value_huf, performance_date, period_start, period_end, note, created_at, subcontractors(name, trade, contact_name, phone), projects(name, address, client), tig_package_issues(issues(public_id, title, location, area, trade, value_huf, issue_evidence(evidence_type, storage_path)))"
    )
    .eq("public_id", packagePublicId)
    .maybeSingle();

  logSupabaseReadError("tig package detail", error);
  if (error || !data) return null;

  // Hatokor-ellenorzes. A TIG export penzugyi adatot, alvallalkozoi
  // kapcsolattartot es fotokat is tartalmaz, ezert itt a repositoryban all a
  // kapu - nem csak a hivo route-ban -, hogy egy kesobbi uj hivo se
  // felejthesse ki. A nem lathato csomag ugyanugy "nincs ilyen", mint a nem
  // letezo: a valasz nem arulja el a letezeset.
  const scope = await getVisibilityScope();
  const packageProjectId = (data as { project_id?: string | null }).project_id;
  if (!scope.unrestricted && (!packageProjectId || !scopeAllowsProject(scope, packageProjectId))) {
    return null;
  }

  const row = data as unknown as {
    public_id: string;
    status: TigPackage["status"];
    gross_value_huf: number | string | null;
    net_value_huf: number | string | null;
    performance_date: string | null;
    period_start: string | null;
    period_end: string | null;
    note: string | null;
    created_at: string;
    subcontractors?: { name: string | null; trade: string | null; contact_name: string | null; phone: string | null } | null;
    projects?: { name: string | null; address: string | null; client: string | null } | null;
    tig_package_issues?: {
      issues?: {
        public_id: string;
        title: string;
        location: string | null;
        area: string | null;
        trade: string | null;
        value_huf: number | string | null;
        issue_evidence?: { evidence_type: string; storage_path: string | null }[] | null;
      } | null;
    }[] | null;
  };

  const issues: TigExportIssue[] = (row.tig_package_issues || [])
    .map((link) => link.issues)
    .filter((issue): issue is NonNullable<typeof issue> => Boolean(issue))
    .map((issue) => {
      const photos: TigExportPhoto[] = (issue.issue_evidence || [])
        .map((evidence) => ({ type: evidence.evidence_type, url: getIssueEvidencePublicUrl(evidence.storage_path) }))
        .filter((photo): photo is TigExportPhoto => Boolean(photo.url));
      return {
        id: issue.public_id,
        title: issue.title,
        location: issue.location || "",
        area: issue.area || "",
        trade: issue.trade || "",
        valueHuf: numberValue(issue.value_huf),
        photos
      };
    });

  const proofCount = issues.reduce((sum, issue) => sum + issue.photos.length, 0);

  return {
    id: row.public_id,
    status: row.status,
    subcontractor: {
      name: row.subcontractors?.name || "Nincs megadva",
      trade: row.subcontractors?.trade || "",
      contact: row.subcontractors?.contact_name || "",
      phone: row.subcontractors?.phone || ""
    },
    project: {
      name: row.projects?.name || "",
      address: row.projects?.address || "",
      client: row.projects?.client || ""
    },
    performanceDate: row.performance_date || undefined,
    periodStart: row.period_start || undefined,
    periodEnd: row.period_end || undefined,
    note: row.note || undefined,
    netValueHuf: numberValue(row.net_value_huf ?? row.gross_value_huf),
    proofCount,
    createdAt: dateOnly(row.created_at),
    issues
  };
}

