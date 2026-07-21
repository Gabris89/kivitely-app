"use client";

// Deliberately NOT using next/dynamic per Konva primitive here: react-konva
// renders through a custom React reconciler (not plain DOM elements), and
// lazy-loading Stage/Layer/Line/Circle as separate next/dynamic components
// breaks that reconciler's expectations about its children's types. Instead,
// this whole component is loaded as a single next/dynamic(..., { ssr:false })
// unit from PlanMeasurementTool, and everything inside it uses plain static
// imports so react-konva only ever sees its own real component references.
import { Circle, Group, Label, Layer, Line, Stage, Tag, Text } from "react-konva";
import type { KonvaEventObject } from "konva/lib/Node";
import type { PlanMeasurement, PlanMeasurementPoint, PlanMeasurementType } from "@/types";
import { colorForMeasurementId } from "@/lib/measurementColors";

export type StagePointerEvent = KonvaEventObject<MouseEvent | TouchEvent>;
export type SelectedPoint = { kind: "calibration" | "draw"; index: number } | null;

type Props = {
  stageWidth: number;
  stageHeight: number;
  onStageClick: (event: StagePointerEvent) => void;
  savedMeasurements: PlanMeasurement[];
  calibrationPoints: PlanMeasurementPoint[];
  drawPoints: PlanMeasurementPoint[];
  measurementType: PlanMeasurementType;
  metersPerUnit: number | null;
  selectedPoint: SelectedPoint;
  onDragCalibrationPoint: (index: number, point: PlanMeasurementPoint) => void;
  onDragDrawPoint: (index: number, point: PlanMeasurementPoint) => void;
  onSelectCalibrationPoint: (index: number) => void;
  onSelectDrawPoint: (index: number) => void;
};

// Two different sizes on purpose: the hit/drag zone stays large so a
// fingertip can reliably grab it, but the visible mark is a small crosshair
// so the exact placed coordinate - not a big blob - is what you actually see.
const HIT_RADIUS = 16;
const CROSSHAIR_ARM = 6;

function flattenPoints(points: PlanMeasurementPoint[], stageWidth: number) {
  return points.flatMap((point) => [point.x * stageWidth, point.y * stageWidth]);
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
  stageWidth: number;
};

function PointHandle({ cx, cy, color, isSelected, onDrag, onSelect, stageWidth }: PointHandleProps) {
  const markColor = isSelected ? "#ff3b3b" : color;
  return (
    <>
      {/* White halo behind the crosshair/dot so it reads clearly over both
          light plan backgrounds and dark line-work. */}
      <Line points={[cx - CROSSHAIR_ARM, cy, cx + CROSSHAIR_ARM, cy]} stroke="#ffffff" strokeWidth={4} opacity={0.85} listening={false} />
      <Line points={[cx, cy - CROSSHAIR_ARM, cx, cy + CROSSHAIR_ARM]} stroke="#ffffff" strokeWidth={4} opacity={0.85} listening={false} />
      <Line points={[cx - CROSSHAIR_ARM, cy, cx + CROSSHAIR_ARM, cy]} stroke={markColor} strokeWidth={1.5} listening={false} />
      <Line points={[cx, cy - CROSSHAIR_ARM, cx, cy + CROSSHAIR_ARM]} stroke={markColor} strokeWidth={1.5} listening={false} />
      <Circle x={cx} y={cy} radius={3.5} fill={markColor} stroke="#ffffff" strokeWidth={1} listening={false} />
      {isSelected ? <Circle x={cx} y={cy} radius={CROSSHAIR_ARM + 5} stroke="#ff3b3b" strokeWidth={2} listening={false} /> : null}
      <Circle
        x={cx}
        y={cy}
        radius={HIT_RADIUS}
        fill="rgba(0,0,0,0.001)"
        draggable
        onDragMove={(event) => onDrag({ x: event.target.x() / stageWidth, y: event.target.y() / stageWidth })}
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
  stageWidth,
  stageHeight,
  onStageClick,
  savedMeasurements,
  calibrationPoints,
  drawPoints,
  measurementType,
  metersPerUnit,
  selectedPoint,
  onDragCalibrationPoint,
  onDragDrawPoint,
  onSelectCalibrationPoint,
  onSelectDrawPoint
}: Props) {
  // Dragging or tapping an existing point also bubbles a click to the
  // Stage - only treat it as "place a new point" when the click actually
  // hit the empty background, not one of the point handles. Also ignore
  // anything but the primary (left) button: Konva's click fires for any
  // button release-without-drag, so without this check, middle-click-drag
  // panning (bound outside Konva, on the wrapping div) would also register
  // as "place a point" here, since preventDefault on that outer handler
  // doesn't stop Konva's own native listeners on the canvas from also firing.
  function handleStageClick(event: KonvaEventObject<MouseEvent>) {
    if (event.evt.button !== 0) return;
    if (event.target !== event.target.getStage()) return;
    onStageClick(event);
  }

  const segments: { mid: PlanMeasurementPoint; length: number }[] = [];
  if (metersPerUnit && drawPoints.length >= 2) {
    const closeLoop = measurementType === "area" && drawPoints.length > 2;
    const segmentCount = closeLoop ? drawPoints.length : drawPoints.length - 1;
    for (let i = 0; i < segmentCount; i += 1) {
      const a = drawPoints[i];
      const b = drawPoints[(i + 1) % drawPoints.length];
      segments.push({
        mid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
        length: segmentDistance(a, b) * metersPerUnit
      });
    }
  }

  return (
    <Stage width={stageWidth} height={stageHeight} className="measure-konva-stage" onClick={handleStageClick}>
      <Layer>
        {savedMeasurements.map((measurement) => {
          const flat = flattenPoints(measurement.points, stageWidth);
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
                listening={false}
              />
              <Label x={mid.x * stageWidth} y={mid.y * stageWidth} offsetX={26} offsetY={9} listening={false}>
                <Tag fill={color} cornerRadius={4} />
                <Text text={formatMeasurementValue(measurement.calculatedValue, measurement.measurementType)} fontSize={12} fontStyle="bold" fill="#06231a" padding={4} />
              </Label>
            </Group>
          );
        })}

        {calibrationPoints.length === 2 ? (
          <Line points={flattenPoints(calibrationPoints, stageWidth)} stroke="#ffd166" strokeWidth={2} dash={[6, 4]} />
        ) : null}
        {calibrationPoints.map((point, index) => (
          <PointHandle
            key={index}
            cx={point.x * stageWidth}
            cy={point.y * stageWidth}
            color="#ffd166"
            isSelected={selectedPoint?.kind === "calibration" && selectedPoint.index === index}
            stageWidth={stageWidth}
            onDrag={(next) => onDragCalibrationPoint(index, next)}
            onSelect={() => onSelectCalibrationPoint(index)}
          />
        ))}

        {drawPoints.length > 0 ? (
          <Line
            points={flattenPoints(drawPoints, stageWidth)}
            closed={measurementType === "area" && drawPoints.length > 2}
            stroke="#9af7d5"
            fill="rgba(154,247,213,0.2)"
            strokeWidth={2}
          />
        ) : null}

        {segments.map((segment, index) => (
          <Label key={index} x={segment.mid.x * stageWidth} y={segment.mid.y * stageWidth} offsetX={22} offsetY={9} listening={false}>
            <Tag fill="#9af7d5" cornerRadius={4} />
            <Text text={formatMeters(segment.length)} fontSize={12} fontStyle="bold" fill="#06231a" padding={4} />
          </Label>
        ))}

        {drawPoints.map((point, index) => (
          <PointHandle
            key={index}
            cx={point.x * stageWidth}
            cy={point.y * stageWidth}
            color="#9af7d5"
            isSelected={selectedPoint?.kind === "draw" && selectedPoint.index === index}
            stageWidth={stageWidth}
            onDrag={(next) => onDragDrawPoint(index, next)}
            onSelect={() => onSelectDrawPoint(index)}
          />
        ))}
      </Layer>
    </Stage>
  );
}
