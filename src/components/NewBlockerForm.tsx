"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import Link from "next/link";
import { CloseIcon, SaveIcon } from "@/components/ActionIcons";

type SaveState = {
  status: "idle" | "saving" | "saved" | "error";
  message: string;
};

const responsibleOptions = [
  "",
  "Projektvezeto Teszt Elek",
  "Kivitely Admin",
  "Munkavallalo Teszt Anna",
  "Supabase Burkolo Kft."
];

export function NewBlockerForm({ projectId }: { projectId: string }) {
  const [saveState, setSaveState] = useState<SaveState>({ status: "idle", message: "" });

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;

    if (window.location.search) {
      window.history.replaceState(null, "", window.location.pathname);
    }

    setSaveState({ status: "saving", message: "Akadály mentése folyamatban..." });

    const formData = new FormData(form);
    const payload = {
      title: String(formData.get("title") || ""),
      description: String(formData.get("description") || ""),
      trade: String(formData.get("trade") || ""),
      area: String(formData.get("area") || ""),
      severity: String(formData.get("severity") || "normal"),
      responsibleName: String(formData.get("responsibleName") || "")
    };

    const response = await fetch(`/api/projects/${projectId}/blockers`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    }).catch(() => null);

    if (!response?.ok) {
      setSaveState({ status: "error", message: "Mentési hiba: ellenőrizd a kötelező mezőket." });
      return;
    }

    const result = await response.json();
    if (result.mode !== "supabase") {
      setSaveState({ status: "error", message: "A mentés nem sikerült, ezért nem kerül be az Akadálylistába." });
      return;
    }

    setSaveState({ status: "saved", message: `Akadály rögzítve: ${result.data.title}` });
    form.reset();
  }

  return (
    <form className="card form-card" method="post" onSubmit={handleSubmit} suppressHydrationWarning>
      <div className="form-grid">
        <label>
          <span className="visually-hidden">Cím</span>
          <input name="title" required placeholder="Cím" />
        </label>
        <label>
          Súlyosság
          <select name="severity" defaultValue="normal">
            <option value="low">Alacsony</option>
            <option value="normal">Normál</option>
            <option value="high">Magas</option>
            <option value="critical">Kritikus</option>
          </select>
        </label>
        <label>
          <span className="visually-hidden">Szakma</span>
          <input name="trade" placeholder="Szakma" />
        </label>
        <label>
          <span className="visually-hidden">Terület</span>
          <input name="area" placeholder="Terület" />
        </label>
        <label className="full">
          Felelős
          <select name="responsibleName" defaultValue="">
            {responsibleOptions.map((name) => (
              <option key={name || "none"} value={name}>
                {name || "Nincs kijelölve"}
              </option>
            ))}
          </select>
        </label>
        <label className="full">
          <span className="visually-hidden">Leírás</span>
          <textarea name="description" required placeholder="Írd le röviden, mi akadályozza a munkát és mire van szükség a folytatáshoz." />
        </label>
      </div>

      <div className="form-footer">
        <Link className="button ghost" href={`/projects/${projectId}/blockers`}>
          <CloseIcon />
          Vissza
        </Link>
        <div className="form-actions">
          {saveState.message ? <span className={saveState.status === "error" ? "error-message" : "success-message"}>{saveState.message}</span> : null}
          <button className="button primary" type="submit" disabled={saveState.status === "saving"}>
            <SaveIcon />
            {saveState.status === "saving" ? "Mentés..." : "Akadály rögzítése"}
          </button>
        </div>
      </div>
    </form>
  );
}
