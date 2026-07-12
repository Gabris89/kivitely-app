"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { EvidencePhoto, Issue } from "@/types";

type Props = {
  issue: Issue;
  photos: EvidencePhoto[];
};

type SwipeStart = {
  x: number;
  y: number;
};

function formatPhotoTimestamp(uploadedAt: string) {
  return new Intl.DateTimeFormat("hu-HU", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(uploadedAt));
}

function getPhotoKindLabel(photo: EvidencePhoto) {
  return photo.type === "before_photo" ? "Előtte fotó" : "Utána fotó";
}

function CloseIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

function ChevronIcon({ direction }: { direction: "left" | "right" }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      {direction === "left" ? <path d="M15 18l-6-6 6-6" /> : <path d="M9 6l6 6-6 6" />}
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M4 7h16" />
      <path d="M10 11v6M14 11v6" />
      <path d="M6 7l1 14h10l1-14" />
      <path d="M9 7V4h6v3" />
    </svg>
  );
}

export function EvidencePhotoGallery({ issue, photos }: Props) {
  const router = useRouter();
  const galleryPhotos = photos.filter((photo) => photo.url);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [swipeStart, setSwipeStart] = useState<SwipeStart | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const selectedPhoto = selectedIndex === null ? null : galleryPhotos[selectedIndex] ?? null;
  const hasPrevious = selectedIndex !== null && selectedIndex > 0;
  const hasNext = selectedIndex !== null && selectedIndex < galleryPhotos.length - 1;

  function openPhoto(photo: EvidencePhoto) {
    const nextIndex = galleryPhotos.findIndex((item) => item.id === photo.id);

    if (nextIndex >= 0) {
      setSelectedIndex(nextIndex);
    }
  }

  function closePreview() {
    setSelectedIndex(null);
    setSwipeStart(null);
  }

  function changePhoto(direction: -1 | 1) {
    setSelectedIndex((currentIndex) => {
      if (currentIndex === null) {
        return currentIndex;
      }

      const nextIndex = currentIndex + direction;

      if (nextIndex < 0 || nextIndex >= galleryPhotos.length) {
        return currentIndex;
      }

      return nextIndex;
    });
  }

  function handlePointerUp(endX: number, endY: number) {
    if (!swipeStart) return;

    const swipeDistance = swipeStart.x - endX;
    const verticalSwipeDistance = endY - swipeStart.y;
    const verticalDistance = Math.abs(verticalSwipeDistance);
    const minimumSwipeDistance = 46;
    const minimumCloseDistance = 76;

    if (Math.abs(swipeDistance) >= minimumSwipeDistance && Math.abs(swipeDistance) > verticalDistance * 1.2) {
      changePhoto(swipeDistance > 0 ? 1 : -1);
    }

    if (verticalSwipeDistance >= minimumCloseDistance && verticalDistance > Math.abs(swipeDistance) * 1.2) {
      closePreview();
      return;
    }

    setSwipeStart(null);
  }

  async function deletePhoto(photo: EvidencePhoto) {
    setDeletingId(photo.id);
    setMessage("Kép törlése...");

    const response = await fetch(`/api/issues/${issue.id}/evidence`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ evidenceId: photo.id })
    }).catch(() => undefined);

    setDeletingId(null);

    if (!response?.ok) {
      setMessage("A kép törlése nem sikerült.");
      return;
    }

    const result = await response.json().catch(() => null);
    const mode = result?.mode === "supabase" ? "Supabase" : "Mock fallback";

    closePreview();
    setMessage(`${mode} kép törölve.`);
    router.refresh();
  }

  useEffect(() => {
    if (selectedIndex === null) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        setSelectedIndex((currentIndex) => {
          if (currentIndex === null) return currentIndex;
          return Math.max(0, currentIndex - 1);
        });
      }

      if (event.key === "ArrowRight") {
        event.preventDefault();
        setSelectedIndex((currentIndex) => {
          if (currentIndex === null) return currentIndex;
          return Math.min(galleryPhotos.length - 1, currentIndex + 1);
        });
      }

      if (event.key === "Escape") {
        event.preventDefault();
        setSelectedIndex(null);
        setSwipeStart(null);
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedIndex, galleryPhotos.length]);

  useEffect(() => {
    if (selectedIndex === null) return;

    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;

    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
    };
  }, [selectedIndex]);

  return (
    <>
      <div className="photo-grid">
        {photos.length > 0 ? photos.map((photo) => (
          <div
            className={photo.url ? "photo-card photo-card-image" : "photo-card"}
            key={photo.id}
          >
            {photo.url ? (
              <button className="photo-open-link" type="button" onClick={() => openPhoto(photo)} aria-label={`${getPhotoKindLabel(photo)} előnézet`}>
                <img src={photo.url} alt={getPhotoKindLabel(photo)} />
              </button>
            ) : null}
            <div className="photo-card-caption">
              <small>{getPhotoKindLabel(photo)}{photo.uploadedAt ? ` · ${formatPhotoTimestamp(photo.uploadedAt)}` : ""}</small>
            </div>
            {photo.url ? (
              <button className="photo-card-delete" type="button" disabled={deletingId === photo.id} onClick={(event) => {
                event.stopPropagation();
                deletePhoto(photo);
              }} aria-label="KĂ©p tĂ¶rlĂ©se" title="KĂ©p tĂ¶rlĂ©se">
                {deletingId === photo.id ? <span aria-hidden="true">...</span> : <TrashIcon />}
              </button>
            ) : null}
          </div>
        )) : Array.from({ length: Math.max(3, issue.photosBefore + issue.photosAfter) }).map((_, index) => (
          <div className="photo-card" key={index}>
            <span>{index < issue.photosBefore ? "előtte" : "utána"}</span>
          </div>
        ))}
      </div>

      {message ? <div className="inline-note photo-gallery-note">{message}</div> : null}

      {selectedPhoto && selectedIndex !== null ? (
        <div className="photo-preview-backdrop" role="presentation" onClick={closePreview}>
          <div className="photo-preview photo-preview-fullscreen" role="dialog" aria-modal="true" aria-label={getPhotoKindLabel(selectedPhoto)} onClick={(event) => event.stopPropagation()}>
            <div className="photo-preview-head">
              <div>
                <span>{getPhotoKindLabel(selectedPhoto)}</span>
                <strong>{selectedIndex + 1} / {galleryPhotos.length}</strong>
                {selectedPhoto.uploadedAt ? <time dateTime={selectedPhoto.uploadedAt}>{formatPhotoTimestamp(selectedPhoto.uploadedAt)}</time> : null}
              </div>
              <button className="photo-preview-close" type="button" onClick={closePreview} aria-label="Bezárás">
                <CloseIcon />
              </button>
            </div>

            <div
              className="photo-preview-stage"
              onPointerDown={(event) => {
                const target = event.target as Element | null;
                if (target?.closest("button")) return;

                event.currentTarget.setPointerCapture(event.pointerId);
                setSwipeStart({ x: event.clientX, y: event.clientY });
              }}
              onPointerUp={(event) => handlePointerUp(event.clientX, event.clientY)}
              onPointerCancel={() => setSwipeStart(null)}
              onPointerMove={(event) => {
                if (swipeStart) event.preventDefault();
              }}
            >
              <button className="photo-stage-arrow photo-stage-prev" type="button" disabled={!hasPrevious} onClick={() => changePhoto(-1)} aria-label="Előző kép">
                <ChevronIcon direction="left" />
              </button>
              {selectedPhoto.url ? <img src={selectedPhoto.url} alt={getPhotoKindLabel(selectedPhoto)} /> : null}
              <button className="photo-stage-arrow photo-stage-next" type="button" disabled={!hasNext} onClick={() => changePhoto(1)} aria-label="Következő kép">
                <ChevronIcon direction="right" />
              </button>
            </div>

            <div className="photo-preview-actions">
              <button className="photo-delete-button" type="button" disabled={deletingId === selectedPhoto.id} onClick={() => deletePhoto(selectedPhoto)} aria-label="Kép törlése" title="Kép törlése">
                {deletingId === selectedPhoto.id ? <span aria-hidden="true">...</span> : <TrashIcon />}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
