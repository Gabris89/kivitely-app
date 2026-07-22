import { NextRequest, NextResponse } from "next/server";
import { listTigCandidateIssues } from "@/lib/repository";

export const dynamic = "force-dynamic";

// Egy alvállalkozóhoz tartozó tig_ready hibák (a TIG-csomagba választható tételek).
export async function GET(request: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const subcontractor = request.nextUrl.searchParams.get("subcontractor");

  if (!subcontractor) {
    return NextResponse.json({ error: "Hiányzó query paraméter: subcontractor" }, { status: 400 });
  }

  const data = await listTigCandidateIssues(projectId, subcontractor);
  return NextResponse.json({ data });
}
