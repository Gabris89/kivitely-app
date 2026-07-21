"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";

type SaveState = {
  status: "idle" | "saving" | "saved" | "error";
  message: string;
};

export function ProjectDocumentUploadForm({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [saveState, setSaveState] = useState<SaveState>({ status: "idle", message: "" });

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const file = formData.get("file");

    if (!(file instanceof File) || file.size === 0) {
      setSaveState({ status: "error", message: "Válassz feltöltendő fájlt." });
      return;
    }

    setSaveState({ status: "saving", message: "Dokumentum feltöltése..." });

    const response = await fetch(`/api/projects/${projectId}/documents`, {
      method: "POST",
      body: formData
    }).catch(() => null);

    const result = await response?.json().catch(() => null);

    if (!response?.ok) {
      setSaveState({ status: "error", message: result?.error || "A dokumentum mentése nem sikerült." });
      return;
    }

    setSaveState({ status: "saved", message: "Dokumentum rögzítve." });
    form.reset();
    router.refresh();
  }

  return (
    // suppressHydrationWarning on the form controls below: a browser extension (form-filler/
    // autofill type) injects a `__gcruniqueid` attribute into form/input/select/textarea nodes
    // after the server HTML is sent but before/while React hydrates. This only shows up with
    // that extension active (e.g. via Chrome desktop while testing the mobile layout in device
    // emulation) and never affects real behavior - React explicitly does not patch these nodes.
    <form className="card document-upload-card" method="post" encType="multipart/form-data" onSubmit={handleSubmit} suppressHydrationWarning>
      <div className="document-upload-head">
        <div>
          <h2>Dokumentum feltöltése</h2>
          <p>Projekt szintű terv vagy dokumentum feltöltése.</p>
        </div>
      </div>

      <div className="document-upload-grid">
        <label>
          Cím (opcionális)
          <input name="title" placeholder="Ha üresen hagyod, a fájl neve lesz a cím" suppressHydrationWarning />
        </label>
        <label>
          Típus
          <select name="documentType" defaultValue="architectural_plan" suppressHydrationWarning>
            <option value="architectural_plan">Építész terv</option>
            <option value="technical_plan">Műszaki terv</option>
            <option value="material_spec">Anyagspecifikáció</option>
            <option value="photo_document">Fotodokumentum</option>
            <option value="other">Egyéb</option>
          </select>
        </label>
        <label>
          Szakma
          <input name="trade" placeholder="Pl. Burkolás" suppressHydrationWarning />
        </label>
        <label>
          Terület
          <input name="area" placeholder="Pl. Lépcsőház" suppressHydrationWarning />
        </label>
        <label>
          Revision
          <input name="revision" placeholder="Pl. v1 vagy 2026.07.17." suppressHydrationWarning />
        </label>
        <label className="full">
          Leírás
          <textarea name="description" placeholder="Rövid megjegyzés a dokumentumhoz." suppressHydrationWarning />
        </label>
        <label className="full document-file-picker">
          Fájl
          <input
            name="file"
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.webp,.heic,.heif,.txt,.doc,.docx,.xls,.xlsx,application/pdf,image/*,text/plain"
            suppressHydrationWarning
          />
          <small>PDF, kép vagy Office fájl, legfeljebb 20 MB.</small>
        </label>
      </div>

      <div className="document-upload-footer">
        {saveState.message ? (
          <span className={saveState.status === "error" ? "error-message" : "success-message"}>{saveState.message}</span>
        ) : <span />}
        <button className="button primary" type="submit" disabled={saveState.status === "saving"}>
          {saveState.status === "saving" ? "Feltöltés..." : "Dokumentum feltöltése"}
        </button>
      </div>
    </form>
  );
}
