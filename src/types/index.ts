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
/** A workflow-szabályokhoz használt szűkített szerepkészlet (lib/workflow.ts). */
export type UserRole = "admin" | "project_manager" | "site_manager" | "subcontractor" | "viewer";
/** A DB app_role enumja (supabase/migrations/20260710213835_profiles_project_members_baseline.sql). */
export type AppRole =
  | "admin"
  | "employer"
  | "project_manager"
  | "site_manager"
  | "worker"
  | "subcontractor"
  | "viewer";
export type EvidenceType = "before_photo" | "after_photo" | "document" | "comment" | "signature";

export type Project = {
  id: string;
  publicId: string;
  name: string;
  address: string;
  client: string;
  phase: string;
  progress: number;
};

export type Issue = {
  id: string;
  projectId: string;
  projectName: string;
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
  storagePath?: string;
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
  publicId: string;
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

export type TigPackageStatus = "draft" | "ready_for_review" | "approved" | "sent";

export type TigPackage = {
  id: string;
  /** A projekt publikus azonosítója (PRJ-xxx) – ugyanaz a kulcs, mint az Issue.projectId. */
  projectId: string;
  projectName?: string;
  subcontractor: string;
  status: TigPackageStatus;
  issueIds: string[];
  grossValueHuf: number;
  netValueHuf?: number;
  proofCount: number;
  performanceDate?: string;
  periodStart?: string;
  periodEnd?: string;
  note?: string;
  createdAt: string;
  updatedAt: string;
};

export type WorkLogStatus = "draft" | "submitted" | "reviewed" | "accepted" | "rejected";

export type WorkLog = {
  id: string;
  projectId: string;
  projectName: string;
  profileId: string;
  profileName: string;
  trade: string;
  workDate: string;
  description: string;
  quantity?: number;
  unit?: string;
  status: WorkLogStatus;
  createdAt: string;
  updatedAt: string;
};

export type BlockerStatus = "open" | "in_progress" | "waiting_external" | "resolved" | "closed" | "cancelled";
export type BlockerSeverity = "low" | "normal" | "high" | "critical";

export type BlockerItem = {
  id: string;
  publicId: string;
  projectId: string;
  projectName: string;
  createdByProfileId: string;
  createdByName: string;
  responsibleProfileId?: string;
  responsibleName: string;
  title: string;
  description: string;
  trade?: string;
  area?: string;
  status: BlockerStatus;
  severity: BlockerSeverity;
  resolutionNote?: string;
  resolvedAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type ProjectDocumentType = "architectural_plan" | "technical_plan" | "material_spec" | "photo_document" | "contract_document" | "other";
export type ProjectDocumentVisibility = "internal" | "project_team" | "workers" | "subcontractors" | "viewer_shared";

export type ProjectDocument = {
  id: string;
  projectId: string;
  projectName: string;
  uploadedByProfileId?: string;
  uploadedByName?: string;
  documentType: ProjectDocumentType;
  title: string;
  description?: string;
  trade?: string;
  area?: string;
  storagePath?: string;
  url?: string;
  fileName?: string;
  mimeType?: string;
  fileSizeBytes?: number;
  revision?: string;
  visibility: ProjectDocumentVisibility;
  isCurrent: boolean;
  archivedAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type PlanMeasurementType = "area" | "length";

export type PlanMeasurementPoint = { x: number; y: number };

export type PlanMeasurement = {
  id: string;
  documentId: string;
  pageNumber: number;
  measurementType: PlanMeasurementType;
  points: PlanMeasurementPoint[];
  calculatedValue: number;
  label?: string;
  note?: string;
  createdByProfileId?: string;
  createdAt: string;
};

// ── AI-alapu tervelemzes (tervfeldolgozas MVP) ──────────────────────────────

/** Honnan szarmazik egy ertek. A "PRINTED" (a terven kiirt szoveg) elonyben a
 *  kepbol becsulttel szemben - lasd a tervfeldolgozas kovetelmenyeit. */
export type PlanValueSource = "PRINTED" | "DIMENSION" | "CALCULATED" | "USER_ENTERED";

/** Normalizalt teglalap-kijeloles a tervlapon (0..1, a szelesseghez viszonyitva,
 *  ugyanugy mint a PlanMeasurementPoint). Igy barmilyen render-felbontasnal
 *  reprodukalhato. */
export type PlanSelectionRect = { x: number; y: number; w: number; h: number };

/** Egy, a PDF text-layerbol kiolvasott szoveg-elem, normalizalt kozeppel. A
 *  kliens gyujti ossze a kijelolt regioban, es kuldi a backendnek. */
export type PlanTextItem = { text: string; x: number; y: number };

/** Az elemzes strukturalt eredmenye. Az elemzo SOHA nem talal ki hianyzo
 *  erteket: ami nem olvashato biztosan, az null + warnings + alacsonyabb
 *  confidence. */
/** A helyiseg jellege - a szabaly-motor mas keptet hasznal furdo/wc vs terasz. */
export type RoomTakeoffKind = "wet" | "terrace" | "other";

/** A felmeresi mennyiseg-szamitas felmero-altal-allithato bemenetei. Ezekbol
 *  szamolja a szabaly-motor az AUTO tetel-mennyisegeket; a `manual` a kezi
 *  tetelek erteke ES az AUTO tetelek felulirasa (munkanem-kulcs -> mennyiseg). */
export type RoomTakeoff = {
  roomKind: RoomTakeoffKind;
  /** A padlo hidegburkolt-e (parketta/laminalt -> false, greslap/csempe -> true). */
  floorTiled: boolean;
  /** Mennyezetig burkolt-e a fal (ekkor a Fal magassaga = belmagassag). */
  tiledToCeiling: boolean;
  /** Burkolasi magassag (m), ha NEM mennyezetig. */
  tilingHeightM: number | null;
  /** Kell-e kiegyenlites (a Kiegyenl. csak ekkor szamolodik). */
  levelingNeeded: boolean;
  /** A Falbol levonando nyilaszaro-terulet a burkolt zonaban (m2). */
  wallOpeningDeductM2: number | null;
  /** A Labazatbol levonando (ajtok szelessege) (fm). */
  skirtingDeductM: number | null;
  /** Kezi tetel-ertekek + AUTO tetel felulirasa (munkanem-kulcs -> mennyiseg). */
  manual: Record<string, number>;
};

export type PlanAnalysisResult = {
  room: {
    code: string | null;
    name: string | null;
    printedFloorAreaM2: number | null;
    ceilingHeightM: number | null;
    floorFinish: string | null;
    /** Felmeresi mennyiseg-szamitas bemenetei (a felmero allitja; opcionalis). */
    takeoff?: RoomTakeoff | null;
    /** A felmero altal megadott (vagy kotabol felkinalt) meretek. A kerulet a
     *  fal/labazat/szalag/alapozas szamitas KULCSA - a felmero a terv kiirt
     *  kotaibol adja meg, nem rajzbol (pontosabb). */
    widthM?: number | null;
    depthM?: number | null;
    perimeterM?: number | null;
  };
  /** Mezonkenti forras (pl. { printedFloorAreaM2: "PRINTED" }). */
  fieldSources: Partial<Record<string, PlanValueSource>>;
  /** 0..1 kozotti osszesitett biztonsag. */
  confidence: number;
  warnings: string[];
};

/** A tervelemzeshez tarolt bemenet (mit szeretne szamitani a felhasznalo).
 *  MVP-ben csak a "room_info". A tobbi (kerulet, falfelulet, ...) kesobbi
 *  iteracio. */
export type PlanCalculationType = "room_info";

/** Elmentett tervelemzes (plan_analyses tabla). */
export type PlanAnalysis = {
  id: string;
  documentId: string;
  pageNumber: number;
  selection: PlanSelectionRect;
  calculationType: PlanCalculationType;
  result: PlanAnalysisResult;
  confidence: number;
  userVerified: boolean;
  createdByProfileId?: string;
  createdAt: string;
};

export type DashboardMetrics = {
  openIssues: number;
  overdueIssues: number;
  readyIssues: number;
  approvedIssues: number;
  tigValueHuf: number;
  missingProofCount: number;
};
