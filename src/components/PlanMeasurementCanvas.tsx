"use client";

// Deliberately NOT using next/dynamic per Konva primitive here: react-konva
// renders through a custom React reconciler (not plain DOM elements), and
// lazy-loading Stage/Layer/Line/Circle as separate next/dynamic components
// breaks that reconciler's expectations about its children's types. Instead,
// this whole component is loaded as a single next/dynamic(..., { ssr:false })
// unit from PlanMeasurementTool, and everything inside it uses plain static
// imports so react-konva only ever sees its own real component references.
import { useCallback, useRef, useState } from "react";
import { Circle, Group, Image as KonvaImage, Label, Layer, Line, Rect, Stage, Tag, Text } from "react-konva";
import type Konva from "konva";
import type { KonvaEventObject } from "konva/lib/Node";
import type { PlanMeasurement, PlanMeasurementPoint, PlanMeasurementType } from "@/types";
import { colorForMeasurementId } from "@/lib/measurementColors";

export type StagePointerEvent = KonvaEventObject<MouseEvent | TouchEvent>;
export type SelectedPoint = { kind: "calibration" | "draw"; index: number } | null;

/** A nezet egyetlen transzformacioja: nagyitas + eltolas (a Stage birtokolja). */
export type ViewTransform = { scale: number; x: number; y: number };

/** AI-elemzes teglalapja a canvason (normalizalt koordinatak, a baseW-hez). */
export type AiRect = { id: string; x: number; y: number; w: number; h: number; color: string; label: string };

/** Elesen rendereltt "detail" kep-darab a lathato reszrol (base-egyseg koordinatak). */
export type DetailImage = { canvas: HTMLCanvasElement; x: number; y: number; w: number; h: number };

export const MIN_SCALE = 0.2;
export const MAX_SCALE = 40;

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

type Props = {
  /** A viewport (kontener) merete - a Stage ezt tolti ki. */
  stageW: number;
  stageH: number;
  /** A nezet aktualis transzformacioja. */
  view: ViewTransform;
  /** A teljes-lapos, alacsony felbontasu attekinto kep + merete (base-egyseg). */
  baseImage: HTMLCanvasElement | null;
  baseW: number;
  baseH: number;
  /** A lathato reszrol keszult eles kep-darab (megallaskor). */
  detail: DetailImage | null;
  /** A nezet valtozasa (wheel/pinch/pan) - a Tool tarolja. */
  onViewChange: (view: ViewTransform) => void;
  /** Gesztus vege - a Tool ekkor utemez eles ujrarajzolast. */
  onGestureEnd: () => void;
  /** Koppintas ures hatterre (uj pont) - mar NORMALIZALT koordinataval. */
  onPlacePoint: (point: PlanMeasurementPoint) => void;

  savedMeasurements: PlanMeasurement[];
  calibrationPoints: PlanMeasurementPoint[];
  drawPoints: PlanMeasurementPoint[];
  measurementType: PlanMeasurementType;
  metersPerUnit: number | null;
  selectedPoint: SelectedPoint;
  aiSavedRects?: AiRect[];
  aiActiveRect?: { x: number; y: number; w: number; h: number } | null;
  /** A "koppints a kotakra" modban kivalasztott kotak (ertek + pozicio). */
  kotaMarks?: { x: number; y: number; value: number }[];
  onDragCalibrationPoint: (index: number, point: PlanMeasurementPoint) => void;
  onDragDrawPoint: (index: number, point: PlanMeasurementPoint) => void;
  onSelectCalibrationPoint: (index: number) => void;
  onSelectDrawPoint: (index: number) => void;
};

const HIT_RADIUS = 16;
const CROSSHAIR_ARM = 6;

function flattenPoints(points: PlanMeasurementPoint[], ref: number) {
  return points.flatMap((point) => [point.x * ref, point.y * ref]);
}

function segmentDistance(a: PlanMeasurementPoint, b: PlanMeasurementPoint) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function formatMeters(value: number) {
  return `${new Intl.NumberFormat("hu-HU", { maximumFractionDigits: 2 }).format(value)} m`;
}

function formatMeasurementValue(value: number, type: PlanMeasurementType) {
  const formatted = new Intl.NumberFormat("hu-HU", { maximumFractionDigits: 2 }).format(value);
  return type === "area" ? `${formatted} m²` : `${formatted} m`;
}

function centroid(points: PlanMeasurementPoint[]) {
  const x = points.reduce((sum, point) => sum + point.x, 0) / points.length;
  const y = points.reduce((sum, point) => sum + point.y, 0) / points.length;
  return { x, y };
}

type PointHandleProps = {
  cx: number;
  cy: number;
  color: string;
  isSelected: boolean;
  onDrag: (point: PlanMeasurementPoint) => void;
  onSelect: (event: KonvaEventObject<MouseEvent | TouchEvent>) => void;
  refW: number;
  /** 1/nagyitas: a jelolot allando kepernyo-meretuve teszi (ne nojon zoomkor). */
  k: number;
};

function PointHandle({ cx, cy, color, isSelected, onDrag, onSelect, refW, k }: PointHandleProps) {
  const markColor = isSelected ? "#ff3b3b" : color;
  const arm = CROSSHAIR_ARM * k;
  const dot = 3.5 * k;
  const selR = (CROSSHAIR_ARM + 5) * k;
  const hit = HIT_RADIUS * k;
  return (
    <>
      <Line points={[cx - arm, cy, cx + arm, cy]} stroke="#ffffff" strokeWidth={4} strokeScaleEnabled={false} opacity={0.85} listening={false} />
      <Line points={[cx, cy - arm, cx, cy + arm]} stroke="#ffffff" strokeWidth={4} strokeScaleEnabled={false} opacity={0.85} listening={false} />
      <Line points={[cx - arm, cy, cx + arm, cy]} stroke={markColor} strokeWidth={1.5} strokeScaleEnabled={false} listening={false} />
      <Line points={[cx, cy - arm, cx, cy + arm]} stroke={markColor} strokeWidth={1.5} strokeScaleEnabled={false} listening={false} />
      <Circle x={cx} y={cy} radius={dot} fill={markColor} stroke="#ffffff" strokeWidth={1} strokeScaleEnabled={false} listening={false} />
      {isSelected ? <Circle x={cx} y={cy} radius={selR} stroke="#ff3b3b" strokeWidth={2} strokeScaleEnabled={false} listening={false} /> : null}
      <Circle
        x={cx}
        y={cy}
        radius={hit}
        fill="rgba(0,0,0,0.001)"
        draggable
        onDragMove={(event) => onDrag({ x: event.target.x() / refW, y: event.target.y() / refW })}
        onClick={(event) => {
          if ("button" in event.evt && event.evt.button !== 0) return;
          event.cancelBubble = true;
          onSelect(event);
        }}
        onTap={(event) => {
          event.cancelBubble = true;
          onSelect(event);
        }}
      />
    </>
  );
}

export default function PlanMeasurementCanvas({
  stageW,
  stageH,
  view,
  baseImage,
  baseW,
  baseH,
  detail,
  onViewChange,
  onGestureEnd,
  onPlacePoint,
  savedMeasurements,
  calibrationPoints,
  drawPoints,
  measurementType,
  metersPerUnit,
  selectedPoint,
  aiSavedRects = [],
  aiActiveRect = null,
  kotaMarks = [],
  onDragCalibrationPoint,
  onDragDrawPoint,
  onSelectCalibrationPoint,
  onSelectDrawPoint
}: Props) {
  const stageRef = useRef<Konva.Stage | null>(null);
  const pinchRef = useRef<{ dist: number; center: { x: number; y: number } } | null>(null);
  const [pinching, setPinching] = useState(false);

  const containerPoint = useCallback((clientX: number, clientY: number) => {
    const rect = stageRef.current?.container().getBoundingClientRect();
    return { x: clientX - (rect?.left ?? 0), y: clientY - (rect?.top ?? 0) };
  }, []);

  // Zoom ugy, hogy a (px,py) mutato-pont alatti vilag-pont fixen marad.
  const zoomAt = useCallback(
    (px: number, py: number, nextScaleRaw: number) => {
      const newScale = clamp(nextScaleRaw, MIN_SCALE, MAX_SCALE);
      const wx = (px - view.x) / view.scale;
      const wy = (py - view.y) / view.scale;
      onViewChange({ scale: newScale, x: px - wx * newScale, y: py - wy * newScale });
    },
    [view, onViewChange]
  );

  const handleWheel = useCallback(
    (e: KonvaEventObject<WheelEvent>) => {
      e.evt.preventDefault();
      const p = containerPoint(e.evt.clientX, e.evt.clientY);
      const factor = 1.1;
      zoomAt(p.x, p.y, e.evt.deltaY > 0 ? view.scale / factor : view.scale * factor);
      onGestureEnd();
    },
    [containerPoint, zoomAt, view.scale, onGestureEnd]
  );

  const handleTouchMove = useCallback(
    (e: KonvaEventObject<TouchEvent>) => {
      const touches = e.evt.touches;
      if (touches.length !== 2) return;
      e.evt.preventDefault();
      const p1 = containerPoint(touches[0].clientX, touches[0].clientY);
      const p2 = containerPoint(touches[1].clientX, touches[1].clientY);
      const dist = Math.hypot(p1.x - p2.x, p1.y - p2.y);
      const center = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
      const last = pinchRef.current;
      if (!last) {
        pinchRef.current = { dist, center };
        setPinching(true);
        return;
      }
      const dx = center.x - last.center.x;
      const dy = center.y - last.center.y;
      const newScale = clamp(view.scale * (dist / last.dist), MIN_SCALE, MAX_SCALE);
      const wx = (center.x - view.x) / view.scale;
      const wy = (center.y - view.y) / view.scale;
      onViewChange({ scale: newScale, x: center.x - wx * newScale + dx, y: center.y - wy * newScale + dy });
      pinchRef.current = { dist, center };
    },
    [containerPoint, view, onViewChange]
  );

  const handleTouchEnd = useCallback(
    (e: KonvaEventObject<TouchEvent>) => {
      if (e.evt.touches.length < 2) {
        pinchRef.current = null;
        setPinching(false);
        onGestureEnd();
      }
    },
    [onGestureEnd]
  );

  const handleDragMove = useCallback(
    (e: KonvaEventObject<DragEvent>) => {
      const stage = stageRef.current;
      if (e.target === stage) onViewChange({ scale: view.scale, x: e.target.x(), y: e.target.y() });
    },
    [view.scale, onViewChange]
  );

  // Koppintas ures hatterre (a PDF-kepek listening=false, a pont-fogantyuk
  // elnyelik a sajat esemenyuket) -> uj pont, mar NORMALIZALT koordinataval.
  const handlePlace = useCallback(
    (event: StagePointerEvent) => {
      const stage = stageRef.current;
      if (!stage || event.target !== stage) return;
      if ("button" in event.evt && event.evt.button !== 0) return;
      const pos = stage.getRelativePointerPosition();
      if (!pos || !baseW) return;
      onPlacePoint({ x: pos.x / baseW, y: pos.y / baseW });
    },
    [baseW, onPlacePoint]
  );

  const segments: { mid: PlanMeasurementPoint; length: number }[] = [];
  if (metersPerUnit && drawPoints.length >= 2) {
    const closeLoop = measurementType === "area" && drawPoints.length > 2;
    const segmentCount = closeLoop ? drawPoints.length : drawPoints.length - 1;
    for (let i = 0; i < segmentCount; i += 1) {
      const a = drawPoints[i];
      const b = drawPoints[(i + 1) % drawPoints.length];
      segments.push({ mid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, length: segmentDistance(a, b) * metersPerUnit });
    }
  }

  // A feliratok/pottyok NAGYITAS ELLEN skalazva: allando kepernyo-meret (kulonben
  // nagy zoomon oriasira nonek es eltakarjak a tervet). k = 1/nagyitas.
  const k = view.scale > 0 ? 1 / view.scale : 1;

  return (
    <Stage
      ref={stageRef}
      width={stageW}
      height={stageH}
      x={view.x}
      y={view.y}
      scaleX={view.scale}
      scaleY={view.scale}
      draggable={!pinching}
      className="measure-konva-stage"
      onWheel={handleWheel}
      onDragMove={handleDragMove}
      onDragEnd={onGestureEnd}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onClick={handlePlace}
      onTap={handlePlace}
    >
      <Layer>
        {baseImage ? <KonvaImage image={baseImage} width={baseW} height={baseH} listening={false} /> : null}
        {detail ? <KonvaImage image={detail.canvas} x={detail.x} y={detail.y} width={detail.w} height={detail.h} listening={false} /> : null}

        {/* AI-elemzesek: mar felmert helyisegek szines teglalapja + kod cimke. */}
        {aiSavedRects.map((rect) => (
          <Group key={rect.id} listening={false}>
            <Rect x={rect.x * baseW} y={rect.y * baseW} width={rect.w * baseW} height={rect.h * baseW} stroke={rect.color} strokeWidth={2} strokeScaleEnabled={false} fill={`${rect.color}22`} cornerRadius={3} />
            <Label x={rect.x * baseW} y={rect.y * baseW} scaleX={k} scaleY={k}>
              <Tag fill={rect.color} cornerRadius={2} />
              <Text text={rect.label} fontSize={11} fontStyle="bold" fill="#06231a" padding={3} />
            </Label>
          </Group>
        ))}
        {aiActiveRect ? (
          <Rect x={aiActiveRect.x * baseW} y={aiActiveRect.y * baseW} width={aiActiveRect.w * baseW} height={aiActiveRect.h * baseW} stroke="#b6ff2e" strokeWidth={2.5} strokeScaleEnabled={false} fill="rgba(182,255,46,0.14)" cornerRadius={3} listening={false} />
        ) : null}

        {/* "Koppints a kotakra": a kivalasztott kotak pottyel + ertek-cimkevel. */}
        {kotaMarks.map((m, i) => (
          <Group key={`kota-${i}`} x={m.x * baseW} y={m.y * baseW} scaleX={k} scaleY={k} listening={false}>
            <Circle radius={5} fill="#ffd166" stroke="#06231a" strokeWidth={1} />
            <Label offsetY={16}>
              <Tag fill="#ffd166" cornerRadius={3} />
              <Text text={formatMeters(m.value)} fontSize={11} fontStyle="bold" fill="#06231a" padding={3} />
            </Label>
          </Group>
        ))}

        {savedMeasurements.map((measurement) => {
          const flat = flattenPoints(measurement.points, baseW);
          const color = colorForMeasurementId(measurement.id);
          const mid = centroid(measurement.points);
          return (
            <Group key={measurement.id}>
              <Line
                points={measurement.measurementType === "area" ? [...flat, flat[0], flat[1]] : flat}
                closed={measurement.measurementType === "area"}
                stroke={color}
                fillEnabled={measurement.measurementType === "area"}
                fill={`${color}2e`}
                strokeWidth={2}
                strokeScaleEnabled={false}
                listening={false}
              />
              <Label x={mid.x * baseW} y={mid.y * baseW} offsetX={26} offsetY={9} scaleX={k} scaleY={k} listening={false}>
                <Tag fill={color} cornerRadius={4} />
                <Text text={formatMeasurementValue(measurement.calculatedValue, measurement.measurementType)} fontSize={12} fontStyle="bold" fill="#06231a" padding={4} />
              </Label>
            </Group>
          );
        })}

        {calibrationPoints.length === 2 ? <Line points={flattenPoints(calibrationPoints, baseW)} stroke="#ffd166" strokeWidth={2} strokeScaleEnabled={false} dash={[6, 4]} /> : null}
        {calibrationPoints.map((point, index) => (
          <PointHandle
            key={index}
            cx={point.x * baseW}
            cy={point.y * baseW}
            color="#ffd166"
            isSelected={selectedPoint?.kind === "calibration" && selectedPoint.index === index}
            refW={baseW}
            k={k}
            onDrag={(next) => onDragCalibrationPoint(index, next)}
            onSelect={() => onSelectCalibrationPoint(index)}
          />
        ))}

        {drawPoints.length > 0 ? (
          <Line points={flattenPoints(drawPoints, baseW)} closed={measurementType === "area" && drawPoints.length > 2} stroke="#9af7d5" fill="rgba(154,247,213,0.2)" strokeWidth={2} strokeScaleEnabled={false} />
        ) : null}

        {segments.map((segment, index) => (
          <Label key={index} x={segment.mid.x * baseW} y={segment.mid.y * baseW} offsetX={22} offsetY={9} scaleX={k} scaleY={k} listening={false}>
            <Tag fill="#9af7d5" cornerRadius={4} />
            <Text text={formatMeters(segment.length)} fontSize={12} fontStyle="bold" fill="#06231a" padding={4} />
          </Label>
        ))}

        {drawPoints.map((point, index) => (
          <PointHandle
            key={index}
            cx={point.x * baseW}
            cy={point.y * baseW}
            color="#9af7d5"
            isSelected={selectedPoint?.kind === "draw" && selectedPoint.index === index}
            refW={baseW}
            k={k}
            onDrag={(next) => onDragDrawPoint(index, next)}
            onSelect={() => onSelectDrawPoint(index)}
          />
        ))}
      </Layer>
    </Stage>
  );
}
