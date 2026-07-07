import { NextRequest, NextResponse } from "next/server";
import type { IssueStatus } from "@/types";
import { getIssue, moveIssueStatusRecord } from "@/lib/repository";

const allowedStatuses: IssueStatus[] = [
  "draft",
  "open",
  "assigned",
  "in_progress",
  "ready_for_review",
  "accepted",
  "rejected",
  "tig_ready",
  "closed"
];

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json().catch(() => null);
  const targetStatus = body?.status as IssueStatus | undefined;

  if (!targetStatus || !allowedStatuses.includes(targetStatus)) {
    return NextResponse.json({ error: "Érvénytelen státusz" }, { status: 400 });
  }

  const issue = await getIssue(id);
  if (!issue) {
    return NextResponse.json({ error: "Issue not found" }, { status: 404 });
  }

  const result = await moveIssueStatusRecord(issue, targetStatus);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 409 });
  }

  return NextResponse.json({ data: result.issue, mode: result.mode });
}
