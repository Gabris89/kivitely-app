import { NextRequest, NextResponse } from "next/server";
import { deleteIssueRecord, getIssue, getIssueEvents, getIssueEvidence, updateIssueRecord } from "@/lib/repository";

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
  const { id } = await params;
  const body = await request.json().catch(() => null);

  if (!body?.title || !body?.location || !body?.subcontractor || !body?.dueDate) {
    return NextResponse.json({ error: "Hiányzó kötelező mező: title, location, subcontractor, dueDate" }, { status: 400 });
  }

  const result = await updateIssueRecord(id, {
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
    status: body.status
  });

  if (!result.issue) {
    return NextResponse.json({ error: "A mentés nem sikerült.", mode: result.mode }, { status: 500 });
  }

  return NextResponse.json({ data: result.issue, mode: result.mode });
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await deleteIssueRecord(id);

  if (!result.ok) {
    return NextResponse.json({ error: "A törlés nem sikerült.", mode: result.mode }, { status: 500 });
  }

  return NextResponse.json({ ok: true, mode: result.mode });
}
