"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { BlockerItem } from "@/types";
import { formatDate } from "@/lib/format";
import { blockerStatusLabels, blockerStatusOrder, getBlockerWorkflowHint } from "@/lib/blockerWorkflow";
import { BlockerStatusBadge, PriorityBadge } from "@/components/StatusBadge";
import { SaveIcon, CloseIcon, PencilIcon, TrashIcon } from "@/components/ActionIcons";

type SaveState = {
  status: "idle" | "saving" | "saved" | "error";
  message: string;
};

export function BlockerDetailPanel({ projectId, blocker }: { projectId: string; blocker: BlockerItem }) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>({ status: "idle", message: "" });
  const [deleting, setDeleting] = useState(false);

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
      status: String(formData.get("status") || blocker.status),
      resolutionNote: String(formData.get("resolutionNote") || ""),
      responsibleName: String(formData.get("responsibleName") || "")
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
      setSaveState({ status: "error", message: "Mentési hiba: a módosítás nem sikerült." });
      return;
    }

    setSaveState({ status: "saved", message: "Akadály frissítve." });
    setIsEditing(false);
    router.refresh();
  }

  async function handleDelete() {
    if (!window.confirm(`Biztosan törlöd ezt az akadályt: "${blocker.title}"?`)) return;

    setDeleting(true);

    const response = await fetch(`/api/projects/${projectId}/blockers/${blocker.publicId}`, { method: "DELETE" }).catch(() => undefined);

    if (!response?.ok) {
      setDeleting(false);
      window.alert("A törlés nem sikerült.");
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
        <button
          type="button"
          className={`edit-toggle-btn${isEditing ? " active" : ""}`}
          aria-label={isEditing ? "Szerkesztés bezárása" : "Szerkesztés"}
          aria-expanded={isEditing}
          onClick={() => setIsEditing((current) => !current)}
        >
          <PencilIcon />
        </button>
      </div>

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
          <div className="form-grid">
            <label>
              Cím
              <input name="title" required defaultValue={blocker.title} placeholder="Pl. Hiányzó tervrészlet" />
            </label>
            <label>
              Állapot
              <select name="status" defaultValue={blocker.status}>
                {blockerStatusOrder.map((status) => (
                  <option key={status} value={status}>{blockerStatusLabels[status]}</option>
                ))}
              </select>
            </label>
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
              Szakma
              <input name="trade" defaultValue={blocker.trade} placeholder="Pl. Burkolás" />
            </label>
            <label>
              Terület
              <input name="area" defaultValue={blocker.area} placeholder="Pl. Lépcsőház" />
            </label>
            <label>
              Felelős neve
              <input
                name="responsibleName"
                defaultValue={blocker.responsibleName === "Nincs megadva" ? "" : blocker.responsibleName}
                placeholder="Pl. Szabó Elek"
              />
            </label>
            <label className="full">
              Leírás
              <textarea name="description" required defaultValue={blocker.description} placeholder="Írd le röviden, mi akadályozza a munkát és mire van szükség a folytatáshoz." />
            </label>
            <label className="full">
              Megoldás / lezárás megjegyzése
              <textarea name="resolutionNote" defaultValue={blocker.resolutionNote} placeholder="Pl. Az anyag beérkezett, a javítás folytatható." />
            </label>
          </div>

          <div className="form-footer">
            {saveState.message ? (
              <span className={saveState.status === "error" ? "error-message" : "success-message"}>{saveState.message}</span>
            ) : <span />}
            <div className="form-actions">
              <button className="button danger" type="button" onClick={handleDelete} disabled={deleting}>
                <TrashIcon />
                {deleting ? "Törlés..." : "Akadály törlése"}
              </button>
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
    </article>
  );
}
