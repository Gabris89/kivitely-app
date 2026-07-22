import { NextRequest, NextResponse } from "next/server";
import { deleteProjectRecord, updateProjectRecord } from "@/lib/repository";

export const dynamic = "force-dynamic";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const body = await request.json().catch(() => null);

  if (!body?.name) {
    return NextResponse.json({ error: "Hiányzó kötelező mező: name" }, { status: 400 });
  }

  const result = await updateProjectRecord(projectId, {
    name: String(body.name),
    address: body.address ? String(body.address) : undefined,
    client: body.client ? String(body.client) : undefined,
    phase: body.phase ? String(body.phase) : undefined,
    progress: body.progress !== undefined ? Number(body.progress) : undefined
  });

  if (!result.project) {
    return NextResponse.json({ error: "A mentés nem sikerült.", mode: result.mode }, { status: 500 });
  }

  return NextResponse.json({ data: result.project, mode: result.mode });
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const result = await deleteProjectRecord(projectId);

  if (!result.ok) {
    return NextResponse.json({ error: "A törlés nem sikerült.", mode: result.mode }, { status: 500 });
  }

  return NextResponse.json({ ok: true, mode: result.mode });
}
