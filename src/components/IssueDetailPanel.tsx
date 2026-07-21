"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { EvidencePhoto, Issue, Subcontractor } from "@/types";
import { formatDate } from "@/lib/format";
import { getIssueTigReadiness } from "@/lib/issueMetrics";
import { getNextStatuses, issueStatusLabels } from "@/lib/workflow";
import { PriorityBadge, StatusBadge } from "@/components/StatusBadge";
import { SaveIcon, CloseIcon, PencilIcon, TrashIcon } from "@/components/ActionIcons";
import { EvidenceMetadataControls } from "@/components/EvidenceMetadataControls";
import { EvidencePhotoGallery } from "@/components/EvidencePhotoGallery";

type SaveState = {
  status: "idle" | "saving" | "saved" | "error";
  message: string;
};

export function IssueDetailPanel({
  projectId,
  issue,
  photos,
  subcontractors
}: {
  projectId: string;
  issue: Issue;
  photos: EvidencePhoto[];
  subcontractors: Subcontractor[];
}) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>({ status: "idle", message: "" });
  const [deleting, setDeleting] = useState(false);
  const tigReadiness = getIssueTigReadiness(issue, photos);
  const nextStatuses = getNextStatuses(issue, "project_manager");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);

    const payload = {
      title: String(formData.get("title") || ""),
      description: String(formData.get("description") || ""),
      location: String(formData.get("location") || ""),
      trade: String(formData.get("trade") || ""),
      priority: String(formData.get("priority") || "normal"),
      subcontractor: String(formData.get("subcontractor") || ""),
      assignee: String(formData.get("assignee") || ""),
      dueDate: String(formData.get("dueDate") || ""),
      valueHuf: Number(formData.get("valueHuf") || 0),
      status: String(formData.get("status") || issue.status)
    };

    if (!payload.title.trim() || !payload.location.trim() || !payload.subcontractor.trim() || !payload.dueDate) {
      setSaveState({ status: "error", message: "Kötelező mezők hiányoznak." });
      return;
    }

    setSaveState({ status: "saving", message: "Mentés folyamatban..." });

    const response = await fetch(`/api/issues/${issue.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    }).catch(() => null);

    if (!response?.ok) {
      setSaveState({ status: "error", message: "Mentési hiba: a módosítás nem sikerült." });
      return;
    }

    setSaveState({ status: "saved", message: "Hiba frissítve." });
    setIsEditing(false);
    router.refresh();
  }

  async function handleDelete() {
    if (!window.confirm(`Biztosan törlöd ezt a hibát: "${issue.title}"?`)) return;

    setDeleting(true);

    const response = await fetch(`/api/issues/${issue.id}`, { method: "DELETE" }).catch(() => undefined);

    if (!response?.ok) {
      setDeleting(false);
      window.alert("A törlés nem sikerült.");
      return;
    }

    router.push(`/projects/${projectId}/issues`);
    router.refresh();
  }

  return (
    <article className="card panel-large">
      <div className="section-title">
        <div className="section-title-left">
          <h2>Hiba adatai</h2>
          <StatusBadge status={issue.status} />
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
            <span>Műszaki leírás</span>
            <p>{issue.description || "Nincs megadva."}</p>
          </div>

          <div className="issue-detail-summary" aria-label="Hiba gyors áttekintés">
            <div className="issue-summary-card issue-summary-primary">
              <span>Felelős</span>
              <strong>{issue.subcontractor}</strong>
            </div>
            <div className="issue-summary-card">
              <span>Határidő</span>
              <strong>{formatDate(issue.dueDate)}</strong>
              <small><PriorityBadge priority={issue.priority} /></small>
            </div>
            <div className="issue-summary-card">
              <span>Helyszín</span>
              <strong>{issue.location}</strong>
            </div>
            <div className="issue-summary-card">
              <span>Szakág</span>
              <strong>{issue.trade}</strong>
            </div>
          </div>

          {!tigReadiness.ready ? (
            <div className="readiness-note">
              <strong>TIG-be jelöléshez még hiányzik</strong>
              <span>{tigReadiness.missing.join(", ")}</span>
            </div>
          ) : null}
        </>
      ) : (
        <form className="detail-edit-form" onSubmit={handleSubmit} suppressHydrationWarning>
          <div className="form-grid">
            <label>
              Hiba címe
              <input name="title" required defaultValue={issue.title} />
            </label>
            <label>
              Állapot
              <select name="status" defaultValue={issue.status}>
                <option value={issue.status}>{issueStatusLabels[issue.status]} (jelenlegi)</option>
                {nextStatuses.map((status) => (
                  <option key={status} value={status}>{issueStatusLabels[status]}</option>
                ))}
              </select>
            </label>
            <label>
              Helyszín
              <input name="location" required defaultValue={issue.location} />
            </label>
            <label>
              Szakág
              <input name="trade" defaultValue={issue.trade} />
            </label>
            <label>
              Prioritás
              <select name="priority" defaultValue={issue.priority}>
                <option value="low">Alacsony</option>
                <option value="normal">Normál</option>
                <option value="high">Magas</option>
                <option value="critical">Kritikus</option>
              </select>
            </label>
            <label>
              Alvállalkozó
              <select name="subcontractor" defaultValue={issue.subcontractor}>
                {subcontractors.map((sub) => (
                  <option key={sub.id} value={sub.name}>{sub.name} · {sub.trade}</option>
                ))}
              </select>
            </label>
            <label>
              Kiosztott / felelős neve
              <input name="assignee" defaultValue={issue.assignee} />
            </label>
            <label>
              Határidő
              <input name="dueDate" type="date" required defaultValue={issue.dueDate} />
            </label>
            <label>
              Becslés / TIG érték
              <input name="valueHuf" type="number" min="0" step="10000" defaultValue={issue.valueHuf} />
            </label>
            <label className="full">
              Leírás
              <textarea name="description" defaultValue={issue.description} />
            </label>
          </div>

          <div className="form-footer">
            {saveState.message ? (
              <span className={saveState.status === "error" ? "error-message" : "success-message"}>{saveState.message}</span>
            ) : <span />}
            <div className="form-actions">
              <button className="button danger" type="button" onClick={handleDelete} disabled={deleting}>
                <TrashIcon />
                {deleting ? "Törlés..." : "Hiba törlése"}
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

      <h2 className="block-heading">Fotók</h2>
      <EvidenceMetadataControls issueId={issue.id} />
      <EvidencePhotoGallery issue={issue} photos={photos} />
    </article>
  );
}
