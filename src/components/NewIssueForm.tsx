"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import { project, subcontractors } from "@/data/mock";

type SaveState = {
  status: "idle" | "saving" | "saved" | "error";
  message: string;
};

export function NewIssueForm() {
  const [saveState, setSaveState] = useState<SaveState>({ status: "idle", message: "" });

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;

    if (window.location.search) {
      window.history.replaceState(null, "", window.location.pathname);
    }

    setSaveState({ status: "saving", message: "Hiba mentése folyamatban..." });

    const formData = new FormData(form);
    const payload = {
      title: String(formData.get("title") || ""),
      project: String(formData.get("project") || ""),
      location: String(formData.get("location") || ""),
      trade: String(formData.get("trade") || ""),
      priority: String(formData.get("priority") || "normal"),
      subcontractor: String(formData.get("subcontractor") || ""),
      dueDate: String(formData.get("dueDate") || ""),
      valueHuf: Number(formData.get("valueHuf") || 0),
      description: String(formData.get("description") || "")
    };

    const response = await fetch("/api/issues", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    }).catch(() => null);

    if (!response?.ok) {
      setSaveState({ status: "error", message: "Mentési hiba: ellenőrizd a kötelező mezőket." });
      return;
    }

    const result = await response.json();
    const modeLabel = result.mode === "supabase" ? "Supabase" : "mock fallback";
    setSaveState({ status: "saved", message: `Hiba rögzítve (${modeLabel}): ${result.data.id}` });
  }

  return (
    <form className="card form-card" method="post" onSubmit={handleSubmit} suppressHydrationWarning>
      <div className="form-grid">
        <label>
          Hiba címe
          <input name="title" required placeholder="Pl. Sérült burkolat a lépcsőháznál" suppressHydrationWarning />
        </label>
        <label>
          Projekt
          <input name="project" defaultValue={project.name} required suppressHydrationWarning />
        </label>
        <label>
          Helyszín
          <input name="location" required placeholder="A épület · 1. emelet · folyosó" suppressHydrationWarning />
        </label>
        <label>
          Szakág
          <select name="trade" defaultValue="Burkolás" suppressHydrationWarning>
            <option value="Burkolás">Burkolás</option>
            <option value="Villanyszerelés">Villanyszerelés</option>
            <option value="Gépészet">Gépészet</option>
            <option value="Festés">Festés</option>
            <option value="Lakatos munka">Lakatos munka</option>
            <option value="Egyéb">Egyéb</option>
          </select>
        </label>
        <label>
          Prioritás
          <select name="priority" defaultValue="normal" suppressHydrationWarning>
            <option value="low">Alacsony</option>
            <option value="normal">Normál</option>
            <option value="high">Magas</option>
            <option value="critical">Kritikus</option>
          </select>
        </label>
        <label>
          Alvállalkozó
          <select name="subcontractor" defaultValue={subcontractors[0].name} suppressHydrationWarning>
            {subcontractors.map((sub) => (
              <option key={sub.id} value={sub.name}>
                {sub.name} · {sub.trade}
              </option>
            ))}
          </select>
        </label>
        <label>
          Határidő
          <input name="dueDate" type="date" defaultValue="2026-07-10" required suppressHydrationWarning />
        </label>
        <label>
          Becslés / TIG érték
          <input name="valueHuf" type="number" defaultValue="250000" min="0" step="10000" suppressHydrationWarning />
        </label>
        <label className="full">
          Leírás
          <textarea name="description" placeholder="Írd le röviden, mit kell javítani, mit vársz bizonyítékként, és mi alapján fogadod el." suppressHydrationWarning />
        </label>
        <div className="upload-box full">
          <strong>Fotók feltöltése</strong>
          <span>Mock állapot: itt később kamera, galéria és Supabase Storage feltöltés lesz.</span>
        </div>
      </div>

      <div className="form-footer">
        {saveState.message ? <span className={saveState.status === "error" ? "error-message" : "success-message"}>{saveState.message}</span> : <span />}
        <button className="button primary" type="submit" disabled={saveState.status === "saving"}>
          {saveState.status === "saving" ? "Mentés..." : "Hiba rögzítése"}
        </button>
      </div>
    </form>
  );
}
