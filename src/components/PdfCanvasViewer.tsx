"use client";

import { useEffect, useRef, useState } from "react";
import type { PDFDocumentLoadingTask, PDFDocumentProxy, RenderTask } from "pdfjs-dist";

type Props = {
  url: string;
  title: string;
};

type Status = "loading" | "ready" | "error";

const ZOOM_STEP = 0.5;
const MIN_ZOOM = 1;
const MAX_ZOOM = 4;

function ChevronIcon({ direction }: { direction: "left" | "right" }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      {direction === "left" ? <path d="M15 18l-6-6 6-6" /> : <path d="M9 6l6 6-6 6" />}
    </svg>
  );
}

// Canvas-based PDF rendering (instead of an <iframe>) because mobile Safari
// only shows the first page and does not allow scrolling/zooming a
// multi-page PDF embedded in an iframe - a long-standing WebKit limitation,
// not something fixable with CSS or PDF open-parameters. All pages render
// into a continuous vertical stack so the natural gesture on a phone (swipe
// to scroll down) moves through pages, matching how mobile PDF viewers
// normally behave; the toolbar's prev/next buttons just scroll to a page.
export function PdfCanvasViewer({ url, title }: Props) {
  const [pdfDoc, setPdfDoc] = useState<PDFDocumentProxy | null>(null);
  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [zoom, setZoom] = useState(MIN_ZOOM);
  const [status, setStatus] = useState<Status>("loading");

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const pageRefs = useRef<Array<HTMLDivElement | null>>([]);
  const canvasRefs = useRef<Array<HTMLCanvasElement | null>>([]);
  const renderTasksRef = useRef<Array<RenderTask | null>>([]);
  const loadingTaskRef = useRef<PDFDocumentLoadingTask | null>(null);
  const renderGenerationRef = useRef(0);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setStatus("loading");
      setPdfDoc(null);
      setNumPages(0);
      setCurrentPage(1);
      setZoom(MIN_ZOOM);

      try {
        const pdfjsLib = await import("pdfjs-dist");
        pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

        const loadingTask = pdfjsLib.getDocument({ url });
        loadingTaskRef.current = loadingTask;

        const doc = await loadingTask.promise;

        if (cancelled) return;

        pageRefs.current = new Array(doc.numPages).fill(null);
        canvasRefs.current = new Array(doc.numPages).fill(null);
        renderTasksRef.current = new Array(doc.numPages).fill(null);

        setPdfDoc(doc);
        setNumPages(doc.numPages);
        setStatus("ready");
      } catch {
        if (!cancelled) setStatus("error");
      }
    })();

    return () => {
      cancelled = true;
      loadingTaskRef.current?.destroy();
      loadingTaskRef.current = null;
    };
  }, [url]);

  useEffect(() => {
    if (!pdfDoc || status !== "ready") return;

    const generation = ++renderGenerationRef.current;
    const outputScale = window.devicePixelRatio || 1;

    (async () => {
      for (let pageNumber = 1; pageNumber <= pdfDoc.numPages; pageNumber += 1) {
        if (renderGenerationRef.current !== generation) return;

        const canvas = canvasRefs.current[pageNumber - 1];
        if (!canvas) continue;

        const page = await pdfDoc.getPage(pageNumber);
        if (renderGenerationRef.current !== generation) return;

        const containerWidth = scrollRef.current?.clientWidth || 0;
        const baseViewport = page.getViewport({ scale: 1 });
        const fitScale = (containerWidth || baseViewport.width) / baseViewport.width;
        const viewport = page.getViewport({ scale: fitScale * zoom });

        // Render at devicePixelRatio so text/lines stay sharp on retina
        // phone screens instead of looking soft/pixelated.
        canvas.width = Math.floor(viewport.width * outputScale);
        canvas.height = Math.floor(viewport.height * outputScale);
        canvas.style.width = `${Math.floor(viewport.width)}px`;
        canvas.style.height = `${Math.floor(viewport.height)}px`;

        const transform = outputScale !== 1 ? [outputScale, 0, 0, outputScale, 0, 0] : undefined;

        renderTasksRef.current[pageNumber - 1]?.cancel();
        const renderTask = page.render({ canvas, viewport, transform });
        renderTasksRef.current[pageNumber - 1] = renderTask;

        try {
          await renderTask.promise;
        } catch {
          // Cancelled/superseded by a newer render pass (zoom changed mid-render) - ignore.
        }
      }
    })();
  }, [pdfDoc, zoom, status]);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container || numPages === 0) return;

    let ticking = false;

    function updateCurrentPage() {
      ticking = false;
      if (!container) return;

      const referenceY = container.getBoundingClientRect().top + 24;
      let closestPage = 1;
      let closestDistance = Infinity;

      pageRefs.current.forEach((pageEl, index) => {
        if (!pageEl) return;
        const distance = Math.abs(pageEl.getBoundingClientRect().top - referenceY);
        if (distance < closestDistance) {
          closestDistance = distance;
          closestPage = index + 1;
        }
      });

      setCurrentPage((current) => (current === closestPage ? current : closestPage));
    }

    function handleScroll() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(updateCurrentPage);
    }

    container.addEventListener("scroll", handleScroll, { passive: true });
    updateCurrentPage();

    return () => container.removeEventListener("scroll", handleScroll);
  }, [numPages, status]);

  function goToPage(direction: -1 | 1) {
    const target = Math.min(numPages, Math.max(1, currentPage + direction));
    pageRefs.current[target - 1]?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function zoomIn() {
    setZoom((current) => Math.min(MAX_ZOOM, +(current + ZOOM_STEP).toFixed(1)));
  }

  function zoomOut() {
    setZoom((current) => Math.max(MIN_ZOOM, +(current - ZOOM_STEP).toFixed(1)));
  }

  return (
    <div className="pdf-viewer">
      <div className="pdf-viewer-toolbar">
        <button type="button" className="pdf-viewer-btn" onClick={() => goToPage(-1)} disabled={currentPage <= 1} aria-label="Előző oldal">
          <ChevronIcon direction="left" />
        </button>
        <span className="pdf-viewer-toolbar-label">{status === "ready" ? `${currentPage} / ${numPages}` : "…"}</span>
        <button type="button" className="pdf-viewer-btn" onClick={() => goToPage(1)} disabled={status !== "ready" || currentPage >= numPages} aria-label="Következő oldal">
          <ChevronIcon direction="right" />
        </button>
        <span className="pdf-viewer-toolbar-divider" aria-hidden="true" />
        <button type="button" className="pdf-viewer-btn" onClick={zoomOut} disabled={zoom <= MIN_ZOOM} aria-label="Kicsinyítés">
          −
        </button>
        <span className="pdf-viewer-toolbar-label">{Math.round(zoom * 100)}%</span>
        <button type="button" className="pdf-viewer-btn" onClick={zoomIn} disabled={zoom >= MAX_ZOOM} aria-label="Nagyítás">
          +
        </button>
      </div>

      <div className="pdf-viewer-scroll" ref={scrollRef}>
        {status === "loading" ? <div className="pdf-viewer-status">Betöltés...</div> : null}
        {status === "error" ? (
          <div className="pdf-viewer-status pdf-viewer-error">
            A(z) &quot;{title}&quot; PDF nem tölthető be ebben a nézegetőben. Próbáld az &quot;Új fülön&quot; gombot.
          </div>
        ) : null}
        {status === "ready" ? (
          <div className="pdf-viewer-pages">
            {Array.from({ length: numPages }, (_, index) => (
              <div
                className="pdf-viewer-page"
                key={index}
                ref={(el) => {
                  pageRefs.current[index] = el;
                }}
              >
                <canvas
                  className="pdf-viewer-canvas"
                  ref={(el) => {
                    canvasRefs.current[index] = el;
                  }}
                />
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
