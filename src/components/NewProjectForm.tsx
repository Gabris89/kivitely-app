"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import Link from "next/link";

type SaveState = {
  status: "idle" | "saving" | "saved" | "error";
  message: string;
  projectId?: string;
};

export function NewProjectForm() {
  const [saveState, setSaveState] = useState<SaveState>({ status: "idle", message: "" });

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;

    setSaveState({ status: "saving", message: "Projekt mentése folyamatban..." });

    const formData = new FormData(form);
    const payload = {
      name: String(formData.get("name") || ""),
      address: String(formData.get("address") || ""),
      client: String(formData.get("client") || ""),
      phase: String(formData.get("phase") || "")
    };

    if (!payload.name.trim()) {
      setSaveState({ status: "error", message: "Kötelező mező: projekt neve." });
      return;
    }

    const response = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    }).catch(() => null);

    if (!response?.ok) {
      setSaveState({ status: "error", message: "Mentési hiba: ellenőrizd a kötelező mezőket." });
      return;
    }

    const result = await response.json();
    setSaveState({ status: "saved", message: `Projekt létrehozva: ${result.data.name}.`, projectId: result.data.publicId });
    form.reset();
  }

  return (
    <form className="card form-card" method="post" onSubmit={handleSubmit} suppressHydrationWarning>
      <div className="form-grid">
        <label>
          Projekt neve
          <input name="name" required placeholder="Pl. Váci út 45. irodaház" suppressHydrationWarning />
        </label>
        <label>
          Fázis
          <input name="phase" placeholder="Pl. Kivitelezés" suppressHydrationWarning />
        </label>
        <label>
          Cím
          <input name="address" placeholder="Pl. 1132 Budapest, Váci út 45." suppressHydrationWarning />
        </label>
        <label>
          Megrendelő
          <input name="client" placeholder="Pl. Kivitely Beruházó Kft." suppressHydrationWarning />
        </label>
      </div>

      <div className="form-footer">
        {saveState.message ? (
          <span className={saveState.status === "error" ? "error-message" : "success-message"}>{saveState.message}</span>
        ) : <span />}
        <div className="form-actions">
          {saveState.status === "saved" && saveState.projectId ? (
            <Link className="button primary" href={`/projects/${saveState.projectId}`}>Megnyitás</Link>
          ) : null}
          <button className="button primary" type="submit" disabled={saveState.status === "saving"}>
            {saveState.status === "saving" ? "Mentés..." : "Projekt létrehozása"}
          </button>
        </div>
      </div>
    </form>
  );
}
