import { NextRequest, NextResponse } from "next/server";
import { deleteIssueRecord, getIssue, getIssueEvents, getIssueEvidence, updateIssueRecord } from "@/lib/repository";
import { checkPermission, permissionErrorResponse } from "@/lib/permissions.server";

export const dynamic = "force-dynamic";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const issue = await getIssue(id);

  if (!issue) {
    return NextResponse.json({ error: "Issue not found" }, { status: 404 });
  }

  return NextResponse.json({
    data: issue,
    evidence: await getIssueEvidence(id),
    events: await getIssueEvents(id)
  });
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = await checkPermission("issue.update");
  if (denied) return denied;

  const { id } = await params;

  // Hatokor-ellenorzes a szerkesztes elott (3. lepcso). A getIssue mar szukitett
  // halmazbol dolgozik, ezert ami nem lathato, arra 404-et adunk - ugyanazt,
  // mint egy nem letezo azonositora. Igy a valasz nem arulja el, hogy a hiba
  // letezik-e egyaltalan. A repository is vedve van (getSupabaseIssueDbId), ez
  // itt a helyes HTTP statusz kedveert van.
  const existing = await getIssue(id);
  if (!existing) {
    return NextResponse.json({ error: "Issue not found" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);

  if (!body?.title || !body?.location || !body?.subcontractor || !body?.dueDate) {
    return NextResponse.json({ error: "Hiányzó kötelező mező: title, location, subcontractor, dueDate" }, { status: 400 });
  }

  // A szerep atment a matrixon, de a workflow.ts meg tilthatja a konkret
  // allapotvaltast - az ForbiddenError-kent jon vissza, ertheto uzenettel.
  let result;
  try {
    result = await updateIssueRecord(id, {
      title: String(body.title),
      description: body.description ? String(body.description) : undefined,
      location: String(body.location),
      area: body.area ? String(body.area) : undefined,
      trade: body.trade ? String(body.trade) : undefined,
      subcontractor: String(body.subcontractor),
      assignee: body.assignee ? String(body.assignee) : undefined,
      dueDate: String(body.dueDate),
      priority: body.priority,
      valueHuf: body.valueHuf ? Number(body.valueHuf) : undefined,
      status: body.status,
      statusNote: body.statusNote ? String(body.statusNote) : undefined
    });
  } catch (error) {
    const forbidden = permissionErrorResponse(error);
    if (forbidden) return forbidden;
    throw error;
  }

  if (!result.issue) {
    return NextResponse.json({ error: "A mentés nem sikerült.", mode: result.mode }, { status: 500 });
  }

  return NextResponse.json({ data: result.issue, mode: result.mode });
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = await checkPermission("issue.delete");
  if (denied) return denied;

  const { id } = await params;

  // Ugyanaz, mint a PATCH-nel: amit nem latsz, azt nem is torolheted, es a
  // valasz nem arulja el a letezeset.
  const existing = await getIssue(id);
  if (!existing) {
    return NextResponse.json({ error: "Issue not found" }, { status: 404 });
  }

  const result = await deleteIssueRecord(id);

  if (!result.ok) {
    return NextResponse.json({ error: "A törlés nem sikerült.", mode: result.mode }, { status: 500 });
  }

  return NextResponse.json({ ok: true, mode: result.mode });
}
