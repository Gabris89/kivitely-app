import { NextRequest, NextResponse } from "next/server";
import { getPlanCalibration, savePlanCalibration } from "@/lib/repository";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const metersPerUnit = await getPlanCalibration(id);
  return NextResponse.json({ data: metersPerUnit });
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json().catch(() => null);
  const metersPerUnit = Number(body?.metersPerUnit);

  if (!Number.isFinite(metersPerUnit) || metersPerUnit <= 0) {
    return NextResponse.json({ error: "Ervenytelen kalibracios ertek" }, { status: 400 });
  }

  const result = await savePlanCalibration(id, metersPerUnit);

  if (!result.ok) {
    return NextResponse.json({ error: "A kalibracio mentese nem sikerult", mode: result.mode }, { status: 500 });
  }

  return NextResponse.json({ ok: result.ok, mode: result.mode });
}
