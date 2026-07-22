"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CloseIcon, SaveIcon, TrashIcon } from "@/components/ActionIcons";
import { ConfirmDialog } from "@/components/ConfirmDialog";

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
  const [deleting, setDeleting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  async function handleDelete() {
    if (!publicId) return;

    setConfirmOpen(false);
    setDeleting(true);

    const response = await fetch(`/api/subcontractors/${publicId}`, { method: "DELETE" }).catch(() => undefined);

    if (!response?.ok) {
      setDeleting(false);
      window.alert("A törlés nem sikerült.");
      return;
    }

    router.push("/subcontractors");
    router.refresh();
  }

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
          <span className="visually-hidden">Név</span>
          <input name="name" required defaultValue={initial?.name} placeholder="Név" suppressHydrationWarning />
        </label>
        <label>
          <span className="visually-hidden">Szakma</span>
          <input name="trade" defaultValue={initial?.trade} placeholder="Szakma" suppressHydrationWarning />
        </label>
        <label>
          <span className="visually-hidden">Kapcsolattartó</span>
          <input name="contactName" defaultValue={initial?.contactName} placeholder="Kapcsolattartó" suppressHydrationWarning />
        </label>
        <label>
          <span className="visually-hidden">Telefon</span>
          <input name="phone" defaultValue={initial?.phone} placeholder="Telefon" suppressHydrationWarning />
        </label>
      </div>

      <div className="form-footer-stack">
        <div className="form-footer-row">
          <Link className="button ghost" href="/subcontractors">
            <CloseIcon />
            Vissza
          </Link>
          <button className="button primary" type="submit" disabled={saveState.status === "saving"}>
            <SaveIcon />
            {saveState.status === "saving" ? "Mentés..." : mode === "create" ? "Létrehozás" : "Mentés"}
          </button>
        </div>

        {saveState.message ? (
          <span className={saveState.status === "error" ? "error-message" : "success-message"}>{saveState.message}</span>
        ) : null}

        {mode === "edit" ? (
          <>
            <div className="form-footer-divider" />
            <button className="button danger full-width" type="button" onClick={() => setConfirmOpen(true)} disabled={deleting}>
              <TrashIcon />
              {deleting ? "Törlés..." : "Alvállalkozó törlése"}
            </button>
          </>
        ) : null}
      </div>

      {mode === "edit" ? (
        <ConfirmDialog
          open={confirmOpen}
          title="Alvállalkozó törlése"
          message={`Biztosan törlöd ezt az alvállalkozót: "${initial?.name}"? Ez nem visszavonható.`}
          onConfirm={handleDelete}
          onCancel={() => setConfirmOpen(false)}
        />
      ) : null}
    </form>
  );
}
