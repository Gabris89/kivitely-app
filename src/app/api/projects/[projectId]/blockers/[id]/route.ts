import { NextRequest, NextResponse } from "next/server";
import { deleteBlockerRecord, updateBlockerRecord } from "@/lib/repository";
import type { BlockerSeverity, BlockerStatus } from "@/types";

export const dynamic = "force-dynamic";

const allowedSeverities: BlockerSeverity[] = ["low", "normal", "high", "critical"];
const allowedStatuses: BlockerStatus[] = ["open", "in_progress", "waiting_external", "resolved", "closed", "cancelled"];

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json().catch(() => null);

  if (!body?.title || !body?.description || !allowedStatuses.includes(body.status)) {
    return NextResponse.json({ error: "Hiányzó kötelező mező: title, description, status" }, { status: 400 });
  }

  const result = await updateBlockerRecord(id, {
    title: String(body.title),
    description: String(body.description),
    trade: body.trade ? String(body.trade) : undefined,
    area: body.area ? String(body.area) : undefined,
    severity: allowedSeverities.includes(body.severity) ? body.severity : "normal",
    status: body.status,
    resolutionNote: body.resolutionNote ? String(body.resolutionNote) : undefined,
    responsibleName: body.responsibleName ? String(body.responsibleName) : undefined
  });

  if (!result.blocker) {
    return NextResponse.json({ error: "A mentés nem sikerült.", mode: result.mode }, { status: 500 });
  }

  return NextResponse.json({ data: result.blocker, mode: result.mode });
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await deleteBlockerRecord(id);

  if (!result.ok) {
    return NextResponse.json({ error: "A törlés nem sikerült.", mode: result.mode }, { status: 500 });
  }

  return NextResponse.json({ ok: true, mode: result.mode });
}
