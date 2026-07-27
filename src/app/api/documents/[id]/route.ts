import { NextRequest, NextResponse } from "next/server";
import { deleteProjectDocumentRecord } from "@/lib/repository";
import { checkPermission } from "@/lib/permissions.server";

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = await checkPermission("document.delete");
  if (denied) return denied;

  const { id } = await params;

  if (!id) {
    return NextResponse.json({ error: "Missing document id" }, { status: 400 });
  }

  const result = await deleteProjectDocumentRecord(id);

  if (!result.ok) {
    return NextResponse.json({ error: "Document delete failed", mode: result.mode }, { status: 500 });
  }

  return NextResponse.json({ ok: result.ok, mode: result.mode });
}
