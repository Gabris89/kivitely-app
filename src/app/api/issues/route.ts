import { NextRequest, NextResponse } from "next/server";
import { createIssue, listIssues } from "@/lib/repository";

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

  const issue = createIssue(body);
  return NextResponse.json({ data: issue, mode: "mock" }, { status: 201 });
}
