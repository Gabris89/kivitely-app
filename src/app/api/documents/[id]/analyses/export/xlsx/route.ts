import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { getScopedDocumentIdForApi, listPlanAnalyses } from "@/lib/repository";
import { checkPermission } from "@/lib/permissions.server";
import { deriveWorkQuantities, roomMetricsFromResult, type WorkType } from "@/lib/ai/planCalculations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Felmeresi naplo Excel (.xlsx) export a mentett helyiseg-elemzesekbol,
 * a Vasut utcai minta formatumaban: helyisegek x munkanemek -> mennyiseg x
 * egysegar -> Fizetendo.
 *
 * Elso verzio: a Padlo (m2) oszlopot a felismert alapteruletbol toltjuk, a
 * tobbi munkanemet a felmero adja meg (ures). Az osszegzo sorok keplettel
 * szamolnak, igy Excelben elve tovabb szerkesztheto.
 */

// A munkanem-oszlopok a mintabol: kulcs (a szabaly-motorhoz), fejlec,
// mertekegyseg, alapertelmezett egysegar.
const WORK_TYPES: { key: WorkType; header: string; unit: string; price: number }[] = [
  { key: "fal", header: "Fal", unit: "m2", price: 8500 },
  { key: "padlo", header: "Padló", unit: "m2", price: 8500 },
  { key: "labazat", header: "Lábazat", unit: "fm", price: 1800 },
  { key: "alapozas", header: "Alapozás", unit: "m2", price: 500 },
  { key: "halozas", header: "Hálózás", unit: "m2", price: 1700 },
  { key: "szigeteles", header: "Szigetelés", unit: "m2", price: 2200 },
  { key: "szalag", header: "Szalag", unit: "fm", price: 800 },
  { key: "elvedo", header: "Élvédő", unit: "fm", price: 1200 },
  { key: "tapadohid", header: "Tapadóhíd", unit: "m2", price: 500 },
  { key: "ora", header: "Óra", unit: "egység", price: 8000 },
  { key: "kiegyenlites", header: "Kiegyenl.", unit: "m2", price: 2500 },
  { key: "feszmentesites", header: "Feszment.", unit: "m2", price: 3800 }
];

// A helyiseg-kodbol (pl. "B3.12") Epulet / Emelet / Lakas. Best-effort: az elso
// betu az epulet, a pont elotti szam az emelet, a pont utani a lakas.
function splitCode(code: string | null): { building: string; floor: string; unit: string } {
  if (!code) return { building: "", floor: "", unit: "" };
  const m = code.trim().match(/^([A-Za-zÁÉÍÓÖŐÚÜŰ]*)\s*(\d+)?\.?(\d+)?/);
  return { building: m?.[1] || "", floor: m?.[2] || "", unit: m?.[3] || "" };
}

function colLetter(index: number): string {
  // 1 -> A, 2 -> B, ...
  let n = index;
  let s = "";
  while (n > 0) {
    const r = (n - 1) % 26;
    s = String.fromCharCode(65 + r) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  // Penzugyi kihatasa van (egysegar, vegosszeg), ezert ugyanaz a kapu, mint a
  // pénzt megjelenito helyeken. A hatokort a getScopedDocumentIdForApi ellenorzi.
  const denied = await checkPermission("money.view");
  if (denied) return denied;

  const { id } = await params;
  const scoped = await getScopedDocumentIdForApi(id);
  if (!scoped) return NextResponse.json({ error: "A dokumentum nem található" }, { status: 404 });

  const analyses = await listPlanAnalyses(id);

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Kivitely";
  const sheet = workbook.addWorksheet("Felmérés");

  // Oszlopok: Ép, Em, Lakás, Helyiség + munkanemek + Burkolat, Belmagasság.
  const FIXED = 4; // Ep, Em, Lakas, Helyiseg
  const workStart = FIXED + 1; // elso munkanem oszlop indexe (1-alapu) = 5 (E)
  const workEnd = FIXED + WORK_TYPES.length; // utolso munkanem (P = 16)
  const totalWidth = workEnd + 2; // + Burkolat, Belmagassag

  sheet.getColumn(1).width = 6;
  sheet.getColumn(2).width = 6;
  sheet.getColumn(3).width = 8;
  sheet.getColumn(4).width = 22;
  for (let c = workStart; c <= workEnd; c += 1) sheet.getColumn(c).width = 10;
  sheet.getColumn(workEnd + 1).width = 14;
  sheet.getColumn(workEnd + 2).width = 12;

  // 1. sor: cim.
  sheet.mergeCells(1, 1, 1, totalWidth);
  sheet.getCell(1, 1).value = "Felmérés – hidegburkolás (Kivitely export)";
  sheet.getCell(1, 1).font = { bold: true, size: 12 };

  // 2. sor: fejlecek.
  const headerRow = sheet.getRow(2);
  headerRow.getCell(1).value = "Ép.";
  headerRow.getCell(2).value = "Em.";
  headerRow.getCell(3).value = "Lakás";
  headerRow.getCell(4).value = "Helyiség / Tételek";
  WORK_TYPES.forEach((w, i) => (headerRow.getCell(workStart + i).value = w.header));
  headerRow.getCell(workEnd + 1).value = "Burkolat";
  headerRow.getCell(workEnd + 2).value = "Belm. (m)";
  headerRow.font = { bold: true };

  // 3. sor: mertekegysegek.
  const unitRow = sheet.getRow(3);
  WORK_TYPES.forEach((w, i) => (unitRow.getCell(workStart + i).value = w.unit));
  unitRow.font = { italic: true };

  // 4..: adatsorok a mentett elemzesekbol.
  const firstDataRow = 4;
  analyses.forEach((analysis, index) => {
    const room = analysis.result.room;
    const { building, floor, unit } = splitCode(room.code);
    // Szabaly-motor: amit determinista szabalybol tudunk (padlo, feszment, es -
    // ha van kerulet - fal/labazat/szalag/alapozas), azt kitoltjuk. A kerulet
    // jelenleg nincs eltarolva, ezert a kerulet-fuggo munkanemek egyelore uresek
    // (a felmero adja meg); amint a korberajzolas/kota bekerul, ezek is toltodnek.
    const derived = deriveWorkQuantities(roomMetricsFromResult(analysis.result));
    const row = sheet.getRow(firstDataRow + index);
    row.getCell(1).value = building;
    row.getCell(2).value = floor;
    row.getCell(3).value = unit;
    row.getCell(4).value = room.name || "";
    WORK_TYPES.forEach((w, i) => {
      const q = derived[w.key].value;
      if (q !== null) row.getCell(workStart + i).value = q;
    });
    row.getCell(workEnd + 1).value = room.floorFinish || "";
    row.getCell(workEnd + 2).value = room.ceilingHeightM ?? "";
  });

  const lastDataRow = analyses.length ? firstDataRow + analyses.length - 1 : firstDataRow;

  // Ossz. Menny. sor (SUM munkanemenkent).
  const sumRow = lastDataRow + 1;
  sheet.getCell(sumRow, 1).value = "Össz. menny.:";
  sheet.getCell(sumRow, 1).font = { bold: true };
  WORK_TYPES.forEach((_, i) => {
    const col = colLetter(workStart + i);
    sheet.getCell(sumRow, workStart + i).value = { formula: `SUM(${col}${firstDataRow}:${col}${lastDataRow})` };
  });

  // Egys. ar sor.
  const priceRow = sumRow + 1;
  sheet.getCell(priceRow, 1).value = "Egys. ár:";
  sheet.getCell(priceRow, 1).font = { bold: true };
  WORK_TYPES.forEach((w, i) => (sheet.getCell(priceRow, workStart + i).value = w.price));

  // Ossz. M.d. sor (menny x ar).
  const valueRow = priceRow + 1;
  sheet.getCell(valueRow, 1).value = "Össz. M.d.:";
  sheet.getCell(valueRow, 1).font = { bold: true };
  WORK_TYPES.forEach((_, i) => {
    const col = colLetter(workStart + i);
    sheet.getCell(valueRow, workStart + i).value = { formula: `${col}${sumRow}*${col}${priceRow}` };
  });

  // Fizetendo (a M.d. sor osszege).
  const payRow = valueRow + 1;
  sheet.getCell(payRow, 1).value = "Fizetendő:";
  sheet.getCell(payRow, 1).font = { bold: true, size: 12 };
  sheet.getCell(payRow, workStart).value = {
    formula: `SUM(${colLetter(workStart)}${valueRow}:${colLetter(workEnd)}${valueRow})`
  };
  sheet.getCell(payRow, workStart).font = { bold: true, size: 12 };

  const buffer = await workbook.xlsx.writeBuffer();
  const filename = `felmeres_${new Date().toISOString().slice(0, 10)}.xlsx`;

  return new NextResponse(buffer as unknown as ArrayBuffer, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`
    }
  });
}
