"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type TouchEvent as ReactTouchEvent,
  type TouchList as ReactTouchList
} from "react";
import dynamic from "next/dynamic";
import type { KonvaEventObject } from "konva/lib/Node";
import type { PDFDocumentLoadingTask, PDFDocumentProxy, RenderTask } from "pdfjs-dist";
import type { PlanAnalysis, PlanAnalysisResult, PlanMeasurement, PlanMeasurementPoint, PlanMeasurementType, PlanSelectionRect, ProjectDocument } from "@/types";
import type { SelectedPoint } from "./PlanMeasurementCanvas";
import { colorForMeasurementId } from "@/lib/measurementColors";
import { extractTextItemsInRect } from "@/lib/ai/pdfTextExtract";

// The whole Konva canvas loads as one client-only unit - see the comment
// in PlanMeasurementCanvas.tsx for why it can't be split per-primitive.
const PlanMeasurementCanvas = dynamic(() => import("./PlanMeasurementCanvas"), { ssr: false });

type StagePointerEvent = KonvaEventObject<MouseEvent | TouchEvent>;

type Props = {
  doc: ProjectDocument;
  onClose: () => void;
  /** measurement.create/update/calibrate jog - nelkule csak a mentett meresek lathatok. */
  canMeasure?: boolean;
  /** measurement.delete jog - jog nelkul a kuka ikon nem jelenik meg. */
  canDeleteMeasurement?: boolean;
};

type Mode = "idle" | "calibrate-pick" | "calibrate-input" | "measure" | "ai-select";

// A helyiseg-kartya szerkesztheto (szoveges) mezoi. A szam-mezok (terulet,
// belmagassag) is stringkent elnek itt, hogy a felhasznalo szabadon javithassa;
// mentéskor parse-oljuk.
type AiFields = { code: string; name: string; area: string; height: string; finish: string };

const EMPTY_AI_FIELDS: AiFields = { code: "", name: "", area: "", height: "", finish: "" };

function rectFromCorners(a: PlanMeasurementPoint, b: PlanMeasurementPoint): PlanSelectionRect {
  return { x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), w: Math.abs(a.x - b.x), h: Math.abs(a.y - b.y) };
}

function fieldsFromResult(result: PlanAnalysisResult): AiFields {
  const numToStr = (value: number | null) => (value === null ? "" : new Intl.NumberFormat("hu-HU", { maximumFractionDigits: 2 }).format(value));
  return {
    code: result.room.code || "",
    name: result.room.name || "",
    area: numToStr(result.room.printedFloorAreaM2),
    height: numToStr(result.room.ceilingHeightM),
    finish: result.room.floorFinish || ""
  };
}

function parseHuNumber(value: string): number | null {
  const n = Number(value.trim().replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(n) && n > 0 ? n : null;
}

const MIN_ZOOM = 1;
const MAX_ZOOM = 14;
const ZOOM_STEP = 0.5;
const WHEEL_ZOOM_STEP = 0.1;
const EDIT_FOCUS_ZOOM = 5;
const PINCH_ZOOM_THRESHOLD = 1.15;

function distance(a: PlanMeasurementPoint, b: PlanMeasurementPoint) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

// Shoelace formula: exact polygon area from its vertex coordinates.
function polygonArea(points: PlanMeasurementPoint[]) {
  let sum = 0;
  for (let i = 0; i < points.length; i += 1) {
    const current = points[i];
    const next = points[(i + 1) % points.length];
    sum += current.x * next.y - next.x * current.y;
  }
  return Math.abs(sum) / 2;
}

function formatValue(value: number, type: PlanMeasurementType) {
  const formatted = new Intl.NumberFormat("hu-HU", { maximumFractionDigits: 2 }).format(value);
  return type === "area" ? `${formatted} m²` : `${formatted} m`;
}

function formatTimestamp(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;

  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const day = String(parsed.getDate()).padStart(2, "0");
  const hour = String(parsed.getHours()).padStart(2, "0");
  const minute = String(parsed.getMinutes()).padStart(2, "0");

  return `${year}. ${month}. ${day}. ${hour}:${minute}`;
}

export function PlanMeasurementTool({ doc, onClose, canMeasure = true, canDeleteMeasurement = true }: Props) {
  const url = doc.url;
  const isImage = (doc.mimeType || "").startsWith("image/");
  const isPdf = doc.mimeType === "application/pdf";

  const containerRef = useRef<HTMLDivElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const pdfDocRef = useRef<PDFDocumentProxy | null>(null);
  const loadingTaskRef = useRef<PDFDocumentLoadingTask | null>(null);
  // A folyamatban levo PDF-render taskja. Zoom/lapozas gyors valtasakor az
  // elozot meg kell szakitani, kulonben a pdf.js "canvas busy" hibat dob
  // ugyanarra a canvasra -> festetlen (fekete) canvas marad.
  const renderTaskRef = useRef<RenderTask | null>(null);
  // x/y: fractional content coordinate to keep fixed under the anchor point.
  // anchorLeft/anchorTop: where that point should land, in CSS px from the
  // container's visible top-left corner (viewport center for buttons/pinch,
  // the mouse cursor for wheel-zoom).
  const pendingZoomCenterRef = useRef<{ x: number; y: number; anchorLeft: number; anchorTop: number } | null>(null);
  // Zoom-arany alapu, ABSZOLUT gorgetes-cel (px). A zoomBy ezt hasznalja a
  // scrollWidth-fuggo tort helyett: gyors gorgetesnel a scrollWidth kesve
  // frissul (aszinkron render), ezert csuszott a kep. Az arany-modszer a
  // gorgetes-poziciobol dolgozik, es a meg nem alkalmazott (virtualis) celbol
  // lancolodik, igy tobb gyors lepes is pontosan komponalodik.
  const pendingScrollRef = useRef<{ left: number; top: number } | null>(null);
  const pendingPinchDistanceRef = useRef<number | null>(null);
  const panStateRef = useRef<{ x: number; y: number; scrollLeft: number; scrollTop: number } | null>(null);

  const [zoom, setZoom] = useState(MIN_ZOOM);
  const [stageWidth, setStageWidth] = useState(0);
  const [stageHeight, setStageHeight] = useState(0);
  const [pageNumber, setPageNumber] = useState(1);
  const [numPages, setNumPages] = useState(1);
  const [pdfStatus, setPdfStatus] = useState<"loading" | "ready" | "error">("loading");

  const [mode, setMode] = useState<Mode>("idle");
  const [metersPerUnit, setMetersPerUnit] = useState<number | null>(null);
  const [selectedPoint, setSelectedPoint] = useState<SelectedPoint>(null);
  const [calibrationPoints, setCalibrationPoints] = useState<PlanMeasurementPoint[]>([]);
  const [calibrationInput, setCalibrationInput] = useState("");
  const [measurementType, setMeasurementType] = useState<PlanMeasurementType>("area");
  const [drawPoints, setDrawPoints] = useState<PlanMeasurementPoint[]>([]);
  const [label, setLabel] = useState("");
  const [note, setNote] = useState("");
  const [editingMeasurementId, setEditingMeasurementId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [messageStatus, setMessageStatus] = useState<"success" | "error">("success");

  function showMessage(text: string, status: "success" | "error" = "success") {
    setMessage(text);
    setMessageStatus(status);
  }

  // ── AI helyiseg-elemzes allapota ──
  const [aiCorners, setAiCorners] = useState<PlanMeasurementPoint[]>([]);
  const [aiSelection, setAiSelection] = useState<PlanSelectionRect | null>(null);
  const [aiResult, setAiResult] = useState<PlanAnalysisResult | null>(null);
  const [aiFields, setAiFields] = useState<AiFields>(EMPTY_AI_FIELDS);
  const [aiAnalyzing, setAiAnalyzing] = useState(false);
  const [aiSaving, setAiSaving] = useState(false);
  // Diagnosztika: a kijelolt regiobol kiolvasott nyers szoveg-elemek, hogy
  // lassuk, pontosan mit ad a pdf.js (pl. hogyan jon a "m²").
  const [aiRawText, setAiRawText] = useState<string>("");
  const [savedAnalyses, setSavedAnalyses] = useState<PlanAnalysis[]>([]);

  const [savedMeasurements, setSavedMeasurements] = useState<PlanMeasurement[]>([]);
  const [loadingSaved, setLoadingSaved] = useState(true);
  // Collapsed by default: the saved-measurements list was eating most of
  // the vertical space meant for the plan itself, especially on phones.
  const [savedListOpen, setSavedListOpen] = useState(false);

  // Load previously saved measurements for this document.
  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoadingSaved(true);
      const response = await fetch(`/api/documents/${doc.id}/measurements`).catch(() => null);
      const result = await response?.json().catch(() => null);
      if (!cancelled) {
        setSavedMeasurements(result?.data || []);
        setLoadingSaved(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [doc.id]);

  // Load previously saved AI analyses for this document.
  useEffect(() => {
    let cancelled = false;

    (async () => {
      const response = await fetch(`/api/documents/${doc.id}/analyses`).catch(() => null);
      const result = await response?.json().catch(() => null);
      if (!cancelled) setSavedAnalyses(result?.data || []);
    })();

    return () => {
      cancelled = true;
    };
  }, [doc.id]);

  // Load this plan's saved calibration, if any, so it doesn't have to be
  // redone every time the tool is reopened for the same document.
  useEffect(() => {
    let cancelled = false;

    (async () => {
      const response = await fetch(`/api/documents/${doc.id}/calibration`).catch(() => null);
      const result = await response?.json().catch(() => null);
      if (!cancelled && typeof result?.data === "number") setMetersPerUnit(result.data);
    })();

    return () => {
      cancelled = true;
    };
  }, [doc.id]);

  // Image: keep the stage matched to the image's actual rendered size,
  // including after the zoom buttons resize it via CSS - a plain onLoad
  // handler only fires once and goes stale the moment zoom changes.
  useEffect(() => {
    if (!isImage) return;
    const img = imageRef.current;
    if (!img) return;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const { width, height } = entry.contentRect;
      if (width > 0 && height > 0) {
        setStageWidth(Math.round(width));
        setStageHeight(Math.round(height));
      }
    });

    observer.observe(img);
    return () => observer.disconnect();
  }, [isImage, url]);

  // PDF: load the document once.
  useEffect(() => {
    if (!isPdf || !url) return;
    let cancelled = false;

    (async () => {
      setPdfStatus("loading");
      try {
        const pdfjsLib = await import("pdfjs-dist");
        pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
        const loadingTask = pdfjsLib.getDocument({ url });
        loadingTaskRef.current = loadingTask;
        const pdf = await loadingTask.promise;
        if (cancelled) return;
        pdfDocRef.current = pdf;
        setNumPages(pdf.numPages);
        setPdfStatus("ready");
      } catch {
        if (!cancelled) setPdfStatus("error");
      }
    })();

    return () => {
      cancelled = true;
      loadingTaskRef.current?.destroy();
      loadingTaskRef.current = null;
    };
  }, [isPdf, url]);

  // PDF: render the current page to the canvas whenever page/zoom/container width changes.
  useEffect(() => {
    if (!isPdf || pdfStatus !== "ready" || !pdfDocRef.current) return;
    let cancelled = false;

    (async () => {
      const pdf = pdfDocRef.current;
      if (!pdf) return;
      const page = await pdf.getPage(pageNumber);
      if (cancelled) return;

      const canvas = canvasRef.current;
      const containerWidth = containerRef.current?.clientWidth || 0;
      if (!canvas || !containerWidth) return;

      const baseViewport = page.getViewport({ scale: 1 });
      const fitScale = (containerWidth / baseViewport.width) * zoom;
      const viewport = page.getViewport({ scale: fitScale });

      // A canvas HATTERTARANAK felbontasat maximaljuk. Nagy zoomnal a
      // viewport.width * devicePixelRatio konnyen atlepi a mobil (iOS Safari)
      // canvas-korlatot (~4096 px/tengely, ~16 Mpx osszterulet): a render ilyenkor
      // csendben elhasal -> festetlen (fekete) canvas, sot ful-osszeomlas. A
      // logikai (CSS) meret valtozatlan marad, ezert a stage es a kijeloles is
      // pontosan kovet - csak a nagyitott kep lesz kicsit lagyabb a hatar felett.
      const MAX_CANVAS_DIM = 4096;
      const MAX_CANVAS_AREA = 4_000_000;
      let backingScale = window.devicePixelRatio || 1;
      backingScale = Math.min(backingScale, MAX_CANVAS_DIM / viewport.width, MAX_CANVAS_DIM / viewport.height);
      const backingArea = viewport.width * viewport.height * backingScale * backingScale;
      if (backingArea > MAX_CANVAS_AREA) backingScale *= Math.sqrt(MAX_CANVAS_AREA / backingArea);
      backingScale = Math.max(0.1, backingScale);

      canvas.width = Math.max(1, Math.floor(viewport.width * backingScale));
      canvas.height = Math.max(1, Math.floor(viewport.height * backingScale));
      canvas.style.width = `${Math.floor(viewport.width)}px`;
      canvas.style.height = `${Math.floor(viewport.height)}px`;

      // Az elozo, meg futo render megszakitasa, mielott ujat inditunk ugyanarra
      // a canvasra (kulonben "canvas busy" -> fekete canvas).
      renderTaskRef.current?.cancel();

      const transform = backingScale !== 1 ? [backingScale, 0, 0, backingScale, 0, 0] : undefined;
      const renderTask = page.render({ canvas, viewport, transform });
      renderTaskRef.current = renderTask;
      // A megszakitas RenderingCancelledException-t dob - ez vart, elnyeljuk.
      await renderTask.promise.catch(() => undefined);
      if (renderTaskRef.current === renderTask) renderTaskRef.current = null;

      if (!cancelled) {
        setStageWidth(Math.floor(viewport.width));
        setStageHeight(Math.floor(viewport.height));
      }
    })();

    return () => {
      cancelled = true;
      renderTaskRef.current?.cancel();
    };
  }, [isPdf, pdfStatus, pageNumber, zoom]);

  // Restore the same content point under its anchor after a zoom change
  // resizes the stage - without this, zooming in always snaps back to the
  // top-left corner instead of staying where you were looking (or, for
  // wheel-zoom, out from under the cursor). Also re-runs on
  // editingMeasurementId so "edit" can recenter immediately even when the
  // zoom level doesn't actually change (no resize to hook into).
  // useLayoutEffect (not useEffect): runs synchronously right after the DOM
  // is updated but before the browser paints, so the corrected scroll
  // position is what actually gets painted - no flash of the wrong
  // position, and no window for the browser's own scroll handling to run
  // in between and see (and act on) a stale position.
  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container || stageWidth === 0) return;

    // 1) Abszolut gorgetes-cel (zoomBy, arany-alapu) - ez az elsodleges.
    const scroll = pendingScrollRef.current;
    if (scroll) {
      pendingScrollRef.current = null;
      container.scrollLeft = scroll.left;
      container.scrollTop = scroll.top;
      return;
    }
    // 2) Tort-alapu kozepre-allitas (pl. meres szerkesztesekor rakozelites).
    const center = pendingZoomCenterRef.current;
    if (center) {
      pendingZoomCenterRef.current = null;
      container.scrollLeft = center.x * container.scrollWidth - center.anchorLeft;
      container.scrollTop = center.y * container.scrollHeight - center.anchorTop;
    }
  }, [stageWidth, stageHeight, editingMeasurementId]);

  // anchor: where on screen (px from the container's visible top-left) the
  // zoomed-in point should stay. Defaults to the viewport center (used by
  // the +/- buttons and pinch-zoom); wheel-zoom passes the cursor position.
  function zoomBy(delta: number, anchor?: { left: number; top: number }) {
    const container = containerRef.current;
    setZoom((current) => {
      const next = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, +(current + delta).toFixed(1)));
      if (container && next !== current) {
        const anchorLeft = anchor?.left ?? container.clientWidth / 2;
        const anchorTop = anchor?.top ?? container.clientHeight / 2;
        // Ha van meg nem alkalmazott zoom-cel, abbol lancolunk (virtualis
        // gorgetes) - kulonben a meg nem mozdult DOM-poziciobol. Igy a gyors,
        // egymast koveto lepesek pontosan komponalodnak: (s+a)*r1*r2 = (s+a)*R.
        const baseLeft = pendingScrollRef.current?.left ?? container.scrollLeft;
        const baseTop = pendingScrollRef.current?.top ?? container.scrollTop;
        const ratio = next / current;
        pendingScrollRef.current = {
          left: (baseLeft + anchorLeft) * ratio - anchorLeft,
          top: (baseTop + anchorTop) * ratio - anchorTop
        };
      }
      return next;
    });
  }

  // Desktop: scroll wheel zooms the plan. Attached as a raw, non-passive
  // listener (not a JSX onWheel prop) because React/browsers default wheel
  // listeners to passive for scroll performance, which silently makes
  // preventDefault a no-op - without it the page would scroll AND zoom at once.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    function handleWheel(event: WheelEvent) {
      event.preventDefault();
      const rect = container!.getBoundingClientRect();
      const anchor = { left: event.clientX - rect.left, top: event.clientY - rect.top };
      zoomBy(event.deltaY < 0 ? WHEEL_ZOOM_STEP : -WHEEL_ZOOM_STEP, anchor);
    }

    container.addEventListener("wheel", handleWheel, { passive: false });
    return () => container.removeEventListener("wheel", handleWheel);
  });

  // Mobile: a real two-finger pinch that zooms the plan itself, not the
  // browser page. touch-action on the stage/wrap already tells the browser
  // not to handle pinch natively there, so no preventDefault fight needed -
  // we just track the distance between the two touches ourselves.
  function pinchTouchDistance(touches: ReactTouchList) {
    const [a, b] = [touches[0], touches[1]];
    return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
  }

  function handleTouchStart(event: ReactTouchEvent) {
    if (event.touches.length === 2) pendingPinchDistanceRef.current = pinchTouchDistance(event.touches);
  }

  function handleTouchMove(event: ReactTouchEvent) {
    if (event.touches.length !== 2 || pendingPinchDistanceRef.current === null) return;

    const newDistance = pinchTouchDistance(event.touches);
    const ratio = newDistance / pendingPinchDistanceRef.current;
    if (ratio <= PINCH_ZOOM_THRESHOLD && ratio >= 1 / PINCH_ZOOM_THRESHOLD) return;

    // Anchor the zoom on the midpoint between the two fingers - not the
    // viewport center - so the spot you're actually pinching is what grows,
    // matching how pinch-to-zoom behaves everywhere else on a phone.
    const container = containerRef.current;
    let anchor: { left: number; top: number } | undefined;
    if (container) {
      const rect = container.getBoundingClientRect();
      const midX = (event.touches[0].clientX + event.touches[1].clientX) / 2;
      const midY = (event.touches[0].clientY + event.touches[1].clientY) / 2;
      anchor = { left: midX - rect.left, top: midY - rect.top };
    }

    zoomBy(ratio > PINCH_ZOOM_THRESHOLD ? ZOOM_STEP : -ZOOM_STEP, anchor);
    pendingPinchDistanceRef.current = newDistance;
  }

  function handleTouchEnd(event: ReactTouchEvent) {
    if (event.touches.length < 2) pendingPinchDistanceRef.current = null;
  }

  // Desktop: press-and-hold the middle mouse button (scroll wheel click) to
  // grab-and-drag pan around a zoomed-in plan, the same gesture CAD/map/image
  // tools use - separate from left-click, which places/selects points.
  function handleStageWrapMouseDown(event: ReactMouseEvent) {
    if (event.button !== 1) return;
    event.preventDefault();

    const container = containerRef.current;
    if (!container) return;

    panStateRef.current = { x: event.clientX, y: event.clientY, scrollLeft: container.scrollLeft, scrollTop: container.scrollTop };

    function handlePanMove(moveEvent: MouseEvent) {
      const start = panStateRef.current;
      if (!start || !container) return;
      container.scrollLeft = start.scrollLeft - (moveEvent.clientX - start.x);
      container.scrollTop = start.scrollTop - (moveEvent.clientY - start.y);
    }

    function stopPanning() {
      panStateRef.current = null;
      window.removeEventListener("mousemove", handlePanMove);
      window.removeEventListener("mouseup", stopPanning);
    }

    window.addEventListener("mousemove", handlePanMove);
    window.addEventListener("mouseup", stopPanning);
  }

  function resetDrawing() {
    setMode("idle");
    setCalibrationPoints([]);
    setCalibrationInput("");
    setDrawPoints([]);
    setLabel("");
    setNote("");
    setSelectedPoint(null);
    setEditingMeasurementId(null);
    setAiCorners([]);
    setAiSelection(null);
    setAiResult(null);
    setAiFields(EMPTY_AI_FIELDS);
    setAiRawText("");
  }

  // Editing an existing measurement reuses the draw flow. Its scale might
  // not match this session's calibration (or none may have been done yet),
  // so if needed we recover metersPerUnit from the value that was already
  // saved - it's exact, since calculatedValue = geometry * metersPerUnit(^2).
  function startEditMeasurement(measurement: PlanMeasurement) {
    resetDrawing();
    setMeasurementType(measurement.measurementType);
    setDrawPoints(measurement.points);
    setLabel(measurement.label || "");
    setNote(measurement.note || "");
    setEditingMeasurementId(measurement.id);
    setMode("measure");

    if (!metersPerUnit) {
      const geometry =
        measurement.measurementType === "area" ? polygonArea(measurement.points) : distance(measurement.points[0], measurement.points[1]);
      const derived = measurement.measurementType === "area" ? Math.sqrt(measurement.calculatedValue / geometry) : measurement.calculatedValue / geometry;
      if (Number.isFinite(derived) && derived > 0) setMetersPerUnit(derived);
    }

    // A small room can occupy a tiny corner of the whole plan - zoom in and
    // center on its bounding box instead of leaving the user to hunt for it
    // and drag points around in a cramped, mostly-unrelated view.
    const xs = measurement.points.map((point) => point.x);
    const ys = measurement.points.map((point) => point.y);
    const container = containerRef.current;
    // Esetleges fuggő zoom-cel torlese, hogy a kozepre-allitas nyerjen.
    pendingScrollRef.current = null;
    pendingZoomCenterRef.current = {
      x: (Math.min(...xs) + Math.max(...xs)) / 2,
      y: (Math.min(...ys) + Math.max(...ys)) / 2,
      anchorLeft: (container?.clientWidth || 0) / 2,
      anchorTop: (container?.clientHeight || 0) / 2
    };
    setZoom((current) => Math.min(MAX_ZOOM, Math.max(current, EDIT_FOCUS_ZOOM)));
  }

  function pointFromStageEvent(event: StagePointerEvent): PlanMeasurementPoint | null {
    const stage = event.target.getStage();
    const pos = stage?.getPointerPosition();
    if (!pos || !stageWidth) return null;
    return { x: pos.x / stageWidth, y: pos.y / stageWidth };
  }

  function handleStagePointer(event: StagePointerEvent) {
    setSelectedPoint(null);
    const point = pointFromStageEvent(event);
    if (!point) return;

    if (mode === "calibrate-pick") {
      const next = [...calibrationPoints, point].slice(-2);
      setCalibrationPoints(next);
      if (next.length === 2) setMode("calibrate-input");
      return;
    }

    if (mode === "measure") {
      setDrawPoints((current) => [...current, point]);
      return;
    }

    if (mode === "ai-select") {
      // Ket atlos sarok jeloli ki a helyiseget. FONTOS: ha mar van kesz eredmeny,
      // vagy mar 2 sarok megvolt, az uj koppintas FRISS kijelolest kezd - nem
      // csusztatja az ablakot. Kulonben egy tovabbi koppintas [regi_2, uj] parost
      // adna, ujra lefuttatna egy ertelmetlen regiot, es felulirna a jo talalatot.
      const startFresh = aiResult !== null || aiCorners.length >= 2;
      const next = startFresh ? [point] : [...aiCorners, point];
      setAiCorners(next);
      setAiResult(null);
      setAiRawText("");
      if (next.length === 2) runAiAnalysis(next[0], next[1]);
    }
  }

  async function runAiAnalysis(cornerA: PlanMeasurementPoint, cornerB: PlanMeasurementPoint) {
    const rect = rectFromCorners(cornerA, cornerB);
    setAiSelection(rect);

    if (rect.w < 0.01 || rect.h < 0.01) {
      showMessage("A kijelölés túl kicsi – jelölj ki egy nagyobb helyiség-területet.", "error");
      setAiCorners([]);
      return;
    }

    const pdf = pdfDocRef.current;
    if (!pdf) return;

    setAiAnalyzing(true);
    setMessage("");
    try {
      const page = await pdf.getPage(pageNumber);
      const textItems = await extractTextItemsInRect(page, rect);

      // Diagnosztika: mutassuk meg (kartyan + konzolon) a nyers szoveget.
      setAiRawText(textItems.map((item) => item.text).join(" | "));
      // eslint-disable-next-line no-console
      console.log("[AI elemzes] kiolvasott text-itemek:", textItems);

      const response = await fetch(`/api/documents/${doc.id}/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pageNumber, selection: rect, calculationType: "room_info", textItems })
      }).catch(() => undefined);

      const payload = await response?.json().catch(() => null);
      if (!response?.ok || !payload?.data?.result) {
        showMessage("Az elemzés nem sikerült. Próbáld újra.", "error");
        return;
      }

      const result = payload.data.result as PlanAnalysisResult;
      setAiResult(result);
      setAiFields(fieldsFromResult(result));
    } finally {
      setAiAnalyzing(false);
    }
  }

  async function saveAnalysis() {
    if (!aiResult || !aiSelection) return;
    setAiSaving(true);
    setMessage("");

    // A szerkesztett mezokbol allitjuk ossze az eredmenyt. Ahol a felhasznalo
    // beleirt/javitott, ott a forras USER_ENTERED; amit valtozatlanul hagyott,
    // ott megtartjuk az eredeti (PRINTED) forrast.
    const area = parseHuNumber(aiFields.area);
    const height = parseHuNumber(aiFields.height);
    const code = aiFields.code.trim() || null;
    const name = aiFields.name.trim() || null;
    const finish = aiFields.finish.trim() || null;

    const original = aiResult.room;
    const fieldSources: PlanAnalysisResult["fieldSources"] = { ...aiResult.fieldSources };
    const markEdited = (key: string, changed: boolean) => {
      if (changed) fieldSources[key] = "USER_ENTERED";
    };
    markEdited("code", code !== original.code);
    markEdited("name", name !== original.name);
    markEdited("printedFloorAreaM2", area !== original.printedFloorAreaM2);
    markEdited("ceilingHeightM", height !== original.ceilingHeightM);
    markEdited("floorFinish", finish !== original.floorFinish);

    const result: PlanAnalysisResult = {
      room: { code, name, printedFloorAreaM2: area, ceilingHeightM: height, floorFinish: finish },
      fieldSources,
      confidence: aiResult.confidence,
      warnings: aiResult.warnings
    };

    const response = await fetch(`/api/documents/${doc.id}/analyses`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pageNumber, selection: aiSelection, calculationType: "room_info", result, userVerified: true })
    }).catch(() => undefined);

    setAiSaving(false);

    if (!response?.ok) {
      showMessage("Az elemzés mentése nem sikerült.", "error");
      return;
    }

    const payload = await response.json().catch(() => null);
    if (payload?.data) setSavedAnalyses((current) => [payload.data, ...current]);
    showMessage("Helyiség-elemzés elmentve.");
    resetDrawing();
  }

  function moveCalibrationPoint(index: number, point: PlanMeasurementPoint) {
    setCalibrationPoints((current) => current.map((existing, i) => (i === index ? point : existing)));
  }

  function moveDrawPoint(index: number, point: PlanMeasurementPoint) {
    setDrawPoints((current) => current.map((existing, i) => (i === index ? point : existing)));
  }

  // Tapping a point selects it (toggling off if already selected) instead
  // of deleting immediately - a fast double-tap to delete is unreliable
  // with a fingertip, so deletion goes through the explicit button below.
  function selectCalibrationPoint(index: number) {
    setSelectedPoint((current) => (current?.kind === "calibration" && current.index === index ? null : { kind: "calibration", index }));
  }

  function selectDrawPoint(index: number) {
    setSelectedPoint((current) => (current?.kind === "draw" && current.index === index ? null : { kind: "draw", index }));
  }

  function deleteSelectedPoint() {
    if (!selectedPoint) return;

    if (selectedPoint.kind === "calibration") {
      setCalibrationPoints((current) => {
        const next = current.filter((_, i) => i !== selectedPoint.index);
        if (next.length < 2) setMode("calibrate-pick");
        return next;
      });
    } else {
      setDrawPoints((current) => current.filter((_, i) => i !== selectedPoint.index));
    }

    setSelectedPoint(null);
  }

  function deleteLastPoint() {
    setSelectedPoint(null);
    if (mode === "calibrate-pick") {
      setCalibrationPoints((current) => current.slice(0, -1));
    } else if (mode === "measure") {
      setDrawPoints((current) => current.slice(0, -1));
    }
  }

  // Lets you reach any point (prev/next) without having to hit its tiny
  // crosshair on the canvas - the same precision problem that makes tapping
  // the right spot hard in the first place also makes tapping the right
  // point hard, so this gives a reliable, click-free way to step through them.
  function stepSelectedPoint(direction: 1 | -1) {
    const activePoints = mode === "calibrate-pick" ? calibrationPoints : mode === "measure" ? drawPoints : [];
    if (!activePoints.length) return;

    const kind: NonNullable<SelectedPoint>["kind"] = mode === "calibrate-pick" ? "calibration" : "draw";
    const currentIndex = selectedPoint?.kind === kind ? selectedPoint.index : direction === 1 ? -1 : 0;
    const nextIndex = (currentIndex + direction + activePoints.length) % activePoints.length;
    setSelectedPoint({ kind, index: nextIndex });
  }

  // Small fixed pixel nudge (not a fraction of the plan) so precision scales
  // with zoom - the more you've zoomed in, the finer the real-world move.
  const NUDGE_PIXELS = 3;

  function nudgeSelectedPoint(dx: number, dy: number) {
    if (!selectedPoint || !stageWidth) return;
    const deltaX = (dx * NUDGE_PIXELS) / stageWidth;
    const deltaY = (dy * NUDGE_PIXELS) / stageWidth;

    if (selectedPoint.kind === "calibration") {
      setCalibrationPoints((current) =>
        current.map((point, i) => (i === selectedPoint.index ? { x: point.x + deltaX, y: point.y + deltaY } : point))
      );
    } else {
      setDrawPoints((current) => current.map((point, i) => (i === selectedPoint.index ? { x: point.x + deltaX, y: point.y + deltaY } : point)));
    }
  }

  async function confirmCalibration() {
    const realDistance = Number(calibrationInput.replace(",", "."));
    if (!Number.isFinite(realDistance) || realDistance <= 0 || calibrationPoints.length !== 2) {
      showMessage("Adj meg egy érvényes, pozitív méter értéket.", "error");
      return;
    }

    const normalizedDistance = distance(calibrationPoints[0], calibrationPoints[1]);
    if (normalizedDistance <= 0) {
      showMessage("A két pont túl közel van egymáshoz, jelöld ki újra.", "error");
      return;
    }

    const nextMetersPerUnit = realDistance / normalizedDistance;
    setMetersPerUnit(nextMetersPerUnit);
    setMode("idle");
    setCalibrationPoints([]);
    setCalibrationInput("");

    const response = await fetch(`/api/documents/${doc.id}/calibration`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ metersPerUnit: nextMetersPerUnit })
    }).catch(() => undefined);

    showMessage(
      response?.ok
        ? `Kalibrálva: ${realDistance} m a kijelölt szakaszon. Elmentve ehhez a tervhez.`
        : `Kalibrálva: ${realDistance} m a kijelölt szakaszon. (A mentés nem sikerült, csak erre a munkamenetre érvényes.)`,
      response?.ok ? "success" : "error"
    );
  }

  const liveValue =
    metersPerUnit && drawPoints.length >= (measurementType === "area" ? 3 : 2)
      ? measurementType === "area"
        ? polygonArea(drawPoints) * metersPerUnit * metersPerUnit
        : distance(drawPoints[0], drawPoints[1]) * metersPerUnit
      : null;

  async function saveMeasurement() {
    if (liveValue === null) return;
    setSaving(true);
    setMessage("");

    const isEditing = Boolean(editingMeasurementId);
    const response = await fetch(`/api/documents/${doc.id}/measurements`, {
      method: isEditing ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        measurementId: editingMeasurementId || undefined,
        pageNumber: isPdf ? pageNumber : 1,
        measurementType,
        points: drawPoints,
        calculatedValue: liveValue,
        label: label.trim() || undefined,
        note: note.trim() || undefined
      })
    }).catch(() => undefined);

    setSaving(false);

    if (!response?.ok) {
      showMessage(isEditing ? "A mérés módosítása nem sikerült." : "A mérés mentése nem sikerült.", "error");
      return;
    }

    const result = await response.json().catch(() => null);
    if (result?.data) {
      setSavedMeasurements((current) =>
        isEditing ? current.map((item) => (item.id === result.data.id ? result.data : item)) : [result.data, ...current]
      );
    }
    showMessage(isEditing ? "Mérés módosítva." : "Mérés elmentve.");
    resetDrawing();
  }

  async function deleteMeasurement(measurementId: string) {
    const response = await fetch(`/api/documents/${doc.id}/measurements`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ measurementId })
    }).catch(() => undefined);

    if (!response?.ok) return;
    setSavedMeasurements((current) => current.filter((item) => item.id !== measurementId));
    if (editingMeasurementId === measurementId) resetDrawing();
  }

  const canFinishArea = measurementType === "area" && drawPoints.length >= 3;
  const canFinishLength = measurementType === "length" && drawPoints.length >= 2;
  const visibleSavedMeasurements = savedMeasurements.filter((measurement) => !isPdf || measurement.pageNumber === pageNumber);

  return (
    <div className="measure-tool">
      <div className="measure-toolbar">
        {canMeasure ? (
          <div className="measure-toolbar-group">
            <button type="button" className="button ghost" onClick={() => { resetDrawing(); setMode("calibrate-pick"); }}>
              Kalibrálás {metersPerUnit ? "(újra)" : ""}
            </button>
            <select
              value={measurementType}
              onChange={(event) => setMeasurementType(event.target.value as PlanMeasurementType)}
              disabled={mode === "measure"}
              suppressHydrationWarning
            >
              <option value="area">Terület (m²)</option>
              <option value="length">Hossz (m)</option>
            </select>
            {mode !== "measure" ? (
              <button
                type="button"
                className="button primary"
                disabled={!metersPerUnit}
                onClick={() => { setDrawPoints([]); setMode("measure"); }}
                title={!metersPerUnit ? "Előbb kalibrálj" : ""}
              >
                Mérés indítása
              </button>
            ) : (
              <button type="button" className="button ghost" onClick={resetDrawing}>
                Mégse
              </button>
            )}
          </div>
        ) : null}

        {canMeasure && isPdf ? (
          <div className="measure-toolbar-group">
            {mode !== "ai-select" ? (
              <button type="button" className="button primary" onClick={() => { resetDrawing(); setMode("ai-select"); }}>
                AI helyiség-elemzés
              </button>
            ) : (
              <button type="button" className="button ghost" onClick={resetDrawing}>
                AI elemzés vége
              </button>
            )}
          </div>
        ) : null}

        {isPdf && numPages > 1 ? (
          <div className="measure-toolbar-group">
            <button type="button" className="button ghost" disabled={pageNumber <= 1} onClick={() => setPageNumber((p) => p - 1)}>
              ←
            </button>
            <span>{pageNumber} / {numPages}</span>
            <button type="button" className="button ghost" disabled={pageNumber >= numPages} onClick={() => setPageNumber((p) => p + 1)}>
              →
            </button>
          </div>
        ) : null}

        <div className="measure-toolbar-group">
          <button type="button" className="button ghost" disabled={zoom <= MIN_ZOOM} onClick={() => zoomBy(-ZOOM_STEP)}>
            −
          </button>
          <span>{Math.round(zoom * 100)}%</span>
          <button type="button" className="button ghost" disabled={zoom >= MAX_ZOOM} onClick={() => zoomBy(ZOOM_STEP)}>
            +
          </button>
        </div>

        <button type="button" className="button ghost" onClick={onClose}>
          Bezárás
        </button>
      </div>

      {message ? <p className={messageStatus === "error" ? "error-message measure-message" : "success-message measure-message"}>{message}</p> : null}

      {mode === "calibrate-pick" ? (
        <p className="measure-hint">
          <span className="measure-hint-full">Koppints két pontra, aminek ismered a valós távolságát.</span>
          <span className="measure-hint-compact">{calibrationPoints.length}/2 pont kijelölve</span>
        </p>
      ) : null}

      {mode === "calibrate-input" ? (
        <div className="measure-calibrate-input">
          <label>
            Ez a szakasz a valóságban hány méter?
            <input
              type="text"
              inputMode="decimal"
              value={calibrationInput}
              onChange={(event) => setCalibrationInput(event.target.value)}
              placeholder="pl. 4.2"
              suppressHydrationWarning
            />
          </label>
          <button type="button" className="button primary" onClick={confirmCalibration}>
            Kalibrálás mentése
          </button>
        </div>
      ) : null}

      {mode === "measure" ? (
        <p className="measure-hint">
          <span className="measure-hint-full">
            {canFinishArea || canFinishLength
              ? "Koppints ponttal bővítheted a kijelölést, vagy mentsd el."
              : measurementType === "area"
                ? "Koppints a helyiség/terület sarkaira sorban (legalább 3 pont)."
                : "Koppints a szakasz két végpontjára."}
          </span>
          {liveValue !== null ? <span className="measure-hint-compact">Eddig: {formatValue(liveValue, measurementType)}</span> : null}
        </p>
      ) : null}

      {mode === "ai-select" && !aiResult ? (
        <p className="measure-hint">
          <span className="measure-hint-full">
            {aiAnalyzing
              ? "Elemzés folyamatban…"
              : "Jelölj ki egy helyiséget: koppints a terület két átlós sarkára (bal-felső és jobb-alsó)."}
          </span>
          <span className="measure-hint-compact">{aiAnalyzing ? "Elemzés…" : `${aiCorners.length}/2 sarok`}</span>
        </p>
      ) : null}

      {mode === "ai-select" && aiResult ? (
        <div className="ai-result-card">
          <div className="ai-result-head">
            <strong>Felismert helyiség</strong>
            <span className={aiResult.confidence < 0.55 ? "ai-confidence ai-confidence-low" : "ai-confidence"}>
              biztonság: {Math.round(aiResult.confidence * 100)}%
            </span>
          </div>

          {aiResult.confidence < 0.55 ? (
            <p className="ai-result-warning">⚠ Bizonytalan felismerés – ellenőrizd az értékeket mentés előtt.</p>
          ) : null}

          <div className="ai-result-fields">
            <label>
              Helyiség kódja
              <input type="text" value={aiFields.code} onChange={(e) => setAiFields((f) => ({ ...f, code: e.target.value }))} placeholder="pl. B3.08" suppressHydrationWarning />
            </label>
            <label>
              Megnevezés
              <input type="text" value={aiFields.name} onChange={(e) => setAiFields((f) => ({ ...f, name: e.target.value }))} placeholder="pl. FÜRDŐ" suppressHydrationWarning />
            </label>
            <label>
              Alapterület (m²)
              <input type="text" inputMode="decimal" value={aiFields.area} onChange={(e) => setAiFields((f) => ({ ...f, area: e.target.value }))} placeholder="pl. 4,33" suppressHydrationWarning />
            </label>
            <label>
              Belmagasság (m)
              <input type="text" inputMode="decimal" value={aiFields.height} onChange={(e) => setAiFields((f) => ({ ...f, height: e.target.value }))} placeholder="pl. 2,70" suppressHydrationWarning />
            </label>
            <label>
              Padlóburkolat
              <input type="text" value={aiFields.finish} onChange={(e) => setAiFields((f) => ({ ...f, finish: e.target.value }))} placeholder="pl. greslap" suppressHydrationWarning />
            </label>
          </div>

          {aiResult.warnings.length ? (
            <ul className="ai-result-warnings">
              {aiResult.warnings.map((warning, index) => (
                <li key={index}>{warning}</li>
              ))}
            </ul>
          ) : null}

          {aiRawText ? (
            <details className="ai-result-raw">
              <summary>Kiolvasott szöveg (diagnosztika)</summary>
              <p>{aiRawText}</p>
            </details>
          ) : (
            <p className="ai-result-raw-empty">Diagnosztika: a kijelölt régióban nem volt kiolvasható szöveg (üres text-layer).</p>
          )}

          <div className="ai-result-actions">
            <button type="button" className="button ghost" onClick={() => { setAiResult(null); setAiCorners([]); setAiSelection(null); setAiRawText(""); }}>
              Új kijelölés
            </button>
            <button type="button" className="button primary" disabled={aiSaving} onClick={saveAnalysis}>
              {aiSaving ? "Mentés…" : "Elemzés mentése"}
            </button>
          </div>
        </div>
      ) : null}

      {(mode === "calibrate-pick" && calibrationPoints.length > 0) || (mode === "measure" && drawPoints.length > 0) ? (
        <div className="measure-point-nav">
          <div className="measure-point-nav-group">
            <button type="button" className="measure-undo" onClick={() => stepSelectedPoint(-1)} aria-label="Előző pont">
              ◀ Pont
            </button>
            <span className="measure-point-nav-label">
              {selectedPoint ? selectedPoint.index + 1 : "–"} / {mode === "calibrate-pick" ? calibrationPoints.length : drawPoints.length}
            </span>
            <button type="button" className="measure-undo" onClick={() => stepSelectedPoint(1)} aria-label="Következő pont">
              Pont ▶
            </button>
            <button type="button" className="measure-undo" onClick={deleteLastPoint}>
              Utolsó törlése
            </button>
          </div>

          {selectedPoint ? (
            <div className="measure-point-nav-group">
              <button type="button" className="measure-nudge" onClick={() => nudgeSelectedPoint(0, -1)} aria-label="Kijelölt pont mozgatása felfelé">
                ↑
              </button>
              <button type="button" className="measure-nudge" onClick={() => nudgeSelectedPoint(0, 1)} aria-label="Kijelölt pont mozgatása lefelé">
                ↓
              </button>
              <button type="button" className="measure-nudge" onClick={() => nudgeSelectedPoint(-1, 0)} aria-label="Kijelölt pont mozgatása balra">
                ←
              </button>
              <button type="button" className="measure-nudge" onClick={() => nudgeSelectedPoint(1, 0)} aria-label="Kijelölt pont mozgatása jobbra">
                →
              </button>
              <button type="button" className="measure-undo measure-undo-danger" onClick={deleteSelectedPoint}>
                Kijelölt pont törlése
              </button>
            </div>
          ) : null}
        </div>
      ) : null}

      {mode === "measure" && (canFinishArea || canFinishLength) ? (
        <div className="measure-save-row">
          <input
            type="text"
            value={label}
            onChange={(event) => setLabel(event.target.value)}
            placeholder="Címke (pl. Konyha)"
            suppressHydrationWarning
          />
          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Megjegyzés (opcionális)"
            rows={1}
            suppressHydrationWarning
          />
          <button type="button" className="button primary" disabled={saving} onClick={saveMeasurement}>
            {saving
              ? "Mentés..."
              : `${editingMeasurementId ? "Módosítás mentése" : "Mentés"} (${liveValue !== null ? formatValue(liveValue, measurementType) : ""})`}
          </button>
        </div>
      ) : null}

      <div
        className="measure-stage-wrap"
        ref={containerRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        onMouseDown={handleStageWrapMouseDown}
      >
        {isImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img ref={imageRef} src={url} alt={doc.title} className="measure-base-image" style={{ width: `${zoom * 100}%` }} />
        ) : null}
        {isPdf ? (
          <>
            {pdfStatus === "loading" ? <p className="measure-hint">Terv betöltése...</p> : null}
            {pdfStatus === "error" ? <p className="measure-hint">A terv nem tölthető be a mérőeszközben.</p> : null}
            <canvas ref={canvasRef} className="measure-base-canvas" />
          </>
        ) : null}

        {mode === "ai-select" && aiSelection && stageWidth > 0 ? (
          <div
            className="ai-selection-rect"
            style={{
              left: `${aiSelection.x * stageWidth}px`,
              top: `${aiSelection.y * stageWidth}px`,
              width: `${aiSelection.w * stageWidth}px`,
              height: `${aiSelection.h * stageWidth}px`
            }}
            aria-hidden="true"
          />
        ) : null}

        {stageWidth > 0 && stageHeight > 0 ? (
          <PlanMeasurementCanvas
            stageWidth={stageWidth}
            stageHeight={stageHeight}
            onStageClick={handleStagePointer}
            savedMeasurements={
              loadingSaved
                ? []
                : savedMeasurements.filter(
                    (measurement) => (!isPdf || measurement.pageNumber === pageNumber) && measurement.id !== editingMeasurementId
                  )
            }
            calibrationPoints={calibrationPoints}
            drawPoints={drawPoints}
            measurementType={measurementType}
            metersPerUnit={metersPerUnit}
            selectedPoint={selectedPoint}
            onDragCalibrationPoint={moveCalibrationPoint}
            onDragDrawPoint={moveDrawPoint}
            onSelectCalibrationPoint={selectCalibrationPoint}
            onSelectDrawPoint={selectDrawPoint}
          />
        ) : null}
      </div>

      <div className="measure-list">
        <button type="button" className="measure-list-toggle" onClick={() => setSavedListOpen((current) => !current)}>
          <h3>
            Mentett mérések ({visibleSavedMeasurements.length}){isPdf ? ` · ${pageNumber}. oldal` : ""}
          </h3>
          <span aria-hidden="true">{savedListOpen ? "▾" : "▸"}</span>
        </button>

        {savedListOpen ? (
          <>
            {loadingSaved ? <p className="measure-hint">Betöltés...</p> : null}
            {!loadingSaved && !visibleSavedMeasurements.length ? <p className="measure-hint">Még nincs mentett mérés ehhez a tervhez.</p> : null}
            {visibleSavedMeasurements.map((measurement) => (
              <div className="measure-list-item" key={measurement.id}>
                <span className="measure-swatch" style={{ backgroundColor: colorForMeasurementId(measurement.id) }} aria-hidden="true" />
                <div>
                  <strong>{measurement.label || (measurement.measurementType === "area" ? "Terület" : "Hossz")}</strong>
                  <small>
                    {formatValue(measurement.calculatedValue, measurement.measurementType)} · {formatTimestamp(measurement.createdAt)}
                  </small>
                  {measurement.note ? <p className="measure-note">{measurement.note}</p> : null}
                </div>
                {canMeasure ? (
                  <button type="button" className="measure-undo" onClick={() => startEditMeasurement(measurement)}>
                    Szerkesztés
                  </button>
                ) : null}
                {canDeleteMeasurement ? (
                  <button type="button" className="document-row-delete" onClick={() => deleteMeasurement(measurement.id)} aria-label="Mérés törlése">
                    ×
                  </button>
                ) : null}
              </div>
            ))}
          </>
        ) : null}
      </div>

      {savedAnalyses.length ? (
        <div className="measure-list">
          <h3 className="ai-list-title">AI helyiség-elemzések ({savedAnalyses.length})</h3>
          {savedAnalyses
            .filter((analysis) => !isPdf || analysis.pageNumber === pageNumber)
            .map((analysis) => (
              <div className="measure-list-item" key={analysis.id}>
                <div>
                  <strong>
                    {[analysis.result.room.code, analysis.result.room.name].filter(Boolean).join(" · ") || "Helyiség"}
                  </strong>
                  <small>
                    {[
                      analysis.result.room.printedFloorAreaM2 !== null ? `${formatValue(analysis.result.room.printedFloorAreaM2, "area")}` : null,
                      analysis.result.room.ceilingHeightM !== null ? `bm ${formatValue(analysis.result.room.ceilingHeightM, "length")}` : null,
                      analysis.result.room.floorFinish
                    ]
                      .filter(Boolean)
                      .join(" · ") || "nincs kiolvasott adat"}
                  </small>
                </div>
              </div>
            ))}
        </div>
      ) : null}
    </div>
  );
}
