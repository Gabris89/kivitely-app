import { NextRequest, NextResponse } from "next/server";
import { createIssueRecord, listIssues } from "@/lib/repository";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ data: await listIssues() });
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);

  if (!body?.title || !body?.location || !body?.subcontractor || !body?.dueDate) {
    return NextResponse.json(
      { error: "Hiányzó kötelező mező: title, location, subcontractor, dueDate" },
      { status: 400 }
    );
  }

  const result = await createIssueRecord(body);
  return NextResponse.json({ data: result.issue, mode: result.mode }, { status: 201 });
}
