import { NextRequest, NextResponse } from "next/server";
import {
  deleteTigPackage,
  moveTigPackageStatus,
  setTigPackageIssues,
  updateTigPackageMeta,
  type TigMetaInput
} from "@/lib/repository";
import type { TigPackageStatus } from "@/types";

export const dynamic = "force-dynamic";

const VALID_STATUSES: TigPackageStatus[] = ["draft", "ready_for_review", "approved", "sent"];

// Egy TIG csomag módosítása: állapotváltás, tétel-lista csere, vagy metaadat.
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ packageId: string }> }) {
  const { packageId } = await params;
  const body = await request.json().catch(() => null);

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Érvénytelen kérés" }, { status: 400 });
  }

  // 1) Állapotváltás
  if (body.status) {
    if (!VALID_STATUSES.includes(body.status)) {
      return NextResponse.json({ error: "Ismeretlen állapot" }, { status: 400 });
    }
    const result = await moveTigPackageStatus(packageId, body.status);
    return NextResponse.json(result.ok ? { data: result.package } : { error: result.error }, {
      status: result.ok ? 200 : 400
    });
  }

  // 2) Tétel-lista csere (csak piszkozatban)
  if (Array.isArray(body.issueIds)) {
    const result = await setTigPackageIssues(packageId, body.issueIds.map(String));
    return NextResponse.json(result.ok ? { data: result.package } : { error: result.error }, {
      status: result.ok ? 200 : 400
    });
  }

  // 3) Metaadat (teljesítési dátum, időszak, megjegyzés)
  const meta: TigMetaInput = {
    performanceDate: body.performanceDate ?? null,
    periodStart: body.periodStart ?? null,
    periodEnd: body.periodEnd ?? null,
    note: body.note ?? null
  };
  const result = await updateTigPackageMeta(packageId, meta);
  return NextResponse.json(result.ok ? { data: result.package } : { error: result.error }, {
    status: result.ok ? 200 : 400
  });
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ packageId: string }> }) {
  const { packageId } = await params;
  const result = await deleteTigPackage(packageId);
  return NextResponse.json(result.ok ? { ok: true } : { error: result.error }, { status: result.ok ? 200 : 400 });
}
