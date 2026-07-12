import { NextRequest, NextResponse } from "next/server";
import { createIssueEvidenceRecord, deleteIssueEvidenceRecord, getIssue } from "@/lib/repository";

const allowedEvidenceTypes = ["before_photo", "after_photo"] as const;
type AllowedEvidenceType = (typeof allowedEvidenceTypes)[number];

const allowedImageTypes = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];
const maxImageSizeBytes = 10 * 1024 * 1024;

function isAllowedEvidenceType(value: unknown): value is AllowedEvidenceType {
  return allowedEvidenceTypes.includes(value as AllowedEvidenceType);
}

async function parseEvidenceRequest(request: NextRequest) {
  const contentType = request.headers.get("content-type") || "";

  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    const evidenceType = formData.get("type") || formData.get("evidenceType");
    const fileValue = formData.get("file");
    const file = fileValue instanceof File && fileValue.size > 0 ? fileValue : undefined;
    const labelValue = formData.get("label");

    return {
      evidenceType,
      label: typeof labelValue === "string" ? labelValue : undefined,
      file
    };
  }

  const body = await request.json().catch(() => null);

  return {
    evidenceType: body?.type || body?.evidenceType,
    label: typeof body?.label === "string" ? body.label : undefined,
    file: undefined
  };
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { evidenceType, label, file } = await parseEvidenceRequest(request);

  if (!isAllowedEvidenceType(evidenceType)) {
    return NextResponse.json({ error: "Ervenytelen bizonyitek tipus" }, { status: 400 });
  }

  if (file && !allowedImageTypes.includes(file.type)) {
    return NextResponse.json({ error: "Csak JPEG, PNG, WebP, HEIC vagy HEIF kep toltheto fel" }, { status: 400 });
  }

  if (file && file.size > maxImageSizeBytes) {
    return NextResponse.json({ error: "A kep legfeljebb 10 MB lehet" }, { status: 400 });
  }

  const issue = await getIssue(id);
  if (!issue) {
    return NextResponse.json({ error: "Issue not found" }, { status: 404 });
  }

  const result = await createIssueEvidenceRecord(issue.id, {
    type: evidenceType,
    label,
    file
  });

  return NextResponse.json({ data: result.evidence, mode: result.mode }, { status: 201 });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json().catch(() => null);
  const evidenceId = typeof body?.evidenceId === "string" ? body.evidenceId : "";

  if (!evidenceId) {
    return NextResponse.json({ error: "Missing evidenceId" }, { status: 400 });
  }

  const issue = await getIssue(id);
  if (!issue) {
    return NextResponse.json({ error: "Issue not found" }, { status: 404 });
  }

  const result = await deleteIssueEvidenceRecord(issue.id, evidenceId);

  if (!result.ok) {
    return NextResponse.json({ error: "Evidence delete failed", mode: result.mode }, { status: 500 });
  }

  return NextResponse.json({ ok: result.ok, mode: result.mode });
}
