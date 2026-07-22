import { NextRequest, NextResponse } from "next/server";
import { createTigPackage } from "@/lib/repository";

export const dynamic = "force-dynamic";

// TIG csomag létrehozása egy projekthez.
export async function POST(request: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const body = await request.json().catch(() => null);

  if (!body?.subcontractorId) {
    return NextResponse.json({ error: "Hiányzó mező: subcontractorId" }, { status: 400 });
  }

  const result = await createTigPackage({
    projectId,
    subcontractorId: String(body.subcontractorId),
    issueIds: Array.isArray(body.issueIds) ? body.issueIds.map(String) : [],
    performanceDate: body.performanceDate ?? null,
    periodStart: body.periodStart ?? null,
    periodEnd: body.periodEnd ?? null,
    note: body.note ?? null
  });

  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({ data: result.package }, { status: 201 });
}
