"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type EvidenceMetadataType = "before_photo" | "after_photo";

const labels: Record<EvidenceMetadataType, string> = {
  before_photo: "Előtte bizonyíték",
  after_photo: "Utána bizonyíték"
};

export function EvidenceMetadataControls({ issueId }: { issueId: string }) {
  const router = useRouter();
  const [savingType, setSavingType] = useState<EvidenceMetadataType | null>(null);
  const [message, setMessage] = useState("");

  async function createEvidence(type: EvidenceMetadataType) {
    setSavingType(type);
    setMessage("Bizonyíték metadata mentése...");

    const response = await fetch(`/api/issues/${issueId}/evidence`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type,
        label: `${labels[type]} metadata`
      })
    }).catch(() => undefined);

    setSavingType(null);

    if (!response?.ok) {
      setMessage("A bizonyíték metadata mentése nem sikerült.");
      return;
    }

    const result = await response.json().catch(() => null);
    const savedMode = result?.mode === "supabase" ? "Supabase" : "Mock fallback";

    setMessage(`${savedMode} bizonyíték metadata mentve.`);
    router.refresh();
  }

  return (
    <div className="evidence-actions" aria-label="Bizonyíték metadata rögzítés">
      <button className="button ghost" type="button" disabled={Boolean(savingType)} onClick={() => createEvidence("before_photo")}>
        {savingType === "before_photo" ? "Mentés..." : "Előtte bizonyíték"}
      </button>
      <button className="button ghost" type="button" disabled={Boolean(savingType)} onClick={() => createEvidence("after_photo")}>
        {savingType === "after_photo" ? "Mentés..." : "Utána bizonyíték"}
      </button>
      {message ? <span className="inline-note">{message}</span> : null}
    </div>
  );
}
