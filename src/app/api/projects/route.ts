import { NextRequest, NextResponse } from "next/server";
import { createProjectRecord, listProjects } from "@/lib/repository";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ data: await listProjects() });
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);

  if (!body?.name) {
    return NextResponse.json({ error: "Hiányzó kötelező mező: name" }, { status: 400 });
  }

  const result = await createProjectRecord({
    name: String(body.name),
    address: body.address ? String(body.address) : undefined,
    client: body.client ? String(body.client) : undefined,
    phase: body.phase ? String(body.phase) : undefined
  });

  return NextResponse.json({ data: result.project, mode: result.mode }, { status: 201 });
}
