"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { PdfCanvasViewer } from "@/components/PdfCanvasViewer";
import { PlanMeasurementTool } from "@/components/PlanMeasurementTool";
import type { ProjectDocument } from "@/types";

type Props = {
  doc: ProjectDocument;
  /** measurement.create jog - a merooeszkoz szerkeszto gombjait vezerli. */
  canMeasure?: boolean;
  /** measurement.delete jog. */
  canDeleteMeasurement?: boolean;
};

const ZOOM_STEP = 0.5;
const MIN_ZOOM = 1;
const MAX_ZOOM = 4;

function CloseIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

function ZoomInIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <circle cx="10" cy="10" r="7" />
      <path d="M10 7v6M7 10h6M21 21l-5.4-5.4" />
    </svg>
  );
}

function ZoomOutIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <circle cx="10" cy="10" r="7" />
      <path d="M7 10h6M21 21l-5.4-5.4" />
    </svg>
  );
}

export function ProjectDocumentViewer({ doc, canMeasure = true, canDeleteMeasurement = true }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [zoom, setZoom] = useState(MIN_ZOOM);
  const [measureMode, setMeasureMode] = useState(false);

  const url = doc.url;
  const isImage = (doc.mimeType || "").startsWith("image/");
  const isPdf = doc.mimeType === "application/pdf";

  useEffect(() => {
    if (!isOpen) return;

    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;

    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setIsOpen(false);
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  if (!url) return null;

  // Office/text formats have no native in-browser viewer without an external
  // conversion service, so those stay a plain external open/download link.
  if (!isImage && !isPdf) {
    return (
      <a className="button ghost" href={url} target="_blank" rel="noreferrer">
        Fájl megnyitása
      </a>
    );
  }

  function open() {
    setZoom(MIN_ZOOM);
    setMeasureMode(false);
    setIsOpen(true);
  }

  function zoomIn() {
    setZoom((current) => Math.min(MAX_ZOOM, +(current + ZOOM_STEP).toFixed(1)));
  }

  function zoomOut() {
    setZoom((current) => Math.max(MIN_ZOOM, +(current - ZOOM_STEP).toFixed(1)));
  }

  function toggleZoomOnClick() {
    setZoom((current) => (current > MIN_ZOOM ? MIN_ZOOM : 2));
  }

  return (
    <>
      <button type="button" className="button ghost" onClick={open}>
        Fájl megnyitása
      </button>

      {isOpen
        ? createPortal(
            // Rendered straight into <body> instead of in place: a fixed-position
            // overlay is only positioned against the viewport if none of its
            // ancestors set a transform/filter/backdrop-filter/contain, which
            // establishes a new containing block for it instead (CSS spec, not a
            // bug) - and .card (used all over this app for panels/lists) sets
            // backdrop-filter. Left in place, this modal would render pinned
            // inside whatever .card happens to be its nearest such ancestor
            // instead of covering the screen - exactly the "doesn't open in a
            // separate window" symptom reported from the documents list, and a
            // main suspect for the measurement tool crashing right after (its
            // canvas sizing math reads the container's real viewport-relative
            // dimensions, which would be nonsense while trapped like that).
            <div
              className={measureMode ? "document-viewer-backdrop document-viewer-backdrop-full" : "document-viewer-backdrop"}
              role="presentation"
              onClick={() => setIsOpen(false)}
            >
              <div
                className={measureMode ? "document-viewer document-viewer-full" : "document-viewer"}
                role="dialog"
                aria-modal="true"
                aria-label={doc.title}
                onClick={(event) => event.stopPropagation()}
              >
                {!measureMode ? (
                  <div className="document-viewer-head">
                    <div className="document-viewer-meta">
                      <strong>{doc.title}</strong>
                      {doc.fileName ? <span>{doc.fileName}</span> : null}
                    </div>

                    <div className="document-viewer-head-actions">
                      {isImage ? (
                        <>
                          <button type="button" className="document-viewer-zoom" onClick={zoomOut} disabled={zoom <= MIN_ZOOM} aria-label="Kicsinyítés">
                            <ZoomOutIcon />
                          </button>
                          <span className="document-viewer-zoom-level">{Math.round(zoom * 100)}%</span>
                          <button type="button" className="document-viewer-zoom" onClick={zoomIn} disabled={zoom >= MAX_ZOOM} aria-label="Nagyítás">
                            <ZoomInIcon />
                          </button>
                        </>
                      ) : null}
                      <button type="button" className="button ghost" onClick={() => setMeasureMode(true)}>
                        Mérés
                      </button>
                      <a className="document-viewer-external" href={url} target="_blank" rel="noreferrer">
                        Böngészőben
                      </a>
                      <button type="button" className="document-viewer-close" onClick={() => setIsOpen(false)} aria-label="Bezárás">
                        <CloseIcon />
                      </button>
                    </div>
                  </div>
                ) : null}

                <div className="document-viewer-stage">
                  {measureMode ? (
                    <PlanMeasurementTool
                      doc={doc}
                      onClose={() => setMeasureMode(false)}
                      canMeasure={canMeasure}
                      canDeleteMeasurement={canDeleteMeasurement}
                    />
                  ) : isImage ? (
                    <div className="document-viewer-image-scroll">
                      <div className="document-viewer-image-inner" style={{ width: `${zoom * 100}%`, height: `${zoom * 100}%` }}>
                        <img
                          src={url}
                          alt={doc.title}
                          className="document-viewer-image"
                          onClick={toggleZoomOnClick}
                          style={{ cursor: zoom > MIN_ZOOM ? "zoom-out" : "zoom-in" }}
                        />
                      </div>
                    </div>
                  ) : (
                    <PdfCanvasViewer url={url} title={doc.title} />
                  )}
                </div>
              </div>
            </div>,
            document.body
          )
        : null}
    </>
  );
}
