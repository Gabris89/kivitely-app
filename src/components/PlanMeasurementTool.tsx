"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import type { PDFDocumentLoadingTask, PDFDocumentProxy, PDFPageProxy, RenderTask } from "pdfjs-dist";
import type { PlanAnalysis, PlanAnalysisResult, PlanMeasurement, PlanMeasurementPoint, PlanMeasurementType, PlanSelectionRect, PlanTextItem, ProjectDocument } from "@/types";
import type { DetailImage, SelectedPoint, ViewTransform } from "./PlanMeasurementCanvas";
import { colorForMeasurementId } from "@/lib/measurementColors";
import { extractAllTextItems, extractTextItemsInRect, findNearestDimension, findRoomMatches, suggestDimensionPairs, type DimensionPair, type RoomMatch } from "@/lib/ai/pdfTextExtract";

// The whole Konva canvas loads as one client-only unit - see the comment
// in PlanMeasurementCanvas.tsx for why it can't be split per-primitive.
const PlanMeasurementCanvas = dynamic(() => import("./PlanMeasurementCanvas"), { ssr: false });

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

const MIN_SCALE = 0.2;
const MAX_SCALE = 40;
const ZOOM_BUTTON_FACTOR = 1.4; // a +/- gombok nagyitas-szorzoja
const EDIT_FOCUS_SCALE = 5; // szerkeszteskor ekkora nagyitasra kozelitunk

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
  const pdfDocRef = useRef<PDFDocumentProxy | null>(null);
  const loadingTaskRef = useRef<PDFDocumentLoadingTask | null>(null);
  // A folyamatban levo PDF-render taskja (base-render). Gyors valtasnal az
  // elozot meg kell szakitani, kulonben a pdf.js "canvas busy" hibat dob.
  const renderTaskRef = useRef<RenderTask | null>(null);
  // A detail-render (lathato resz) taszkja + a megallasra varo idozito, es az
  // aktualis oldal-proxy (a base-render allitja be, hogy a detail is elerje).
  const detailTaskRef = useRef<RenderTask | null>(null);
  const detailIdleRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pageProxyRef = useRef<PDFPageProxy | null>(null);
  // A base-kep merete PDF-pontban -> base-egyseg atvaltas (a detail-renderhez).
  const baseScaleRef = useRef<number>(1);
  // A nezet EGYETLEN transzformacioja (Konva Stage): nagyitas + eltolas. A refbe
  // is tukrozzuk, hogy a renderDetail stale-closure nelkul lassa a friss erteket.
  const viewRef = useRef<ViewTransform>({ scale: 1, x: 0, y: 0 });

  const [view, setView] = useState<ViewTransform>({ scale: 1, x: 0, y: 0 });
  // A viewport (kontener) merete - a Stage ezt tolti ki.
  const [stageSize, setStageSize] = useState({ w: 0, h: 0 });
  // A teljes-lapos attekinto kep (base) + a lathato reszrol keszult eles darab
  // (detail). A base merete (baseImg.w/h) a normalizalt koordinatak referenciaja
  // - a regi "stageWidth" szerepet veszi at.
  const [baseImg, setBaseImg] = useState<{ canvas: HTMLCanvasElement; w: number; h: number } | null>(null);
  const [detailImg, setDetailImg] = useState<DetailImage | null>(null);
  // A base-kep merete = a normalizalt koordinatak referenciaja (base-egyseg).
  const baseW = baseImg?.w ?? 0;
  const baseH = baseImg?.h ?? 0;
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
  // Kodra kereses: a felhasznalo beirja a helyiseg kodjat/nevet, a tervrol
  // megkeressuk. Ha tobb illik (a kod lakasonkent ismetlodik), valaszto-lista.
  const [aiCodeQuery, setAiCodeQuery] = useState("");
  const [aiMatches, setAiMatches] = useState<RoomMatch[]>([]);
  // A felismert-kartya alapbol tomor (osszefoglalo + Mentes), a terv kapja a
  // helyet; egy kattintasra kinyilik szerkesztesre. Kulonosen telefonon fontos.
  const [aiCardExpanded, setAiCardExpanded] = useState(false);
  const [aiListOpen, setAiListOpen] = useState(false);
  // Meretek (a kerulethez): a felkinalt SZELESSEG x HOSSZ parok kozul valaszt a
  // felmero (a parok szorzata ~ a kiirt terulet), VAGY kezzel beir.
  const [aiWidth, setAiWidth] = useState("");
  const [aiDepth, setAiDepth] = useState("");
  const [aiDimPairs, setAiDimPairs] = useState<DimensionPair[]>([]);
  // Kozvetlen kerulet-bevitel (nyitott ter / L-alak / a falak osszege), ami
  // FELULIRJA a teglalapbol (szel x hossz) szamolt kerueletet. Igy a Fal/Labazat/
  // Szalag akkor is megvan, ha a szoba nem sima teglalap vagy hianyzik egy kota.
  const [aiPerimeter, setAiPerimeter] = useState("");
  // "Koppints a kotakra" mod: a felmero a falak KOTAIRA koppint, a program a
  // legkozelebbi kiirt szam EGZAKT erteket veszi es osszegzi. Pontos (nem mer,
  // nem tippel) es keves munka. A marks a kivalasztott kotak (ertek + pozicio).
  const [aiKotaMode, setAiKotaMode] = useState(false);
  // A kivalasztott SZELESSEG-kota (ertek + pozicio) - vizualis visszajelzeshez.
  const [aiWidthMark, setAiWidthMark] = useState<{ x: number; y: number; value: number } | null>(null);
  // A lap OSSZES text-eleme (a kota-valasztashoz kell, hogy a koppintashoz
  // legkozelebbi kiirt szamot megtalaljuk).
  const aiAllItemsRef = useRef<PlanTextItem[]>([]);

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

  // Egy PDF-regio kirajzolasa uj (offscreen) canvasba - a detail-reteghez.
  // offX/offY: a viewport-pixelben ertett bal-felso levagas; kimenet outW x outH.
  const renderRegion = useCallback(
    async (page: PDFPageProxy, pdfScale: number, offX: number, offY: number, outW: number, outH: number) => {
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.floor(outW));
      canvas.height = Math.max(1, Math.floor(outH));
      const viewport = page.getViewport({ scale: pdfScale });
      const transform = [1, 0, 0, 1, -offX, -offY];
      detailTaskRef.current?.cancel();
      const task = page.render({ canvas, viewport, transform });
      detailTaskRef.current = task;
      await task.promise.catch(() => undefined);
      if (detailTaskRef.current === task) detailTaskRef.current = null;
      return canvas;
    },
    []
  );

  // Az EPP LATHATO kivagas ELES ujrarajzolasa a Stage aktualis nezetebol
  // (viewRef). Csak egy kepernyonyi terulet, a keszulek valodi felbontasan ->
  // eles barmilyen nagyitason, a teljes-lap memoria-robbanasa nelkul. A base-egyseg
  // koordinatakat (a base-kep merete) hasznaljuk, ugyanabban a terben, mint a
  // meresek. Kepnel (nincs page) nincs detail.
  const renderDetail = useCallback(async () => {
    const page = pageProxyRef.current;
    const base = baseImg;
    if (!page || !base) return;
    const { scale: S, x: stageX, y: stageY } = viewRef.current;
    const vw0 = stageSize.w;
    const vh0 = stageSize.h;
    if (!vw0 || !vh0) return;

    // Lathato teglalap a base-egyseg (Stage-lokalis) terben, a laphatarra vagva.
    let x = (0 - stageX) / S;
    let y = (0 - stageY) / S;
    let w = vw0 / S;
    let h = vh0 / S;
    if (x < 0) { w += x; x = 0; }
    if (y < 0) { h += y; y = 0; }
    if (x + w > base.w) w = base.w - x;
    if (y + h > base.h) h = base.h - y;
    if (w <= 0 || h <= 0) return;

    const baseScale = baseScaleRef.current;
    let dpr = Math.min(window.devicePixelRatio || 1, 3);
    let outW = w * S * dpr;
    let outH = h * S * dpr;
    const DETAIL_MAX_AREA = 10_000_000;
    const areaPx = outW * outH;
    if (areaPx > DETAIL_MAX_AREA) {
      const k = Math.sqrt(DETAIL_MAX_AREA / areaPx);
      dpr *= k;
      outW *= k;
      outH *= k;
    }
    // pdfScale = pontok -> detail-pixel; a base-egyseg = baseScale-pixel.
    const pdfScale = baseScale * S * dpr;
    const canvas = await renderRegion(page, pdfScale, x * S * dpr, y * S * dpr, outW, outH);
    setDetailImg({ canvas, x, y, w, h });
  }, [baseImg, stageSize.w, stageSize.h, renderRegion]);

  // Gesztus (zoom/pan) megallasa utan (rovid tetlensegre) eles ujrarajzolas.
  const scheduleDetail = useCallback(() => {
    if (detailIdleRef.current) clearTimeout(detailIdleRef.current);
    detailIdleRef.current = setTimeout(() => void renderDetail(), 140);
  }, [renderDetail]);

  // A Canvas gesztus-callbackjei: a nezet frissitese (viewRef azonnal, hogy a
  // renderDetail a friss erteket lassa) + megallaskor eles ujrarajzolas.
  const handleViewChange = useCallback((next: ViewTransform) => {
    viewRef.current = next;
    setView(next);
  }, []);

  // Kilepeskor a fuggo idozito + reszlet-render leallitasa.
  useEffect(
    () => () => {
      if (detailIdleRef.current) clearTimeout(detailIdleRef.current);
      detailTaskRef.current?.cancel();
    },
    []
  );

  // A viewport (kontener) meretenek kovetese - a Stage ezt tolti ki.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const apply = () => setStageSize({ w: el.clientWidth, h: el.clientHeight });
    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // A view refbe tukrozese (stale-closure nelkul a renderDetailhez).
  useEffect(() => {
    viewRef.current = view;
  }, [view]);

  // PDF: a lap teljes-lapos, ALACSONY felbontasu attekinto kepe (base). Az
  // elesseget a detail-reteg adja; ez az attekintes + a koordinata-referencia
  // (baseImg.w = a regi stageWidth szerepe). Stage-scale 1 = teljes szelesseg.
  useEffect(() => {
    if (!isPdf || pdfStatus !== "ready" || !pdfDocRef.current) return;
    let cancelled = false;

    (async () => {
      const pdf = pdfDocRef.current;
      if (!pdf) return;
      const page = await pdf.getPage(pageNumber);
      if (cancelled) return;
      pageProxyRef.current = page;

      const cw = containerRef.current?.clientWidth || 0;
      if (!cw) return;
      const v1 = page.getViewport({ scale: 1 });
      const baseScale = cw / v1.width;
      baseScaleRef.current = baseScale;
      const bw = v1.width * baseScale;
      const bh = v1.height * baseScale;

      // Az attekinto kep felbontasa sapkazva (a detail adja az elesseget).
      const BASE_MAX_AREA = 4_000_000;
      let renderScale = baseScale;
      const bArea = bw * bh;
      if (bArea > BASE_MAX_AREA) renderScale *= Math.sqrt(BASE_MAX_AREA / bArea);

      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.floor(v1.width * renderScale));
      canvas.height = Math.max(1, Math.floor(v1.height * renderScale));
      const viewport = page.getViewport({ scale: renderScale });
      renderTaskRef.current?.cancel();
      const task = page.render({ canvas, viewport });
      renderTaskRef.current = task;
      await task.promise.catch(() => undefined);
      if (renderTaskRef.current === task) renderTaskRef.current = null;
      if (cancelled) return;

      setDetailImg(null);
      setView({ scale: 1, x: 0, y: 0 });
      viewRef.current = { scale: 1, x: 0, y: 0 };
      setBaseImg({ canvas, w: bw, h: bh });
    })();

    return () => {
      cancelled = true;
      renderTaskRef.current?.cancel();
    };
  }, [isPdf, pdfStatus, pageNumber]);

  // Kep-dokumentum: a kepet base-kanvaszba rajzoljuk (nincs detail-reteg, a kep
  // maga raszter). A base merete a koordinata-referencia.
  useEffect(() => {
    if (!isImage || !url) return;
    let cancelled = false;
    const img = new Image();
    img.onload = () => {
      if (cancelled) return;
      const cw = containerRef.current?.clientWidth || img.naturalWidth || 1;
      const MAX_IMG_DIM = 4096;
      const natW = img.naturalWidth || 1;
      const natH = img.naturalHeight || 1;
      let scale = Math.min(1, cw / natW);
      scale = Math.min(scale, MAX_IMG_DIM / natW, MAX_IMG_DIM / natH);
      const w = Math.max(1, Math.round(natW * scale));
      const h = Math.max(1, Math.round(natH * scale));
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      canvas.getContext("2d")?.drawImage(img, 0, 0, w, h);
      baseScaleRef.current = scale;
      setDetailImg(null);
      setView({ scale: 1, x: 0, y: 0 });
      viewRef.current = { scale: 1, x: 0, y: 0 };
      setBaseImg({ canvas, w, h });
    };
    img.src = url;
    return () => {
      cancelled = true;
    };
  }, [isImage, url]);

  // Base kesz -> az EPP LATHATO reszt is elesitjuk.
  useEffect(() => {
    if (baseImg) scheduleDetail();
  }, [baseImg, scheduleDetail]);

  // A +/- gombok: nagyitas a viewport KOZEPPONTJA fele (a Canvas ugyanezt a
  // kepletet hasznalja a kurzor/ujj ala). A wheel/pinch/pan mostantol a Konva
  // Stage-en van (a Canvasban), nem itt.
  function zoomBy(factor: number) {
    setView((v) => {
      const newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, v.scale * factor));
      const cx = stageSize.w / 2;
      const cy = stageSize.h / 2;
      const wx = (cx - v.x) / v.scale;
      const wy = (cy - v.y) / v.scale;
      const next = { scale: newScale, x: cx - wx * newScale, y: cy - wy * newScale };
      viewRef.current = next;
      return next;
    });
    scheduleDetail();
  }

  // A nezet kozeppontba allitasa egy NORMALIZALT pontra, adott nagyitason
  // (szerkesztes-fokusz, AI-talalat kozepre hozasa).
  const centerViewOn = useCallback(
    (normX: number, normY: number, targetScale?: number) => {
      if (!stageSize.w || !stageSize.h || !baseW) return;
      const S = Math.max(MIN_SCALE, Math.min(MAX_SCALE, targetScale ?? viewRef.current.scale));
      const next = { scale: S, x: stageSize.w / 2 - normX * baseW * S, y: stageSize.h / 2 - normY * baseW * S };
      viewRef.current = next;
      setView(next);
      scheduleDetail();
    },
    [baseW, stageSize.w, stageSize.h, scheduleDetail]
  );

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
    setAiCodeQuery("");
    setAiMatches([]);
    setAiWidth("");
    setAiDepth("");
    setAiPerimeter("");
    setAiKotaMode(false);
    setAiWidthMark(null);
    setAiDimPairs([]);
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
    // center on its bounding box instead of leaving the user to hunt for it.
    const xs = measurement.points.map((point) => point.x);
    const ys = measurement.points.map((point) => point.y);
    const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
    const cy = (Math.min(...ys) + Math.max(...ys)) / 2;
    centerViewOn(cx, cy, Math.max(viewRef.current.scale, EDIT_FOCUS_SCALE));
  }

  // A koppintas mar NORMALIZALT pontja a Canvasbol jon
  // (getRelativePointerPosition / baseW), igy fuggetlen a Stage-transzformaciotol.
  function handleStagePointer(point: PlanMeasurementPoint) {
    setSelectedPoint(null);

    // Szelesseg-kota valasztasa: a koppintashoz legkozelebbi kiirt kotat vesszuk
    // (egzakt, "pattintas") -> ez a SZELESSEG, a MELYSEGET pedig a kiirt teruletbol
    // szamoljuk (terulet / szelesseg). A hianyzo kotat nem kell megkeresni.
    if (aiKotaMode) {
      const hit = findNearestDimension(aiAllItemsRef.current, point, 0.03);
      if (hit) {
        setAiWidth(numToStr(hit.value));
        setAiWidthMark(hit);
        const printedArea = parseHuNumber(aiFields.area);
        if (printedArea !== null && hit.value > 0) {
          setAiDepth(numToStr(Math.round((printedArea / hit.value) * 100) / 100));
        }
        setAiPerimeter("");
        // Bent maradunk a modban: ha felrekoppintottal, a jora koppintva felulirod;
        // a "Kesz" zarja le (lasd a kota-sav).
      }
      return;
    }

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

      // Diagnosztika: a nyers szoveg a kartyan (a "Kiolvasott szoveg" lenyilo).
      setAiRawText(textItems.map((item) => item.text).join(" | "));

      const response = await fetch(`/api/documents/${doc.id}/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pageNumber, selection: rect, calculationType: "room_info", textItems, anchor: { x: rect.x + rect.w / 2, y: rect.y + rect.h / 2 } })
      }).catch(() => undefined);

      const payload = await response?.json().catch(() => null);
      if (!response?.ok || !payload?.data?.result) {
        showMessage("Az elemzés nem sikerült. Próbáld újra.", "error");
        return;
      }

      const result = payload.data.result as PlanAnalysisResult;
      setAiResult(result);
      setAiFields(fieldsFromResult(result));
      await loadDimensionCandidates({ x: rect.x + rect.w / 2, y: rect.y + rect.h / 2 }, result.room.printedFloorAreaM2);
    } finally {
      setAiAnalyzing(false);
    }
  }

  // Kodra/nevre kereses: megkeressuk az OSSZES illeszkedo helyiseget a lapon.
  // Ha tobb van (a kod lakasonkent ismetlodik), valaszto-listat mutatunk.
  async function runCodeSearch() {
    const query = aiCodeQuery.trim();
    if (!query) return;
    const pdf = pdfDocRef.current;
    if (!pdf) return;

    setAiAnalyzing(true);
    setMessage("");
    setAiResult(null);
    setAiRawText("");
    setAiMatches([]);
    try {
      const page = await pdf.getPage(pageNumber);
      const allItems = await extractAllTextItems(page);
      const matches = findRoomMatches(allItems, query);

      if (matches.length === 0) {
        showMessage(`Nem találom: „${query}". Próbáld pontosabban (pl. „B3.06 fürdő").`, "error");
        setAiSelection(null);
        return;
      }
      if (matches.length === 1) {
        await analyzeMatch(matches[0], allItems);
        return;
      }
      // Tobb talalat -> a felhasznalo valasszon (a kod lakasonkent ismetlodik).
      setAiMatches(matches);
      setAiSelection(null);
    } finally {
      setAiAnalyzing(false);
    }
  }

  // A helyiseg korul felkinaljuk a szelesseg x hossz parokat (a kiirt terulettel
  // egyezo szorzatu kozeli kotak), es a meret-mezoket kiuritjuk (uj felismeresnel).
  async function loadDimensionCandidates(center: PlanMeasurementPoint, targetAreaM2: number | null, allItems?: PlanTextItem[]) {
    setAiWidth("");
    setAiDepth("");
    let items = allItems;
    if (!items) {
      const pdf = pdfDocRef.current;
      if (!pdf) { setAiDimPairs([]); return; }
      try {
        const page = await pdf.getPage(pageNumber);
        items = await extractAllTextItems(page);
      } catch {
        setAiDimPairs([]);
        return;
      }
    }
    setAiDimPairs(suggestDimensionPairs(items, center, targetAreaM2));
  }

  const numToStr = (v: number) => new Intl.NumberFormat("hu-HU", { maximumFractionDigits: 2 }).format(v);

  // Kota-valaszto mod inditasa: betoltjuk a lap OSSZES text-elemet (hogy a
  // koppintashoz legkozelebbi kotat megtalaljuk), es urites.
  async function startKotaPick() {
    const pdf = pdfDocRef.current;
    if (pdf) {
      try {
        const page = await pdf.getPage(pageNumber);
        aiAllItemsRef.current = await extractAllTextItems(page);
      } catch {
        aiAllItemsRef.current = [];
      }
    }
    setAiKotaMode(true);
  }

  function pickPair(pair: DimensionPair) {
    setAiWidth(numToStr(pair.w));
    setAiDepth(numToStr(pair.d));
  }

  // Egy kivalasztott (vagy egyertelmu) helyiseg felismerese + ragorgetes.
  async function analyzeMatch(match: RoomMatch, allItems?: PlanTextItem[]) {
    setAiMatches([]);
    setAiAnalyzing(true);
    setMessage("");
    setAiResult(null);
    try {
      const xs = match.items.map((it) => it.x);
      const ys = match.items.map((it) => it.y);
      const pad = 0.012;
      const rect: PlanSelectionRect = {
        x: Math.min(...xs) - pad,
        y: Math.min(...ys) - pad,
        w: Math.max(...xs) - Math.min(...xs) + 2 * pad,
        h: Math.max(...ys) - Math.min(...ys) + 2 * pad
      };
      setAiSelection(rect);
      setAiCorners([]);
      setAiRawText(match.items.map((it) => it.text).join(" | "));

      const response = await fetch(`/api/documents/${doc.id}/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pageNumber, selection: rect, calculationType: "room_info", textItems: match.items, anchor: match.center })
      }).catch(() => undefined);

      const payload = await response?.json().catch(() => null);
      if (!response?.ok || !payload?.data?.result) {
        showMessage("Az elemzés nem sikerült. Próbáld újra.", "error");
        return;
      }

      const result = payload.data.result as PlanAnalysisResult;
      setAiResult(result);
      setAiFields(fieldsFromResult(result));
      await loadDimensionCandidates(match.center, result.room.printedFloorAreaM2, allItems);

      // A megtalalt helyiseg kozeppontba hozasa (a nezet-transzformacioval).
      centerViewOn(match.center.x, match.center.y);
    } finally {
      setAiAnalyzing(false);
    }
  }

  // Mentett elemzes megnyitasa szerkesztesre: betoltjuk a kartyaba, es ragorgetunk.
  // A "Mentes" utana a dedup (kod+nev) miatt a meglevot frissiti (felulirja).
  function openAnalysisForEdit(analysis: PlanAnalysis) {
    resetDrawing();
    setMode("ai-select");
    setAiResult(analysis.result);
    setAiFields(fieldsFromResult(analysis.result));
    setAiSelection(analysis.selection);
    // A korabban megadott meretek visszatoltese (ha voltak).
    setAiWidth(analysis.result.room.widthM ? numToStr(analysis.result.room.widthM) : "");
    setAiDepth(analysis.result.room.depthM ? numToStr(analysis.result.room.depthM) : "");
    // Ha a kerulet kozvetlenul volt megadva (nincs szel/hossz), azt toltjuk vissza.
    setAiPerimeter(analysis.result.room.perimeterM && !analysis.result.room.widthM ? numToStr(analysis.result.room.perimeterM) : "");

    centerViewOn(analysis.selection.x + analysis.selection.w / 2, analysis.selection.y + analysis.selection.h / 2);
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

    // Meretek -> kerulet (a fal/labazat/szalag/alapozas szamitas kulcsa). A
    // kozvetlenul megadott kerulet felulirja a teglalapbol (szel x hossz) szamoltat.
    const width = parseHuNumber(aiWidth);
    const depth = parseHuNumber(aiDepth);
    const manualPerimeter = parseHuNumber(aiPerimeter);
    const rectPerimeter = width !== null && depth !== null ? Math.round((width + depth) * 2 * 100) / 100 : null;
    const perimeter = manualPerimeter ?? rectPerimeter;
    if (perimeter !== null) fieldSources.perimeterM = "USER_ENTERED";

    const result: PlanAnalysisResult = {
      room: { code, name, printedFloorAreaM2: area, ceilingHeightM: height, floorFinish: finish, widthM: width, depthM: depth, perimeterM: perimeter },
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
    if (payload?.data) {
      const saved = payload.data as PlanAnalysis;
      const savedCode = saved.result.room.code?.trim();
      const savedName = saved.result.room.name?.trim();
      // A kliens-listat is dedupaljuk (kod+nev), ahogy a szerver: kulonben a
      // regi ugyanolyan bejegyzes optikailag ottmaradna az uj mellett.
      setSavedAnalyses((current) => {
        const withoutDupes =
          savedCode && savedName
            ? current.filter((a) => !(a.result.room.code?.trim() === savedCode && a.result.room.name?.trim() === savedName))
            : current;
        return [saved, ...withoutDupes];
      });
    }
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
    if (!selectedPoint || !baseW) return;
    const deltaX = (dx * NUDGE_PIXELS) / baseW;
    const deltaY = (dy * NUDGE_PIXELS) / baseW;

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

  // Felmeresi Excel letoltese a mentett elemzesekbol (a szerver gyartja).
  function exportAnalysesExcel() {
    const link = document.createElement("a");
    link.href = `/api/documents/${doc.id}/analyses/export/xlsx`;
    link.rel = "noopener";
    document.body.appendChild(link);
    link.click();
    link.remove();
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

  // Meret-szamitas a kartyahoz: kerulet + terulet-ellenorzes a kiirt teruletel.
  const dimW = parseHuNumber(aiWidth);
  const dimD = parseHuNumber(aiDepth);
  const dimPerimeter = dimW !== null && dimD !== null ? Math.round((dimW + dimD) * 2 * 100) / 100 : null;
  const dimArea = dimW !== null && dimD !== null ? Math.round(dimW * dimD * 100) / 100 : null;
  const dimPrintedArea = parseHuNumber(aiFields.area);
  // Kozvetlen kerulet (felulirja a teglalapbol szamoltat) + a tenylegesen hasznalt.
  const dimManualPerimeter = parseHuNumber(aiPerimeter);
  const effectivePerimeter = dimManualPerimeter ?? dimPerimeter;
  // A szelesseg-koppintas elonezete a kota-savhoz: a bekoppintott szelessegbol
  // + a kiirt teruletbol a melyseg es a kerulet.
  const pickDepth = aiWidthMark && dimPrintedArea !== null && aiWidthMark.value > 0 ? Math.round((dimPrintedArea / aiWidthMark.value) * 100) / 100 : null;
  const pickPerimeter = aiWidthMark && pickDepth !== null ? Math.round((aiWidthMark.value + pickDepth) * 2 * 100) / 100 : null;
  // Eltero, ha a beirt meretbol szamolt terulet 5%-nal jobban ter a kiirttol
  // (csak a teglalap-esetben ertelmes; kozvetlen kerueletnel nincs terulet-check).
  const dimAreaMismatch =
    dimManualPerimeter === null && dimArea !== null && dimPrintedArea !== null && Math.abs(dimArea - dimPrintedArea) > Math.max(0.2, dimPrintedArea * 0.05);

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
          <button type="button" className="button ghost" disabled={view.scale <= MIN_SCALE} onClick={() => zoomBy(1 / ZOOM_BUTTON_FACTOR)}>
            −
          </button>
          <span>{Math.round(view.scale * 100)}%</span>
          <button type="button" className="button ghost" disabled={view.scale >= MAX_SCALE} onClick={() => zoomBy(ZOOM_BUTTON_FACTOR)}>
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
        <>
          <div className="ai-code-search">
            <input
              type="text"
              value={aiCodeQuery}
              onChange={(event) => {
                const value = event.target.value;
                setAiCodeQuery(value);
                // Ures kereses -> a talalati lista es az aktiv jeloles eltunik.
                if (!value.trim()) { setAiMatches([]); setAiSelection(null); }
              }}
              onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); runCodeSearch(); } }}
              placeholder="Helyiség kódja (pl. B3.12)"
              suppressHydrationWarning
            />
            <button type="button" className="button primary" disabled={aiAnalyzing || !aiCodeQuery.trim()} onClick={runCodeSearch}>
              Keresés
            </button>
          </div>
          {aiMatches.length > 0 ? (
            <div className="ai-match-list">
              <p className="ai-match-title">Több helyiség illik – válaszd ki:</p>
              {aiMatches.map((match, index) => (
                <button key={`${match.code}-${index}`} type="button" className="ai-match-item" onClick={() => analyzeMatch(match)}>
                  {match.label}
                </button>
              ))}
              <button type="button" className="ai-match-cancel" onClick={() => { setAiMatches([]); setAiCodeQuery(""); setAiSelection(null); }}>
                Mégse
              </button>
            </div>
          ) : null}
          <p className="measure-hint">
            <span className="measure-hint-full">
              {aiAnalyzing
                ? "Elemzés folyamatban…"
                : "Írd be a helyiség kódját fent, VAGY koppints a terület két átlós sarkára (bal-felső és jobb-alsó)."}
            </span>
            <span className="measure-hint-compact">{aiAnalyzing ? "Elemzés…" : `${aiCorners.length}/2 sarok`}</span>
          </p>
        </>
      ) : null}

      {mode === "ai-select" && aiResult ? (
        <div className="ai-result-card">
          <button type="button" className="ai-result-head" onClick={() => setAiCardExpanded((v) => !v)}>
            <strong>Felismert helyiség</strong>
            <span className={aiResult.confidence < 0.55 ? "ai-confidence ai-confidence-low" : "ai-confidence"}>
              {Math.round(aiResult.confidence * 100)}%
            </span>
            <span className="ai-card-toggle">{aiCardExpanded ? "▾ Bezár" : "▸ Szerkeszt"}</span>
          </button>

          {/* Tomor osszefoglalo - mindig lathato, a terv nem szorul ossze. */}
          <p className="ai-result-summary">
            {[
              aiFields.code,
              aiFields.name,
              aiFields.area ? `${aiFields.area} m²` : null,
              aiFields.height ? `bm ${aiFields.height} m` : null,
              aiFields.finish
            ]
              .filter(Boolean)
              .join(" · ") || "nincs kiolvasott adat"}
          </p>

          {aiResult.confidence < 0.55 ? (
            <p className="ai-result-warning">⚠ Bizonytalan – ellenőrizd mentés előtt.</p>
          ) : null}

          {/* Kota-valasztas kozben a nagy torzs helyett csak ez a vekony sav
              latszik, hogy a TERV kapja a helyet (a kotakra koppintasz rajta). */}
          {aiKotaMode ? (
            <div className="ai-kota-bar">
              <span className="ai-dims-hint">Koppints a <b>szélesség</b> kótájára az éles terven (pl. 3,95). Félrekoppintottál? Koppints a jóra – felülírja. A mélységet a területből számolom.</span>
              <div className="ai-kota-bar-foot">
                {aiWidthMark ? (
                  <span className="ai-kota-bar-sum">
                    Szélesség <b>{numToStr(aiWidthMark.value)} m</b>
                    {pickDepth !== null ? <> · mélység <b>{numToStr(pickDepth)} m</b></> : null}
                    {pickPerimeter !== null ? <> · kerület <b>{formatValue(pickPerimeter, "length")}</b></> : null}
                  </span>
                ) : (
                  <span className="ai-dims-note">Koppints a szélesség számára a terven.</span>
                )}
                <div className="ai-dims-kota-actions">
                  <button type="button" className="button ghost" disabled={!aiWidthMark} onClick={() => { setAiWidth(""); setAiDepth(""); setAiWidthMark(null); }}>
                    Töröl
                  </button>
                  <button type="button" className="button primary" onClick={() => setAiKotaMode(false)}>
                    Kész
                  </button>
                </div>
              </div>
            </div>
          ) : null}

          {aiCardExpanded && !aiKotaMode ? (
            <>
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

              <div className="ai-dims">
                <div className="ai-dims-title">Méretek <span className="ai-dims-sub">(kerülethez – fal, lábazat, szalag, alapozás)</span></div>
                {aiDimPairs.length ? (
                  <div className="ai-dims-candidates">
                    <span className="ai-dims-hint">Felkínált méretek (a területből – koppints):</span>
                    {aiDimPairs.map((p) => (
                      <button key={`${p.w}x${p.d}`} type="button" className="ai-dims-chip" onClick={() => pickPair(p)}>
                        {numToStr(p.w)} × {numToStr(p.d)} m
                      </button>
                    ))}
                  </div>
                ) : null}
                <div className="ai-dims-row">
                  <label>
                    Szélesség (m)
                    <input type="text" inputMode="decimal" value={aiWidth} onChange={(e) => setAiWidth(e.target.value)} placeholder="pl. 2,45" suppressHydrationWarning />
                  </label>
                  <span className="ai-dims-x">×</span>
                  <label>
                    Hossz (m)
                    <input type="text" inputMode="decimal" value={aiDepth} onChange={(e) => setAiDepth(e.target.value)} placeholder="pl. 1,10" suppressHydrationWarning />
                  </label>
                </div>
                <div className="ai-dims-perimeter">
                  <label>
                    vagy Kerület közvetlenül (m)
                    <input type="text" inputMode="decimal" value={aiPerimeter} onChange={(e) => setAiPerimeter(e.target.value)} placeholder="nyitott tér / L-alak: a falak összege" suppressHydrationWarning />
                  </label>
                  <span className="ai-dims-note">Ha kitöltöd, ez számít (a téglalap helyett).</span>
                </div>

                <div className="ai-dims-kota">
                  <button type="button" className="button ghost ai-dims-kota-btn" onClick={startKotaPick}>
                    ⊕ Koppints a szélességre (a mélységet a területből számolom)
                  </button>
                </div>

                {effectivePerimeter !== null ? (
                  <p className={dimAreaMismatch ? "ai-dims-calc ai-dims-calc-warn" : "ai-dims-calc"}>
                    Kerület: <b>{formatValue(effectivePerimeter, "length")}</b>
                    {dimManualPerimeter !== null ? (
                      <> (kézzel)</>
                    ) : dimArea !== null ? (
                      <> · terület a méretből: <b>{formatValue(dimArea, "area")}</b></>
                    ) : null}
                    {dimAreaMismatch ? <> ⚠ eltér a kiírttól ({dimPrintedArea !== null ? formatValue(dimPrintedArea, "area") : "?"}) – ellenőrizd</> : null}
                  </p>
                ) : null}
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
              ) : null}
            </>
          ) : null}

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

      <div className="measure-stage-wrap" ref={containerRef}>
        {isPdf && pdfStatus === "loading" ? <p className="measure-hint">Terv betöltése...</p> : null}
        {isPdf && pdfStatus === "error" ? <p className="measure-hint">A terv nem tölthető be a mérőeszközben.</p> : null}

        {stageSize.w > 0 && stageSize.h > 0 ? (
          <PlanMeasurementCanvas
            stageW={stageSize.w}
            stageH={stageSize.h}
            view={view}
            baseImage={baseImg?.canvas ?? null}
            baseW={baseW}
            baseH={baseH}
            detail={detailImg}
            onViewChange={handleViewChange}
            onGestureEnd={scheduleDetail}
            onPlacePoint={handleStagePointer}
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
            aiSavedRects={
              mode === "ai-select" && !aiKotaMode && !aiResult
                ? savedAnalyses
                    .filter((analysis) => !isPdf || analysis.pageNumber === pageNumber)
                    .map((analysis) => ({
                      id: analysis.id,
                      x: analysis.selection.x,
                      y: analysis.selection.y,
                      w: analysis.selection.w,
                      h: analysis.selection.h,
                      color: colorForMeasurementId(analysis.id),
                      label: analysis.result.room.code || analysis.result.room.name || "?"
                    }))
                : []
            }
            aiActiveRect={mode === "ai-select" ? aiSelection : null}
            kotaMarks={aiWidthMark ? [aiWidthMark] : []}
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
          <div className="ai-list-head">
            <button type="button" className="measure-list-toggle" onClick={() => setAiListOpen((current) => !current)}>
              <h3>AI helyiség-elemzések ({savedAnalyses.length})</h3>
              <span aria-hidden="true">{aiListOpen ? "▾" : "▸"}</span>
            </button>
            <button type="button" className="button primary ai-export-btn" onClick={exportAnalysesExcel}>
              Excel export
            </button>
          </div>
          {aiListOpen
            ? savedAnalyses
            .filter((analysis) => !isPdf || analysis.pageNumber === pageNumber)
            .map((analysis) => {
              const info =
                [analysis.result.room.code, analysis.result.room.name].filter(Boolean).join(" · ") || "Helyiség";
              const detail =
                [
                  analysis.result.room.printedFloorAreaM2 !== null ? `${formatValue(analysis.result.room.printedFloorAreaM2, "area")}` : null,
                  analysis.result.room.ceilingHeightM !== null ? `bm ${formatValue(analysis.result.room.ceilingHeightM, "length")}` : null,
                  analysis.result.room.floorFinish
                ]
                  .filter(Boolean)
                  .join(" · ") || "nincs kiolvasott adat";
              return (
                <div className="measure-list-item" key={analysis.id}>
                  <div>
                    <strong>{info}</strong>
                    <small>{detail}</small>
                  </div>
                  {canMeasure ? (
                    <button type="button" className="measure-undo" onClick={() => openAnalysisForEdit(analysis)}>
                      Szerkesztés
                    </button>
                  ) : null}
                </div>
              );
            })
            : null}
        </div>
      ) : null}
    </div>
  );
}
