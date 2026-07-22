"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Project } from "@/types";
import { SaveIcon, CloseIcon, PencilIcon, TrashIcon } from "@/components/ActionIcons";
import { ConfirmDialog } from "@/components/ConfirmDialog";

type SaveState = {
  status: "idle" | "saving" | "saved" | "error";
  message: string;
};

export function ProjectDetailPanel({ project }: { project: Project }) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>({ status: "idle", message: "" });
  const [deleting, setDeleting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);

    const payload = {
      name: String(formData.get("name") || ""),
      address: String(formData.get("address") || ""),
      client: String(formData.get("client") || ""),
      phase: String(formData.get("phase") || ""),
      progress: Number(formData.get("progress") || 0)
    };

    if (!payload.name.trim()) {
      setSaveState({ status: "error", message: "Kötelező mező: projekt neve." });
      return;
    }

    setSaveState({ status: "saving", message: "Mentés folyamatban..." });

    const response = await fetch(`/api/projects/${project.publicId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    }).catch(() => null);

    if (!response?.ok) {
      setSaveState({ status: "error", message: "Mentési hiba: a módosítás nem sikerült." });
      return;
    }

    setSaveState({ status: "saved", message: "Projekt frissítve." });
    setIsEditing(false);
    router.refresh();
  }

  async function handleDelete() {
    setConfirmOpen(false);
    setDeleting(true);

    const response = await fetch(`/api/projects/${project.publicId}`, { method: "DELETE" }).catch(() => undefined);

    if (!response?.ok) {
      setDeleting(false);
      window.alert("A törlés nem sikerült.");
      return;
    }

    router.push("/projects");
    router.refresh();
  }

  return (
    <article className="card panel-large">
      <div className="section-title">
        <div className="section-title-left">
          <h2>Projekt adatai</h2>
        </div>
        <div className="section-title-actions">
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
      </div>

      {!isEditing ? (
        <div className="issue-detail-summary" aria-label="Projekt gyors áttekintés">
          <div className="issue-summary-card issue-summary-primary">
            <span>Ügyfél</span>
            <strong>{project.client || "Nincs megadva"}</strong>
          </div>
          <div className="issue-summary-card">
            <span>Cím</span>
            <strong>{project.address || "Nincs megadva"}</strong>
          </div>
          <div className="issue-summary-card">
            <span>Fázis</span>
            <strong>{project.phase || "Nincs megadva"}</strong>
          </div>
          <div className="issue-summary-card">
            <span>Készültség</span>
            <strong>{project.progress}%</strong>
          </div>
        </div>
      ) : (
        <form className="detail-edit-form" onSubmit={handleSubmit} suppressHydrationWarning>
          <div className="form-grid">
            <label>
              <span className="visually-hidden">Projekt neve</span>
              <input name="name" required defaultValue={project.name} placeholder="Projekt neve" />
            </label>
            <label>
              <span className="visually-hidden">Ügyfél</span>
              <input name="client" defaultValue={project.client} placeholder="Ügyfél" />
            </label>
            <label>
              <span className="visually-hidden">Cím</span>
              <input name="address" defaultValue={project.address} placeholder="Cím" />
            </label>
            <label>
              <span className="visually-hidden">Fázis</span>
              <input name="phase" defaultValue={project.phase} placeholder="Fázis" />
            </label>
            <label>
              <span className="visually-hidden">Készültség (%)</span>
              <input name="progress" type="number" min={0} max={100} defaultValue={project.progress} placeholder="Készültség (%)" />
            </label>
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
        title="Projekt törlése"
        message={`Biztosan véglegesen törlöd a(z) "${project.name}" projektet? Ezzel az összes hozzá tartozó hiba, akadály, dokumentum és munkanapló is törlődik. Ez nem visszavonható.`}
        onConfirm={handleDelete}
        onCancel={() => setConfirmOpen(false)}
      />
    </article>
  );
}
