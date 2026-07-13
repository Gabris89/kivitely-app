"use client";

import { useEffect, useState, type PointerEvent } from "react";
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

type ViewerProps = {
  photo: EvidencePhoto;
  photos: EvidencePhoto[];
  selectedIndex: number;
  hasPrevious: boolean;
  hasNext: boolean;
  deletingId: string | null;
  onClose: () => void;
  onChangePhoto: (direction: -1 | 1) => void;
  onDelete: (photo: EvidencePhoto) => void;
  onPointerDown: (event: PointerEvent<HTMLDivElement>) => void;
  onPointerUp: (event: PointerEvent<HTMLDivElement>) => void;
  onPointerCancel: () => void;
  onPointerMove: (event: PointerEvent<HTMLDivElement>) => void;
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

function EvidenceViewerMeta({ photo, selectedIndex, total }: { photo: EvidencePhoto; selectedIndex: number; total: number }) {
  return (
    <div className="evidence-viewer-meta">
      <span>{getPhotoKindLabel(photo)}</span>
      <strong>{selectedIndex + 1} / {total}</strong>
      {photo.uploadedAt ? <time dateTime={photo.uploadedAt}>{formatPhotoTimestamp(photo.uploadedAt)}</time> : null}
    </div>
  );
}

function EvidenceViewerArrow({
  className,
  direction,
  disabled,
  onClick,
  label
}: {
  className: string;
  direction: "left" | "right";
  disabled: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      className={`evidence-viewer-arrow ${className}`}
      type="button"
      disabled={disabled}
      onPointerDown={(event) => event.stopPropagation()}
      onClick={onClick}
      aria-label={label}
    >
      <ChevronIcon direction={direction} />
    </button>
  );
}

function EvidenceViewerStage({
  photo,
  hasPrevious,
  hasNext,
  onChangePhoto,
  onPointerDown,
  onPointerUp,
  onPointerCancel,
  onPointerMove,
  variant
}: Pick<ViewerProps, "photo" | "hasPrevious" | "hasNext" | "onChangePhoto" | "onPointerDown" | "onPointerUp" | "onPointerCancel" | "onPointerMove"> & {
  variant: "desktop" | "mobile";
}) {
  return (
    <div
      className={`evidence-viewer-stage evidence-viewer-stage-${variant}`}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      onPointerMove={onPointerMove}
    >
      <EvidenceViewerArrow
        className="evidence-viewer-prev"
        direction="left"
        disabled={!hasPrevious}
        onClick={() => onChangePhoto(-1)}
        label="Előző kép"
      />
      {photo.url ? <img src={photo.url} alt={getPhotoKindLabel(photo)} /> : null}
      <EvidenceViewerArrow
        className="evidence-viewer-next"
        direction="right"
        disabled={!hasNext}
        onClick={() => onChangePhoto(1)}
        label="Következő kép"
      />
    </div>
  );
}

function DesktopEvidenceViewer(props: ViewerProps) {
  return (
    <div
      className="evidence-viewer evidence-viewer-desktop"
      role="dialog"
      aria-modal="true"
      aria-label={getPhotoKindLabel(props.photo)}
      onClick={(event) => event.stopPropagation()}
    >
      <div className="evidence-viewer-head">
        <EvidenceViewerMeta photo={props.photo} selectedIndex={props.selectedIndex} total={props.photos.length} />
        <button className="evidence-viewer-close" type="button" onClick={props.onClose} aria-label="Bezárás">
          <CloseIcon />
        </button>
      </div>

      <EvidenceViewerStage
        photo={props.photo}
        hasPrevious={props.hasPrevious}
        hasNext={props.hasNext}
        onChangePhoto={props.onChangePhoto}
        onPointerDown={props.onPointerDown}
        onPointerUp={props.onPointerUp}
        onPointerCancel={props.onPointerCancel}
        onPointerMove={props.onPointerMove}
        variant="desktop"
      />

      <div className="evidence-viewer-actions">
        <button
          className="evidence-viewer-delete"
          type="button"
          disabled={props.deletingId === props.photo.id}
          onClick={() => props.onDelete(props.photo)}
          aria-label="Kép törlése"
          title="Kép törlése"
        >
          {props.deletingId === props.photo.id ? <span aria-hidden="true">...</span> : <TrashIcon />}
        </button>
      </div>
    </div>
  );
}

function MobileEvidenceViewer(props: ViewerProps) {
  return (
    <div
      className="evidence-viewer-mobile"
      role="dialog"
      aria-modal="true"
      aria-label={getPhotoKindLabel(props.photo)}
      onClick={(event) => event.stopPropagation()}
    >
      <div className="evidence-mobile-head">
        <EvidenceViewerMeta photo={props.photo} selectedIndex={props.selectedIndex} total={props.photos.length} />
        <button className="evidence-viewer-close" type="button" onClick={props.onClose} aria-label="Bezárás">
          <CloseIcon />
        </button>
      </div>

      <EvidenceViewerStage
        photo={props.photo}
        hasPrevious={props.hasPrevious}
        hasNext={props.hasNext}
        onChangePhoto={props.onChangePhoto}
        onPointerDown={props.onPointerDown}
        onPointerUp={props.onPointerUp}
        onPointerCancel={props.onPointerCancel}
        onPointerMove={props.onPointerMove}
        variant="mobile"
      />

      <div className="evidence-mobile-actions">
        <button
          className="evidence-viewer-delete"
          type="button"
          disabled={props.deletingId === props.photo.id}
          onClick={() => props.onDelete(props.photo)}
          aria-label="Kép törlése"
          title="Kép törlése"
        >
          {props.deletingId === props.photo.id ? <span aria-hidden="true">...</span> : <TrashIcon />}
        </button>
      </div>
    </div>
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

  function handlePreviewPointerDown(event: PointerEvent<HTMLDivElement>) {
    const target = event.target as Element | null;
    if (target?.closest("button")) return;

    event.currentTarget.setPointerCapture(event.pointerId);
    setSwipeStart({ x: event.clientX, y: event.clientY });
  }

  function handlePreviewPointerMove(event: PointerEvent<HTMLDivElement>) {
    if (swipeStart) event.preventDefault();
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
              }} aria-label="Kép törlése" title="Kép törlése">
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
        <div className="evidence-viewer-backdrop" role="presentation" onClick={closePreview}>
          <DesktopEvidenceViewer
            photo={selectedPhoto}
            photos={galleryPhotos}
            selectedIndex={selectedIndex}
            hasPrevious={hasPrevious}
            hasNext={hasNext}
            deletingId={deletingId}
            onClose={closePreview}
            onChangePhoto={changePhoto}
            onDelete={deletePhoto}
            onPointerDown={handlePreviewPointerDown}
            onPointerUp={(event) => handlePointerUp(event.clientX, event.clientY)}
            onPointerCancel={() => setSwipeStart(null)}
            onPointerMove={handlePreviewPointerMove}
          />
          <MobileEvidenceViewer
            photo={selectedPhoto}
            photos={galleryPhotos}
            selectedIndex={selectedIndex}
            hasPrevious={hasPrevious}
            hasNext={hasNext}
            deletingId={deletingId}
            onClose={closePreview}
            onChangePhoto={changePhoto}
            onDelete={deletePhoto}
            onPointerDown={handlePreviewPointerDown}
            onPointerUp={(event) => handlePointerUp(event.clientX, event.clientY)}
            onPointerCancel={() => setSwipeStart(null)}
            onPointerMove={handlePreviewPointerMove}
          />
        </div>
      ) : null}
    </>
  );
}
