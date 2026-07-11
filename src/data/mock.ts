import type { Activity, BlockerItem, EvidencePhoto, Issue, IssueEvent, Project, Subcontractor, TigItem, TigPackage, WorkLog } from "@/types";

export const project: Project = {
  id: "project-bp13-001",
  name: "Budapest XIII. társasház felújítás",
  address: "Budapest XIII., Váci út 112.",
  client: "Duna Invest Zrt.",
  phase: "Belső befejező munkák",
  progress: 68
};

export const issues: Issue[] = [
  {
    id: "KIV-104",
    title: "Burkolat sérült a lépcsőháznál",
    description: "A földszinti lépcsőház bejáratánál 3 db járólap sarka sérült. Javítás után új fotó szükséges, mert a terület TIG bizonyítékba kerül.",
    location: "A épület · Földszint",
    area: "Lépcsőház",
    trade: "Burkolás",
    subcontractor: "Burkoló Kft.",
    assignee: "Nagy Péter",
    dueDate: "2026-07-08",
    status: "tig_ready",
    priority: "high",
    photosBefore: 3,
    photosAfter: 2,
    valueHuf: 420000,
    createdAt: "2026-07-02",
    updatedAt: "2026-07-06",
    tags: ["burkolat", "TIG", "fotó"]
  },
  {
    id: "KIV-112",
    title: "Hiányzó dugalj a nappaliban",
    description: "A B/203 lakás nappalijában a terv szerinti jobb oldali dugalj nem készült el.",
    location: "B épület · 2. emelet · B/203",
    area: "Lakásbelső",
    trade: "Villanyszerelés",
    subcontractor: "Elektro Pro Bt.",
    assignee: "Kiss Balázs",
    dueDate: "2026-07-05",
    status: "assigned",
    priority: "critical",
    photosBefore: 2,
    photosAfter: 0,
    valueHuf: 180000,
    createdAt: "2026-07-01",
    updatedAt: "2026-07-05",
    tags: ["villany", "lejárt"]
  },
  {
    id: "KIV-118",
    title: "Gépész strang takarás hiányos",
    description: "A gépészeti aknában a tűzgátló lezárás dokumentációja és fotója hiányzik.",
    location: "C épület · 4. emelet",
    area: "Gépészet",
    trade: "Gépészet",
    subcontractor: "Gépész Master Kft.",
    assignee: "Tóth Máté",
    dueDate: "2026-07-09",
    status: "in_progress",
    priority: "high",
    photosBefore: 4,
    photosAfter: 0,
    valueHuf: 760000,
    createdAt: "2026-07-03",
    updatedAt: "2026-07-06",
    tags: ["gépészet", "QA/QC"]
  },
  {
    id: "KIV-121",
    title: "Festési javítás a folyosón",
    description: "A folyosón több ponton javítófestés szükséges az átadás előtt.",
    location: "A épület · 1. emelet",
    area: "Közlekedő",
    trade: "Festés",
    subcontractor: "Color Team Kft.",
    assignee: "Varga Dénes",
    dueDate: "2026-07-11",
    status: "assigned",
    priority: "normal",
    photosBefore: 5,
    photosAfter: 0,
    valueHuf: 240000,
    createdAt: "2026-07-04",
    updatedAt: "2026-07-04",
    tags: ["festés"]
  },
  {
    id: "KIV-126",
    title: "Erkélykorlát rögzítési jegyzőkönyv hiányzik",
    description: "Az átadási dokumentációhoz hiányzik a korlát rögzítését igazoló jegyzőkönyv.",
    location: "B épület · 3. emelet",
    area: "Erkély",
    trade: "Lakatos munka",
    subcontractor: "AcélPont Kft.",
    assignee: "Szalai Ákos",
    dueDate: "2026-07-07",
    status: "rejected",
    priority: "high",
    photosBefore: 1,
    photosAfter: 0,
    valueHuf: 310000,
    createdAt: "2026-07-02",
    updatedAt: "2026-07-06",
    tags: ["dokumentum", "átadás"]
  },
  {
    id: "KIV-130",
    title: "Vizesblokk szilikonozás ellenőrzése",
    description: "A fürdőszobai szilikonozás több lakásban hullámos, átadás előtt ellenőrizni kell.",
    location: "A/B épület · több lakás",
    area: "Vizesblokk",
    trade: "Burkolás",
    subcontractor: "Burkoló Kft.",
    assignee: "Nagy Péter",
    dueDate: "2026-07-12",
    status: "open",
    priority: "normal",
    photosBefore: 0,
    photosAfter: 0,
    valueHuf: 190000,
    createdAt: "2026-07-06",
    updatedAt: "2026-07-06",
    tags: ["bejárás", "burkolat"]
  }
];

export const subcontractors: Subcontractor[] = [
  { id: "sub-1", name: "Elektro Pro Bt.", trade: "Villanyszerelés", contact: "Kiss Balázs", phone: "+36 30 111 2233", openIssues: 11, overdueIssues: 3, readyIssues: 2, weeklyClosureRate: 54 },
  { id: "sub-2", name: "Burkoló Kft.", trade: "Burkolás", contact: "Nagy Péter", phone: "+36 20 444 7788", openIssues: 8, overdueIssues: 1, readyIssues: 4, weeklyClosureRate: 76 },
  { id: "sub-3", name: "Gépész Master Kft.", trade: "Gépészet", contact: "Tóth Máté", phone: "+36 70 222 9911", openIssues: 6, overdueIssues: 2, readyIssues: 1, weeklyClosureRate: 48 },
  { id: "sub-4", name: "Color Team Kft.", trade: "Festés", contact: "Varga Dénes", phone: "+36 30 888 1234", openIssues: 4, overdueIssues: 0, readyIssues: 1, weeklyClosureRate: 82 }
];

export const activities: Activity[] = [
  { id: "a1", icon: "📷", title: "Javítás utáni fotó feltöltve", description: "Burkoló Kft. · KIV-104", time: "12 perce" },
  { id: "a2", icon: "🧾", title: "TIG piszkozat frissült", description: "3 új lezárt hiba kapcsolva", time: "38 perce" },
  { id: "a3", icon: "⚠️", title: "Határidő lejárt", description: "Elektro Pro Bt. · KIV-112", time: "tegnap 17:00" }
];

export const tigItems: TigItem[] = [
  { id: "tig-1", title: "Burkolat javítása lépcsőháznál", subcontractor: "Burkoló Kft.", valueHuf: 420000, proofCount: 5, included: true },
  { id: "tig-2", title: "Festési javítás közlekedőkben", subcontractor: "Color Team Kft.", valueHuf: 240000, proofCount: 4, included: true },
  { id: "tig-3", title: "Vizesblokk szilikonozási javítás", subcontractor: "Burkoló Kft.", valueHuf: 190000, proofCount: 2, included: false },
  { id: "tig-4", title: "Gépész strang dokumentált javítása", subcontractor: "Gépész Master Kft.", valueHuf: 760000, proofCount: 3, included: true }
];


export const evidencePhotos: EvidencePhoto[] = [
  { id: "photo-1", issueId: "KIV-104", type: "before_photo", label: "Sérült járólap közelről", uploadedBy: "Gábor művezető", uploadedAt: "2026-07-02 09:14" },
  { id: "photo-2", issueId: "KIV-104", type: "before_photo", label: "Lépcsőház áttekintő fotó", uploadedBy: "Gábor művezető", uploadedAt: "2026-07-02 09:15" },
  { id: "photo-3", issueId: "KIV-104", type: "after_photo", label: "Javítás után - 1", uploadedBy: "Nagy Péter", uploadedAt: "2026-07-06 13:22" },
  { id: "photo-4", issueId: "KIV-104", type: "after_photo", label: "Javítás után - 2", uploadedBy: "Nagy Péter", uploadedAt: "2026-07-06 13:25" },
  { id: "photo-5", issueId: "KIV-112", type: "before_photo", label: "Hiányzó dugalj helye", uploadedBy: "Gábor művezető", uploadedAt: "2026-07-01 11:03" },
  { id: "photo-6", issueId: "KIV-118", type: "before_photo", label: "Strang takarás állapota", uploadedBy: "Tóth Máté", uploadedAt: "2026-07-03 15:42" },
  { id: "photo-7", issueId: "KIV-126", type: "before_photo", label: "Korlát rögzítési pont", uploadedBy: "Szalai Ákos", uploadedAt: "2026-07-02 16:10" }
];

export const issueEvents: IssueEvent[] = [
  { id: "evt-1", issueId: "KIV-104", type: "created", title: "Hiba rögzítve", description: "Burkolat sérülés létrehozva fotókkal.", actor: "Gábor művezető", createdAt: "2026-07-02 09:16" },
  { id: "evt-2", issueId: "KIV-104", type: "assigned", title: "Kiosztva alvállalkozónak", description: "Burkoló Kft. kapta a javítást 2026-07-08 határidővel.", actor: "Projektvezető", createdAt: "2026-07-02 10:02" },
  { id: "evt-3", issueId: "KIV-104", type: "photo_uploaded", title: "Utána fotó feltöltve", description: "2 db javítás utáni fotó érkezett.", actor: "Nagy Péter", createdAt: "2026-07-06 13:25" },
  { id: "evt-4", issueId: "KIV-104", type: "status_changed", title: "Készre jelentve", description: "Ellenőrzésre vár a projektvezetőnél.", actor: "Nagy Péter", createdAt: "2026-07-06 13:27" },
  { id: "evt-5", issueId: "KIV-112", type: "created", title: "Hiba rögzítve", description: "Hiányzó dugalj a B/203 nappaliban.", actor: "Gábor művezető", createdAt: "2026-07-01 11:05" },
  { id: "evt-6", issueId: "KIV-112", type: "status_changed", title: "Határidő figyelmeztetés", description: "Automatikus figyelmeztetés: nincs készre jelentés.", actor: "Kivitely rendszer", createdAt: "2026-07-05 18:00" },
  { id: "evt-7", issueId: "KIV-118", type: "assigned", title: "Folyamatban", description: "Gépész Master Kft. dolgozik a javításon.", actor: "Projektvezető", createdAt: "2026-07-06 08:30" }
];

export const tigPackages: TigPackage[] = [
  {
    id: "TIG-2026-07-001",
    projectId: project.id,
    subcontractor: "Burkoló Kft.",
    status: "draft",
    issueIds: ["KIV-104", "KIV-130"],
    grossValueHuf: 610000,
    proofCount: 7,
    createdAt: "2026-07-06",
    updatedAt: "2026-07-06"
  },
  {
    id: "TIG-2026-07-002",
    projectId: project.id,
    subcontractor: "Gépész Master Kft.",
    status: "ready_for_review",
    issueIds: ["KIV-118"],
    grossValueHuf: 760000,
    proofCount: 3,
    createdAt: "2026-07-06",
    updatedAt: "2026-07-06"
  }
];

export const workLogs: WorkLog[] = [
  {
    id: "mock-work-log-1",
    projectId: project.id,
    projectName: project.name,
    profileId: "worker-mock-1",
    profileName: "Munkavallalo Teszt Anna",
    trade: "Burkolas",
    workDate: "2026-07-06",
    description: "Foldszinti lepcsohaz burkolasi elokeszites es feluletellenorzes.",
    quantity: 18.5,
    unit: "m2",
    status: "submitted",
    createdAt: "2026-07-06",
    updatedAt: "2026-07-06"
  },
  {
    id: "mock-work-log-2",
    projectId: project.id,
    projectName: project.name,
    profileId: "subcontractor-mock-1",
    profileName: "Supabase Burkolo Kft.",
    trade: "Burkolas",
    workDate: "2026-07-07",
    description: "Javitasi munka folytatasa, fuga hianyok ellenorzese es dokumentalasa.",
    quantity: 7,
    unit: "ora",
    status: "accepted",
    createdAt: "2026-07-07",
    updatedAt: "2026-07-07"
  }
];

export const blockerItems: BlockerItem[] = [
  {
    id: "mock-blocker-1",
    projectId: project.id,
    projectName: project.name,
    createdByProfileId: "worker-mock-1",
    createdByName: "Munkavallalo Teszt Anna",
    responsibleProfileId: "project-manager-mock-1",
    responsibleName: "Projektvezeto Teszt Elek",
    title: "Hianyzo burkolasi tervreszlet",
    description: "A foldszinti lepcsohaz javitasanal nincs egyertelmu tervreszlet a szegelykiosztashoz.",
    trade: "Burkolas",
    area: "Lepcsohaz",
    status: "waiting_external",
    severity: "high",
    createdAt: "2026-07-07",
    updatedAt: "2026-07-07"
  },
  {
    id: "mock-blocker-2",
    projectId: project.id,
    projectName: project.name,
    createdByProfileId: "subcontractor-mock-1",
    createdByName: "Supabase Burkolo Kft.",
    responsibleProfileId: "project-manager-mock-1",
    responsibleName: "Projektvezeto Teszt Elek",
    title: "Anyagkeses a fuga javitasnal",
    description: "A javitasi munkahoz szukseges fugazoanyag kesve erkezett.",
    trade: "Burkolas",
    area: "Furdoszoba",
    status: "resolved",
    severity: "normal",
    resolutionNote: "Az anyag beerkezett, a javitas folytathato.",
    resolvedAt: "2026-07-08",
    createdAt: "2026-07-07",
    updatedAt: "2026-07-08"
  }
];

export function findIssue(id: string) {
  return issues.find((issue) => issue.id === id);
}
