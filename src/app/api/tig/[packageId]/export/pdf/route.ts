import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { createElement } from "react";
import { getTigPackageDetail } from "@/lib/repository";
import { tigFileSlug } from "@/lib/company";
import { TigPdfDocument } from "@/lib/pdf/TigPdfDocument";
import { checkPermission } from "@/lib/permissions.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// TIG csomag PDF export (teljesítésigazolás + fotós bizonyíték-melléklet).
export async function GET(_request: Request, { params }: { params: Promise<{ packageId: string }> }) {
  // Lásd az xlsx exportot: pénzügyi tartalom, ezért money.view a kapu, a
  // hatókört pedig a getTigPackageDetail zárja.
  const denied = await checkPermission("money.view");
  if (denied) return denied;

  const { packageId } = await params;
  const detail = await getTigPackageDetail(packageId);
  if (!detail) return NextResponse.json({ error: "Nincs ilyen csomag" }, { status: 404 });

  const element = createElement(TigPdfDocument, { detail }) as unknown as Parameters<typeof renderToBuffer>[0];
  const buffer = await renderToBuffer(element);
  const filename = `${detail.id}_${tigFileSlug(detail.subcontractor.name)}_${detail.performanceDate || "TIG"}.pdf`;

  return new NextResponse(buffer as unknown as ArrayBuffer, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`
    }
  });
}
