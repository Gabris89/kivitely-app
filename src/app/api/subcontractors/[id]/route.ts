import { NextRequest, NextResponse } from "next/server";
import { deleteSubcontractorRecord, updateSubcontractorRecord } from "@/lib/repository";

export const dynamic = "force-dynamic";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json().catch(() => null);

  if (!body?.name) {
    return NextResponse.json({ error: "Hiányzó kötelező mező: name" }, { status: 400 });
  }

  const result = await updateSubcontractorRecord(id, {
    name: String(body.name),
    trade: body.trade ? String(body.trade) : undefined,
    contactName: body.contactName ? String(body.contactName) : undefined,
    phone: body.phone ? String(body.phone) : undefined
  });

  if (!result.subcontractor) {
    return NextResponse.json({ error: "A mentés nem sikerült.", mode: result.mode }, { status: 500 });
  }

  return NextResponse.json({ data: result.subcontractor, mode: result.mode });
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await deleteSubcontractorRecord(id);

  if (!result.ok) {
    return NextResponse.json({ error: "A törlés nem sikerült.", mode: result.mode }, { status: 500 });
  }

  return NextResponse.json({ ok: true, mode: result.mode });
}
