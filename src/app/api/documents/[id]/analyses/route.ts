import { NextRequest, NextResponse } from "next/server";
import { checkPermission } from "@/lib/permissions.server";
import { createPlanAnalysis, listPlanAnalyses } from "@/lib/repository";
import { validatePlanAnalysisResult } from "@/lib/ai/planAnalysisSchema";
import { asCalculationType, parseSelection } from "@/lib/ai/planRequest";

/**
 * GET  /api/documents/[id]/analyses  - a dokumentumhoz mentett elemzesek listaja.
 * POST /api/documents/[id]/analyses  - a (felhasznalo altal ellenorzott/javitott)
 *                                      strukturalt eredmeny mentese.
 *
 * Mentes elott az eredmenyt a schema-validator ujra megtisztitja: a kliensbol
 * jott JSON (akar kezzel szerkesztett) SOHA nem megbizhato.
 */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return NextResponse.json({ data: await listPlanAnalyses(id) });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = await checkPermission("measurement.create");
  if (denied) return denied;

  const { id } = await params;
  const body = await request.json().catch(() => null);

  const selection = parseSelection(body?.selection);
  const calculationType = asCalculationType(body?.calculationType);
  const pageNumber = Number(body?.pageNumber) || 1;

  if (!selection) {
    return NextResponse.json({ error: "Ervenytelen kijeloles" }, { status: 400 });
  }

  // Az eredmeny a kliensbol jon (esetleg kezzel javitva) - kotelezoen tisztitjuk.
  const result = validatePlanAnalysisResult(body?.result);

  const saved = await createPlanAnalysis({
    documentId: id,
    pageNumber,
    selection,
    calculationType,
    result,
    confidence: result.confidence,
    userVerified: body?.userVerified === true
  });

  if (!saved.analysis) {
    return NextResponse.json({ error: "Az elemzes mentese nem sikerult", mode: saved.mode }, { status: saved.mode === "supabase" ? 404 : 500 });
  }

  return NextResponse.json({ data: saved.analysis, mode: saved.mode }, { status: 201 });
}
