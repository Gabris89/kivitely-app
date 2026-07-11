import { NextRequest, NextResponse } from "next/server";
import { createBlockerRecord, listActiveBlockers } from "@/lib/repository";
import type { BlockerSeverity } from "@/types";

export const dynamic = "force-dynamic";

const allowedSeverities: BlockerSeverity[] = ["low", "normal", "high", "critical"];

export async function GET() {
  return NextResponse.json({ data: await listActiveBlockers() });
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);

  if (!body?.title || !body?.description) {
    return NextResponse.json(
      { error: "Hiányzó kötelező mező: title, description" },
      { status: 400 }
    );
  }

  const severity = allowedSeverities.includes(body.severity) ? body.severity : "normal";
  const result = await createBlockerRecord({
    title: String(body.title),
    description: String(body.description),
    trade: body.trade ? String(body.trade) : undefined,
    area: body.area ? String(body.area) : undefined,
    severity,
    responsibleName: body.responsibleName ? String(body.responsibleName) : undefined
  });

  return NextResponse.json({ data: result.blocker, mode: result.mode }, { status: 201 });
}
