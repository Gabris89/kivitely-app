"use client";

import type { ChangeEvent, FormEvent } from "react";
import { useState } from "react";
import Link from "next/link";
import type { Subcontractor } from "@/types";
import { SaveIcon, CloseIcon } from "@/components/ActionIcons";

type SaveState = {
  status: "idle" | "saving" | "saved" | "error";
  message: string;
  issueId?: string;
};

type RequiredIssueField = "title" | "location" | "trade" | "priority" | "subcontractor" | "dueDate";

const requiredFields: Array<{ name: RequiredIssueField; label: string }> = [
  { name: "title", label: "hiba címe" },
  { name: "location", label: "helyszín" },
  { name: "trade", label: "szakág" },
  { name: "priority", label: "prioritás" },
  { name: "subcontractor", label: "alvállalkozó" },
  { name: "dueDate", label: "határidő" }
];

export function NewIssueForm({
  projectId,
  projectName,
  subcontractors
}: {
  projectId: string;
  projectName: string;
  subcontractors: Subcontractor[];
}) {
  const [saveState, setSaveState] = useState<SaveState>({ status: "idle", message: "" });
  const [invalidFields, setInvalidFields] = useState<Set<string>>(new Set());

  function isInvalid(field: RequiredIssueField) {
    return invalidFields.has(field);
  }

  function handleFormChange(event: ChangeEvent<HTMLFormElement>) {
    const target = event.target;

    if (!(target instanceof HTMLInputElement || target instanceof HTMLSelectElement || target instanceof HTMLTextAreaElement)) {
      return;
    }

    if (!target.name || !invalidFields.has(target.name) || !target.value.trim()) {
      return;
    }

    setInvalidFields((current) => {
      const next = new Set(current);
      next.delete(target.name);
      return next;
    });
  }

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
      location: String(formData.get("location") || ""),
      trade: String(formData.get("trade") || ""),
      priority: String(formData.get("priority") || "normal"),
      subcontractor: String(formData.get("subcontractor") || ""),
      dueDate: String(formData.get("dueDate") || ""),
      valueHuf: Number(formData.get("valueHuf") || 0),
      description: String(formData.get("description") || "")
    };

    const missingFields = requiredFields.filter((field) => !String(formData.get(field.name) || "").trim());

    if (missingFields.length > 0) {
      setInvalidFields(new Set(missingFields.map((field) => field.name)));
      setSaveState({
        status: "error",
        message: `Kötelező mezők hiányoznak: ${missingFields.map((field) => field.label).join(", ")}.`
      });
      return;
    }

    setInvalidFields(new Set());

    const response = await fetch(`/api/projects/${projectId}/issues`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    }).catch(() => null);

    if (!response?.ok) {
      setSaveState({ status: "error", message: "Mentési hiba: ellenőrizd a kötelező mezőket." });
      return;
    }

    const result = await response.json();
    setSaveState({ status: "saved", message: `Hiba rögzítve: ${result.data.id}. Képet a hiba részletezőn tudsz feltölteni.`, issueId: result.data.id });
  }

  return (
    <form className="card form-card" method="post" noValidate onChange={handleFormChange} onSubmit={handleSubmit} suppressHydrationWarning>
      <div className="form-grid">
        <label className={isInvalid("title") ? "field-error" : undefined}>
          Hiba címe
          <input name="title" aria-invalid={isInvalid("title")} placeholder="Pl. Sérült burkolat a lépcsőháznál" suppressHydrationWarning />
        </label>
        <label>
          Projekt
          <input defaultValue={projectName} readOnly suppressHydrationWarning />
        </label>
        <label className={isInvalid("location") ? "field-error" : undefined}>
          Helyszín
          <input name="location" aria-invalid={isInvalid("location")} placeholder="A épület · 1. emelet · folyosó" suppressHydrationWarning />
        </label>
        <label className={isInvalid("trade") ? "field-error" : undefined}>
          Szakág
          <select name="trade" defaultValue="" aria-invalid={isInvalid("trade")} suppressHydrationWarning>
            <option value="" disabled>Válassz szakágat</option>
            <option value="Burkolás">Burkolás</option>
            <option value="Villanyszerelés">Villanyszerelés</option>
            <option value="Gépészet">Gépészet</option>
            <option value="Festés">Festés</option>
            <option value="Lakatos munka">Lakatos munka</option>
            <option value="Egyéb">Egyéb</option>
          </select>
        </label>
        <label className={isInvalid("priority") ? "field-error" : undefined}>
          Prioritás
          <select name="priority" defaultValue="" aria-invalid={isInvalid("priority")} suppressHydrationWarning>
            <option value="" disabled>Válassz prioritást</option>
            <option value="low">Alacsony</option>
            <option value="normal">Normál</option>
            <option value="high">Magas</option>
            <option value="critical">Kritikus</option>
          </select>
        </label>
        <label className={isInvalid("subcontractor") ? "field-error" : undefined}>
          Alvállalkozó
          <select name="subcontractor" defaultValue="" aria-invalid={isInvalid("subcontractor")} suppressHydrationWarning>
            <option value="" disabled>Válassz alvállalkozót</option>
            {subcontractors.map((sub) => (
              <option key={sub.id} value={sub.name}>
                {sub.name} · {sub.trade}
              </option>
            ))}
          </select>
        </label>
        <label className={isInvalid("dueDate") ? "field-error" : undefined}>
          Határidő
          <input name="dueDate" type="date" aria-invalid={isInvalid("dueDate")} suppressHydrationWarning />
        </label>
        <label>
          Becslés / TIG érték
          <input name="valueHuf" type="number" placeholder="Pl. 250000" min="0" step="10000" suppressHydrationWarning />
        </label>
        <label className="full">
          Leírás
          <textarea name="description" placeholder="Írd le röviden, mit kell javítani, mit vársz bizonyítékként, és mi alapján fogadod el." suppressHydrationWarning />
        </label>
        <p className="form-help full">Képet a hiba létrehozása után, a részletező oldalon tudsz feltölteni.</p>
      </div>

      <div className="form-footer">
        <div className="form-actions">
          <Link className="button ghost" href={`/projects/${projectId}/issues`}><CloseIcon />Mégse</Link>
          {saveState.status === "saved" && saveState.issueId ? (
            <Link className="button primary" href={`/projects/${projectId}/issues/${saveState.issueId}`}>Megnyitás</Link>
          ) : null}
          <button className="button primary" type="submit" disabled={saveState.status === "saving"}>
            <SaveIcon />
            {saveState.status === "saving" ? "Mentés..." : "Hiba rögzítése"}
          </button>
        </div>
        {saveState.message ? <span className={saveState.status === "error" ? "error-message" : "success-message"}>{saveState.message}</span> : null}
      </div>
    </form>
  );
}
