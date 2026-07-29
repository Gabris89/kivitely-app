"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { BlockerItem, UserRole } from "@/types";
import { formatDate } from "@/lib/format";
import { can, canEditBlocker } from "@/lib/permissions";
import { blockerStatusLabels, blockerStatusOrder, getBlockerWorkflowHint } from "@/lib/blockerWorkflow";
import { BlockerStatusBadge, PriorityBadge } from "@/components/StatusBadge";
import { SaveIcon, CloseIcon, PencilIcon, TrashIcon } from "@/components/ActionIcons";
import { ConfirmDialog } from "@/components/ConfirmDialog";

type SaveState = {
  status: "idle" | "saving" | "saved" | "error";
  message: string;
};

export function BlockerDetailPanel({
  projectId,
  blocker,
  role,
  currentProfileId = null
}: {
  projectId: string;
  blocker: BlockerItem;
  /** A bejelentkezett felhasznalo szerepe. Teljes szerkesztes (allapot,
      felelos, megoldas-jegyzet) csak blocker.update joggal. Az alvallalkozo
      a sajat, meg Nyitott akadalyanak a leiro mezoit javithatja - a szerver
      ugyanezt ellenorzi (authorizeBlockerUpdate). */
  role: UserRole;
  /** A bejelentkezett felhasznalo profil-azonositoja a tulajdonos-teszthez. */
  currentProfileId?: string | null;
}) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>({ status: "idle", message: "" });
  const [deleting, setDeleting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  // Ugyanaz a matrix dont, mint a szerveren - a gomb el sem jelenik meg,
  // ha a szerep ugysem tudna hasznalni.
  // canEditWorkflowFields: a vezetoi dontesek (allapot, felelos, megoldas).
  // canEdit: ezen felul a bejelento sajat, meg Nyitott akadalya is javithato.
  const canEditWorkflowFields = can(role, "blocker.update");
  const canEdit = canEditBlocker(role, blocker, currentProfileId);
  const canDelete = can(role, "blocker.delete");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);

    const payload = {
      title: String(formData.get("title") || ""),
      description: String(formData.get("description") || ""),
      trade: String(formData.get("trade") || ""),
      area: String(formData.get("area") || ""),
      severity: String(formData.get("severity") || "normal"),
      // A rejtett (vezetoi) mezoket nem uritjuk ki: ha nincs a formban,
      // a jelenlegi ertek megy vissza. A szerver ugyanezt ujra kikenyszeriti.
      status: String(formData.get("status") ?? blocker.status),
      resolutionNote: String(formData.get("resolutionNote") ?? blocker.resolutionNote ?? ""),
      responsibleName: String(
        formData.get("responsibleName") ??
          (blocker.responsibleName === "Nincs megadva" ? "" : blocker.responsibleName)
      )
    };

    if (!payload.title.trim() || !payload.description.trim()) {
      setSaveState({ status: "error", message: "Kötelező mező: cím és leírás." });
      return;
    }

    setSaveState({ status: "saving", message: "Mentés folyamatban..." });

    const response = await fetch(`/api/projects/${projectId}/blockers/${blocker.publicId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    }).catch(() => null);

    if (!response?.ok) {
      const json = await response?.json().catch(() => null);
      setSaveState({ status: "error", message: json?.error || "Mentési hiba: a módosítás nem sikerült." });
      return;
    }

    setSaveState({ status: "saved", message: "Akadály frissítve." });
    setIsEditing(false);
    router.refresh();
  }

  async function handleDelete() {
    setConfirmOpen(false);
    setDeleting(true);

    const response = await fetch(`/api/projects/${projectId}/blockers/${blocker.publicId}`, { method: "DELETE" }).catch(() => undefined);

    if (!response?.ok) {
      const json = await response?.json().catch(() => null);
      setDeleting(false);
      setSaveState({ status: "error", message: json?.error || "A törlés nem sikerült." });
      return;
    }

    router.push(`/projects/${projectId}/blockers`);
    router.refresh();
  }

  return (
    <article className="card panel-large">
      <div className="section-title">
        <div className="section-title-left">
          <h2>Akadály adatai</h2>
          <BlockerStatusBadge status={blocker.status} />
        </div>
        <div className="section-title-actions">
          {canDelete ? (
            <button
              type="button"
              className="icon-btn"
              aria-label="Törlés"
              title="Törlés"
              disabled={deleting}
              onClick={() => setConfirmOpen(true)}
            >
              <TrashIcon />
            </button>
          ) : null}
          {canEdit ? (
            <button
              type="button"
              className={`edit-toggle-btn${isEditing ? " active" : ""}`}
              aria-label={isEditing ? "Szerkesztés bezárása" : "Szerkesztés"}
              aria-expanded={isEditing}
              onClick={() => setIsEditing((current) => !current)}
            >
              <PencilIcon />
            </button>
          ) : null}
        </div>
      </div>

      {/* Lasd IssueDetailPanel: a sikeres mentes uzenete az urlapon belul volt,
          ami mentesnel bezarul - igy a visszajelzes sosem latszott. */}
      {!isEditing && saveState.status === "saved" ? (
        <p className="inline-note success-message">{saveState.message}</p>
      ) : null}

      {!isEditing ? (
        <>
          <div className="technical-description">
            <span>Leírás</span>
            <p>{blocker.description}</p>
          </div>

          <div className="issue-detail-summary" aria-label="Akadály gyors áttekintés">
            <div className="issue-summary-card issue-summary-primary">
              <span>Felelős</span>
              <strong>{blocker.responsibleName}</strong>
            </div>
            <div className="issue-summary-card">
              <span>Súlyosság</span>
              <strong><PriorityBadge priority={blocker.severity} /></strong>
            </div>
            <div className="issue-summary-card">
              <span>Szakma / terület</span>
              <strong>{[blocker.trade, blocker.area].filter(Boolean).join(" · ") || "Nincs megadva"}</strong>
            </div>
            <div className="issue-summary-card">
              <span>Létrehozva</span>
              <strong>{formatDate(blocker.createdAt)}</strong>
            </div>
          </div>

          <div className="readiness-note">
            <strong>{getBlockerWorkflowHint(blocker.status)}</strong>
            {blocker.resolutionNote ? <span>Megoldás: {blocker.resolutionNote}</span> : null}
            {blocker.resolvedAt ? <span>Megoldva/lezárva: {formatDate(blocker.resolvedAt)}</span> : null}
          </div>
        </>
      ) : (
        <form className="detail-edit-form" onSubmit={handleSubmit} suppressHydrationWarning>
          {!canEditWorkflowFields ? (
            <p className="inline-note">
              Saját bejelentés javítása: a leírást, szakágat, területet és súlyosságot módosíthatod,
              amíg az akadály Nyitott állapotban van. Az állapotot és a felelőst a projektvezetés állítja be.
            </p>
          ) : null}
          <div className="form-grid">
            <label>
              <span className="visually-hidden">Cím</span>
              <input name="title" required defaultValue={blocker.title} placeholder="Cím" />
            </label>
            {canEditWorkflowFields ? (
              <label>
                Állapot
                <select name="status" defaultValue={blocker.status}>
                  {blockerStatusOrder.map((status) => (
                    <option key={status} value={status}>{blockerStatusLabels[status]}</option>
                  ))}
                </select>
              </label>
            ) : null}
            <label>
              Súlyosság
              <select name="severity" defaultValue={blocker.severity}>
                <option value="low">Alacsony</option>
                <option value="normal">Normál</option>
                <option value="high">Magas</option>
                <option value="critical">Kritikus</option>
              </select>
            </label>
            <label>
              <span className="visually-hidden">Szakma</span>
              <input name="trade" defaultValue={blocker.trade} placeholder="Szakma" />
            </label>
            <label>
              <span className="visually-hidden">Terület</span>
              <input name="area" defaultValue={blocker.area} placeholder="Terület" />
            </label>
            {canEditWorkflowFields ? (
              <label>
                <span className="visually-hidden">Felelős neve</span>
                <input
                  name="responsibleName"
                  defaultValue={blocker.responsibleName === "Nincs megadva" ? "" : blocker.responsibleName}
                  placeholder="Felelős neve"
                />
              </label>
            ) : null}
            <label className="full">
              <span className="visually-hidden">Leírás</span>
              <textarea name="description" required defaultValue={blocker.description} placeholder="Írd le röviden, mi akadályozza a munkát és mire van szükség a folytatáshoz." />
            </label>
            {canEditWorkflowFields ? (
              <label className="full">
                <span className="visually-hidden">Megoldás / lezárás megjegyzése</span>
                <textarea name="resolutionNote" defaultValue={blocker.resolutionNote} placeholder="Megoldás / lezárás megjegyzése" />
              </label>
            ) : null}
          </div>

          <div className="form-footer">
            {saveState.message ? (
              <span className={saveState.status === "error" ? "error-message" : "success-message"}>{saveState.message}</span>
            ) : <span />}
            <div className="form-actions">
              <button className="button ghost" type="button" onClick={() => setIsEditing(false)}>
                <CloseIcon />
                Mégse
              </button>
              <button className="button primary" type="submit" disabled={saveState.status === "saving"}>
                <SaveIcon />
                {saveState.status === "saving" ? "Mentés..." : "Mentés"}
              </button>
            </div>
          </div>
        </form>
      )}

      <ConfirmDialog
        open={confirmOpen}
        title="Akadály törlése"
        message={`Biztosan törlöd ezt az akadályt: "${blocker.title}"? Ez nem visszavonható.`}
        onConfirm={handleDelete}
        onCancel={() => setConfirmOpen(false)}
      />
    </article>
  );
}
