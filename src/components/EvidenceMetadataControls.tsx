"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type EvidenceMetadataType = "before_photo" | "after_photo";

const labels: Record<EvidenceMetadataType, string> = {
  before_photo: "Előtte bizonyíték",
  after_photo: "Utána bizonyíték"
};

async function resizeImageForUpload(file: File) {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
    return file;
  }

  const imageUrl = URL.createObjectURL(file);

  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new Image();
      element.onload = () => resolve(element);
      element.onerror = reject;
      element.src = imageUrl;
    });

    const maxSide = 1600;
    const longestSide = Math.max(image.naturalWidth, image.naturalHeight);

    if (longestSide <= maxSide) {
      return file;
    }

    const scale = maxSide / longestSide;
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(image.naturalWidth * scale);
    canvas.height = Math.round(image.naturalHeight * scale);

    const context = canvas.getContext("2d");
    if (!context) return file;

    context.drawImage(image, 0, 0, canvas.width, canvas.height);

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, "image/jpeg", 0.84);
    });

    if (!blob) return file;

    const resizedName = file.name.replace(/\.[^.]+$/, "") || "evidence";
    return new File([blob], `${resizedName}.jpg`, { type: "image/jpeg" });
  } catch {
    return file;
  } finally {
    URL.revokeObjectURL(imageUrl);
  }
}

export function EvidenceMetadataControls({ issueId }: { issueId: string }) {
  const router = useRouter();
  const [savingType, setSavingType] = useState<EvidenceMetadataType | null>(null);
  const [message, setMessage] = useState("");

  async function uploadEvidence(type: EvidenceMetadataType, file?: File) {
    setSavingType(type);
    setMessage(file ? "Kép előkészítése..." : "Bizonyíték metadata mentése...");

    const uploadFile = file ? await resizeImageForUpload(file) : undefined;
    if (file) {
      setMessage("Kép feltöltése...");
    }

    const formData = new FormData();
    formData.set("type", type);
    formData.set("label", uploadFile?.name || `${labels[type]} metadata`);
    if (uploadFile) {
      formData.set("file", uploadFile);
    }

    const response = await fetch(`/api/issues/${issueId}/evidence`, {
      method: "POST",
      body: formData
    }).catch(() => undefined);

    setSavingType(null);

    if (!response?.ok) {
      setMessage("A bizonyíték mentése nem sikerült.");
      return;
    }

    const result = await response.json().catch(() => null);
    const savedMode = result?.mode === "supabase" ? "Supabase" : "Mock fallback";
    const savedKind = result?.data?.url ? "kép" : "metadata";

    setMessage(`${savedMode} bizonyíték ${savedKind} mentve.`);
    router.refresh();
  }

  function handleFileChange(type: EvidenceMetadataType, file?: File | null) {
    if (!file) return;
    void uploadEvidence(type, file);
  }

  return (
    <div className="evidence-actions evidence-upload-actions" aria-label="Bizonyíték kép feltöltés">
      {(Object.keys(labels) as EvidenceMetadataType[]).map((type) => (
        <div className="evidence-upload-control" key={type}>
          <strong>{labels[type]}</strong>
          <label className="button ghost">
            {savingType === type ? "Feltöltés..." : "Kép kiválasztása"}
            <input
              type="file"
              accept="image/*"
              capture="environment"
              disabled={Boolean(savingType)}
              onChange={(event) => {
                handleFileChange(type, event.currentTarget.files?.[0]);
                event.currentTarget.value = "";
              }}
            />
          </label>
        </div>
      ))}
      {message ? <span className="inline-note">{message}</span> : null}
    </div>
  );
}
