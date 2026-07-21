import { NextRequest, NextResponse } from "next/server";
import { createPlanMeasurementRecord, deletePlanMeasurementRecord, listPlanMeasurements, updatePlanMeasurementRecord } from "@/lib/repository";
import type { PlanMeasurementPoint, PlanMeasurementType } from "@/types";

const allowedMeasurementTypes = ["area", "length"] as const;
type AllowedMeasurementType = (typeof allowedMeasurementTypes)[number];

function isAllowedMeasurementType(value: unknown): value is AllowedMeasurementType {
  return allowedMeasurementTypes.includes(value as AllowedMeasurementType);
}

// Points are normalized by the rendered page/image WIDTH (not width+height
// separately), so a tall portrait page can legitimately produce y > 1.
// Only reject non-finite or clearly-off-page values.
function isValidPoints(value: unknown): value is PlanMeasurementPoint[] {
  return (
    Array.isArray(value) &&
    value.length >= 2 &&
    value.every(
      (point) =>
        point &&
        typeof point.x === "number" &&
        typeof point.y === "number" &&
        Number.isFinite(point.x) &&
        Number.isFinite(point.y) &&
        point.x >= -0.05 &&
        point.x <= 1.05 &&
        point.y >= -0.05 &&
        point.y <= 20
    )
  );
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return NextResponse.json({ data: await listPlanMeasurements(id) });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json().catch(() => null);

  const measurementType: unknown = body?.measurementType;
  const points: unknown = body?.points;
  const pageNumber = Number(body?.pageNumber) || 1;
  const calculatedValue = Number(body?.calculatedValue);
  const label = typeof body?.label === "string" ? body.label.trim() || undefined : undefined;
  const note = typeof body?.note === "string" ? body.note.trim() || undefined : undefined;

  if (!isAllowedMeasurementType(measurementType)) {
    return NextResponse.json({ error: "Ervenytelen meres tipus" }, { status: 400 });
  }

  if (!isValidPoints(points)) {
    return NextResponse.json({ error: "Ervenytelen pontlista" }, { status: 400 });
  }

  if (!Number.isFinite(calculatedValue) || calculatedValue < 0) {
    return NextResponse.json({ error: "Ervenytelen szamitott ertek" }, { status: 400 });
  }

  const result = await createPlanMeasurementRecord({
    documentId: id,
    pageNumber,
    measurementType: measurementType as PlanMeasurementType,
    points: points as PlanMeasurementPoint[],
    calculatedValue,
    label,
    note
  });

  if (!result.measurement) {
    return NextResponse.json({ error: "A meres mentese nem sikerult", mode: result.mode }, { status: 500 });
  }

  return NextResponse.json({ data: result.measurement, mode: result.mode }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const measurementId = typeof body?.measurementId === "string" ? body.measurementId : "";
  const points: unknown = body?.points;
  const calculatedValue = Number(body?.calculatedValue);
  const label = typeof body?.label === "string" ? body.label.trim() || undefined : undefined;
  const note = typeof body?.note === "string" ? body.note.trim() || undefined : undefined;

  if (!measurementId) {
    return NextResponse.json({ error: "Missing measurementId" }, { status: 400 });
  }

  if (!isValidPoints(points)) {
    return NextResponse.json({ error: "Ervenytelen pontlista" }, { status: 400 });
  }

  if (!Number.isFinite(calculatedValue) || calculatedValue < 0) {
    return NextResponse.json({ error: "Ervenytelen szamitott ertek" }, { status: 400 });
  }

  const result = await updatePlanMeasurementRecord({
    measurementId,
    points: points as PlanMeasurementPoint[],
    calculatedValue,
    label,
    note
  });

  if (!result.measurement) {
    return NextResponse.json({ error: "A meres modositasa nem sikerult", mode: result.mode }, { status: 500 });
  }

  return NextResponse.json({ data: result.measurement, mode: result.mode });
}

export async function DELETE(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const measurementId = typeof body?.measurementId === "string" ? body.measurementId : "";

  if (!measurementId) {
    return NextResponse.json({ error: "Missing measurementId" }, { status: 400 });
  }

  const result = await deletePlanMeasurementRecord(measurementId);

  if (!result.ok) {
    return NextResponse.json({ error: "Meres torlese nem sikerult", mode: result.mode }, { status: 500 });
  }

  return NextResponse.json({ ok: result.ok, mode: result.mode });
}
