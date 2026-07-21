"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { SaveIcon } from "@/components/ActionIcons";

type SaveState = {
  status: "idle" | "saving" | "saved" | "error";
  message: string;
};

type Props = {
  mode: "create" | "edit";
  publicId?: string;
  initial?: {
    name: string;
    trade: string;
    contactName: string;
    phone: string;
  };
};

export function SubcontractorForm({ mode, publicId, initial }: Props) {
  const router = useRouter();
  const [saveState, setSaveState] = useState<SaveState>({ status: "idle", message: "" });

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const name = String(formData.get("name") || "").trim();

    if (!name) {
      setSaveState({ status: "error", message: "Kötelező mező: név." });
      return;
    }

    setSaveState({ status: "saving", message: "Mentés folyamatban..." });

    const payload = {
      name,
      trade: String(formData.get("trade") || ""),
      contactName: String(formData.get("contactName") || ""),
      phone: String(formData.get("phone") || "")
    };

    const response = await fetch(
      mode === "create" ? "/api/subcontractors" : `/api/subcontractors/${publicId}`,
      {
        method: mode === "create" ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      }
    ).catch(() => null);

    if (!response?.ok) {
      setSaveState({ status: "error", message: "Mentési hiba: ellenőrizd a kötelező mezőket." });
      return;
    }

    setSaveState({ status: "saved", message: "Alvállalkozó mentve." });
    router.push("/subcontractors");
    router.refresh();
  }

  return (
    <form className="card form-card" method="post" onSubmit={handleSubmit} suppressHydrationWarning>
      <div className="form-grid">
        <label>
          Név
          <input name="name" required defaultValue={initial?.name} placeholder="Pl. Burkoló Kft." suppressHydrationWarning />
        </label>
        <label>
          Szakma
          <input name="trade" defaultValue={initial?.trade} placeholder="Pl. Burkolás" suppressHydrationWarning />
        </label>
        <label>
          Kapcsolattartó
          <input name="contactName" defaultValue={initial?.contactName} placeholder="Pl. Nagy Péter" suppressHydrationWarning />
        </label>
        <label>
          Telefon
          <input name="phone" defaultValue={initial?.phone} placeholder="Pl. +36 20 444 7788" suppressHydrationWarning />
        </label>
      </div>

      <div className="form-footer">
        {saveState.message ? (
          <span className={saveState.status === "error" ? "error-message" : "success-message"}>{saveState.message}</span>
        ) : <span />}
        <button className="button primary" type="submit" disabled={saveState.status === "saving"}>
          <SaveIcon />
          {saveState.status === "saving" ? "Mentés..." : mode === "create" ? "Alvállalkozó létrehozása" : "Mentés"}
        </button>
      </div>
    </form>
  );
}
