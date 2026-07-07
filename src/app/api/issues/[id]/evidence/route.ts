import { NextRequest, NextResponse } from "next/server";
import { createIssueEvidenceRecord, getIssue } from "@/lib/repository";

const allowedEvidenceTypes = ["before_photo", "after_photo"] as const;
type AllowedEvidenceType = (typeof allowedEvidenceTypes)[number];

function isAllowedEvidenceType(value: unknown): value is AllowedEvidenceType {
  return allowedEvidenceTypes.includes(value as AllowedEvidenceType);
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json().catch(() => null);
  const evidenceType = body?.type || body?.evidenceType;

  if (!isAllowedEvidenceType(evidenceType)) {
    return NextResponse.json({ error: "Érvénytelen bizonyíték típus" }, { status: 400 });
  }

  const issue = await getIssue(id);
  if (!issue) {
    return NextResponse.json({ error: "Issue not found" }, { status: 404 });
  }

  const result = await createIssueEvidenceRecord(issue.id, {
    type: evidenceType,
    label: typeof body?.label === "string" ? body.label : undefined
  });

  return NextResponse.json({ data: result.evidence, mode: result.mode }, { status: 201 });
}
