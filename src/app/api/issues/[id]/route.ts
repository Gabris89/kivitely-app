import { NextResponse } from "next/server";
import { getIssue, getIssueEvents, getIssueEvidence } from "@/lib/repository";

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
