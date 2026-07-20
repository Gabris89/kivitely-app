import { NextRequest, NextResponse } from "next/server";
import { createProjectDocumentRecord, listProjectDocuments } from "@/lib/repository";
import type { ProjectDocumentVisibility } from "@/types";

export const dynamic = "force-dynamic";

const allowedDocumentTypes = ["architectural_plan", "technical_plan", "material_spec", "photo_document", "other"] as const;
type AllowedDocumentType = (typeof allowedDocumentTypes)[number];
const allowedVisibility: ProjectDocumentVisibility[] = ["internal", "project_team", "workers", "subcontractors", "viewer_shared"];
const allowedMimeTypes = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
  "text/plain",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
];
const maxFileSizeBytes = 20 * 1024 * 1024;
const mimeTypeByExtension: Record<string, string> = {
  pdf: "application/pdf",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  heic: "image/heic",
  heif: "image/heif",
  txt: "text/plain",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
};

function isAllowedDocumentType(value: unknown): value is AllowedDocumentType {
  return allowedDocumentTypes.includes(value as AllowedDocumentType);
}

function normalizeVisibility(value: unknown): ProjectDocumentVisibility {
  return allowedVisibility.includes(value as ProjectDocumentVisibility) ? value as ProjectDocumentVisibility : "project_team";
}

function getFileExtension(fileName: string) {
  const extension = fileName.split(".").pop()?.toLowerCase() || "";
  return extension.replace(/[^a-z0-9]/g, "");
}

function deriveTitleFromFileName(fileName: string) {
  const lastDotIndex = fileName.lastIndexOf(".");
  return lastDotIndex > 0 ? fileName.slice(0, lastDotIndex) : fileName;
}

function getEffectiveMimeType(file: File) {
  if (allowedMimeTypes.includes(file.type)) return file.type;
  const inferredType = mimeTypeByExtension[getFileExtension(file.name)];
  return inferredType || file.type || "application/octet-stream";
}

export async function GET() {
  return NextResponse.json({ data: await listProjectDocuments() });
}

export async function POST(request: NextRequest) {
  const contentType = request.headers.get("content-type") || "";

  if (!contentType.includes("multipart/form-data")) {
    return NextResponse.json({ error: "Multipart form data szukseges" }, { status: 400 });
  }

  const formData = await request.formData();
  const fileValue = formData.get("file");
  const file = fileValue instanceof File && fileValue.size > 0 ? fileValue : undefined;
  const documentType = formData.get("documentType");

  if (!file) {
    return NextResponse.json({ error: "Hianyzo fajl" }, { status: 400 });
  }

  const title = String(formData.get("title") || "").trim() || deriveTitleFromFileName(file.name);

  if (!isAllowedDocumentType(documentType)) {
    return NextResponse.json({ error: "Érvénytelen dokumentum típus" }, { status: 400 });
  }

  const effectiveMimeType = getEffectiveMimeType(file);

  if (!allowedMimeTypes.includes(effectiveMimeType)) {
    return NextResponse.json({ error: "Nem támogatott fájltípus. Használj PDF-et, képet, TXT-t, DOC/DOCX-ot vagy XLS/XLSX-et." }, { status: 400 });
  }

  if (file.size > maxFileSizeBytes) {
    return NextResponse.json({ error: "A fájl legfeljebb 20 MB lehet." }, { status: 400 });
  }

  const result = await createProjectDocumentRecord({
    projectId: String(formData.get("projectId") || "") || undefined,
    documentType,
    title,
    description: String(formData.get("description") || "").trim() || undefined,
    trade: String(formData.get("trade") || "").trim() || undefined,
    area: String(formData.get("area") || "").trim() || undefined,
    revision: String(formData.get("revision") || "").trim() || undefined,
    visibility: normalizeVisibility(formData.get("visibility")),
    file,
    mimeType: effectiveMimeType
  });

  return NextResponse.json({ data: result.document, mode: result.mode }, { status: 201 });
}
