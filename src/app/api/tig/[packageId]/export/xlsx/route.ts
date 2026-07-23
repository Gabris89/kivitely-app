import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { getTigPackageDetail } from "@/lib/repository";
import { issuerCompany, tigFileSlug, tigStatusLabels } from "@/lib/company";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// TIG csomag Excel (.xlsx) export: Összesítő + Tételek munkalap.
export async function GET(_request: Request, { params }: { params: Promise<{ packageId: string }> }) {
  const { packageId } = await params;
  const detail = await getTigPackageDetail(packageId);
  if (!detail) return NextResponse.json({ error: "Nincs ilyen csomag" }, { status: 404 });

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Kivitely";

  // ── Összesítő ──────────────────────────────────────────────────────────
  const summary = workbook.addWorksheet("Összesítő");
  summary.columns = [{ width: 26 }, { width: 52 }];
  const period = [detail.periodStart, detail.periodEnd].filter(Boolean).join(" – ") || "-";
  const contact = [detail.subcontractor.contact, detail.subcontractor.phone].filter(Boolean).join(" · ") || "-";
  const summaryRows: [string, string | number][] = [
    ["Teljesítésigazolás", detail.id],
    ["Kiállító", issuerCompany.name],
    ["Alvállalkozó (teljesítő)", detail.subcontractor.name],
    ["Szakág", detail.subcontractor.trade || "-"],
    ["Kapcsolattartó", contact],
    ["Projekt", detail.project.name || "-"],
    ["Projekt címe", detail.project.address || "-"],
    ["Státusz", tigStatusLabels[detail.status] || detail.status],
    ["Teljesítési dátum", detail.performanceDate || "-"],
    ["Elszámolási időszak", period],
    ["Megjegyzés", detail.note || "-"],
    ["Tételek száma", detail.issues.length],
    ["Bizonyítékok száma", detail.proofCount],
    ["Nettó összérték (Ft)", detail.netValueHuf]
  ];
  summaryRows.forEach(([label, value]) => {
    const row = summary.addRow([label, value]);
    row.getCell(1).font = { bold: true };
  });

  // ── Tételek ────────────────────────────────────────────────────────────
  const items = workbook.addWorksheet("Tételek");
  items.columns = [
    { header: "Azonosító", key: "id", width: 14 },
    { header: "Megnevezés", key: "title", width: 42 },
    { header: "Helyszín", key: "location", width: 24 },
    { header: "Terület", key: "area", width: 18 },
    { header: "Szakág", key: "trade", width: 16 },
    { header: "Nettó érték (Ft)", key: "value", width: 18 },
    { header: "Before fotók", key: "before", width: 12 },
    { header: "After fotók", key: "after", width: 12 }
  ];
  items.getRow(1).font = { bold: true };

  detail.issues.forEach((issue) => {
    items.addRow({
      id: issue.id,
      title: issue.title,
      location: issue.location,
      area: issue.area,
      trade: issue.trade,
      value: issue.valueHuf,
      before: issue.photos.filter((photo) => photo.type === "before_photo").length,
      after: issue.photos.filter((photo) => photo.type === "after_photo").length
    });
  });

  const totalRow = items.addRow({ title: "Összesen", value: detail.netValueHuf });
  totalRow.font = { bold: true };

  const buffer = await workbook.xlsx.writeBuffer();
  const filename = `${detail.id}_${tigFileSlug(detail.subcontractor.name)}_${detail.performanceDate || "TIG"}.xlsx`;

  return new NextResponse(buffer as unknown as ArrayBuffer, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`
    }
  });
}
