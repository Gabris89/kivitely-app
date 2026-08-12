import { NextRequest, NextResponse } from "next/server";
import { createWorkLog, listWorkLogs } from "@/lib/repository";
import { checkPermission } from "@/lib/permissions.server";

export const dynamic = "force-dynamic";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  return NextResponse.json({ data: await listWorkLogs(projectId) });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  const denied = await checkPermission("worklog.create");
  if (denied) return denied;

  const { projectId } = await params;
  const body = await request.json().catch(() => null);

  const description = typeof body?.description === "string" ? body.description.trim() : "";
  if (!description) {
    return NextResponse.json({ error: "Hiányzó kötelező mező: mit csináltál (description)" }, { status: 400 });
  }

  // A mennyiseg opcionalis; ha adott, ervenyes pozitiv szam legyen.
  let quantity: number | undefined;
  if (body?.quantity !== undefined && body?.quantity !== null && String(body.quantity).trim() !== "") {
    const parsed = Number(String(body.quantity).replace(",", "."));
    if (!Number.isFinite(parsed) || parsed < 0) {
      return NextResponse.json({ error: "Érvénytelen mennyiség" }, { status: 400 });
    }
    quantity = parsed;
  }

  const result = await createWorkLog({
    projectId,
    description,
    workDate: typeof body?.workDate === "string" && body.workDate ? body.workDate : undefined,
    trade: typeof body?.trade === "string" && body.trade.trim() ? body.trade.trim() : undefined,
    quantity,
    unit: typeof body?.unit === "string" && body.unit.trim() ? body.unit.trim() : undefined
  });

  if (!result.workLog) {
    return NextResponse.json({ error: "A napló mentése nem sikerült", mode: result.mode }, { status: result.mode === "supabase" ? 403 : 500 });
  }

  return NextResponse.json({ data: result.workLog, mode: result.mode }, { status: 201 });
}
