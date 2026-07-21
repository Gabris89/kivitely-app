import { NextRequest, NextResponse } from "next/server";
import { createBlockerRecord, listBlockers } from "@/lib/repository";
import type { BlockerSeverity } from "@/types";

export const dynamic = "force-dynamic";

const allowedSeverities: BlockerSeverity[] = ["low", "normal", "high", "critical"];

export async function GET(_request: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  return NextResponse.json({ data: await listBlockers(projectId) });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const body = await request.json().catch(() => null);

  if (!body?.title || !body?.description) {
    return NextResponse.json(
      { error: "Hiányzó kötelező mező: title, description" },
      { status: 400 }
    );
  }

  const severity = allowedSeverities.includes(body.severity) ? body.severity : "normal";
  const result = await createBlockerRecord({
    projectId,
    title: String(body.title),
    description: String(body.description),
    trade: body.trade ? String(body.trade) : undefined,
    area: body.area ? String(body.area) : undefined,
    severity,
    responsibleName: body.responsibleName ? String(body.responsibleName) : undefined
  });

  return NextResponse.json({ data: result.blocker, mode: result.mode }, { status: 201 });
}
