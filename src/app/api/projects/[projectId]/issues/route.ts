import { NextRequest, NextResponse } from "next/server";
import { createIssueRecord, listIssues } from "@/lib/repository";

export const dynamic = "force-dynamic";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  return NextResponse.json({ data: await listIssues(projectId) });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const body = await request.json().catch(() => null);

  if (!body?.title || !body?.location || !body?.subcontractor || !body?.dueDate) {
    return NextResponse.json(
      { error: "Hiányzó kötelező mező: title, location, subcontractor, dueDate" },
      { status: 400 }
    );
  }

  const result = await createIssueRecord({ ...body, projectId });
  return NextResponse.json({ data: result.issue, mode: result.mode }, { status: 201 });
}
