import { NextRequest, NextResponse } from "next/server";
import { createSubcontractorRecord, listSubcontractors } from "@/lib/repository";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ data: await listSubcontractors() });
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);

  if (!body?.name) {
    return NextResponse.json({ error: "Hiányzó kötelező mező: name" }, { status: 400 });
  }

  const result = await createSubcontractorRecord({
    name: String(body.name),
    trade: body.trade ? String(body.trade) : undefined,
    contactName: body.contactName ? String(body.contactName) : undefined,
    phone: body.phone ? String(body.phone) : undefined
  });

  return NextResponse.json({ data: result.subcontractor, mode: result.mode }, { status: 201 });
}
