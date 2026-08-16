import { NextRequest, NextResponse } from "next/server";
import { checkPermission } from "@/lib/permissions.server";
import { getScopedDocumentIdForApi } from "@/lib/repository";
import { getPlanAnalyzer } from "@/lib/ai/planAnalyzer";
import { asCalculationType, parseSelection, parseTextItems } from "@/lib/ai/planRequest";

/**
 * POST /api/documents/[id]/analyze
 *
 * Lefuttatja a tervelemzot a kliens altal kuldott (kijelolt regioban kigyujtott)
 * text-itemekre, es visszaadja a STRUKTURALT eredmenyt. NEM ment - a felhasznalo
 * eloszor ellenorzi/javitja, es csak utana kuldi a /analyses vegpontra.
 *
 * Az elemzo szerver-oldalon fut (az AI-kulcs sosem frontend), es az eredmenyt a
 * schema-validator kotelezoen megtisztitja a getPlanAnalyzer()-en belul.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = await checkPermission("measurement.create");
  if (denied) return denied;

  const { id } = await params;

  // Hatokor: lathatja-e egyaltalan ezt a dokumentumot? (Ne szivarogjon terv-adat.)
  const scopedDocumentId = await getScopedDocumentIdForApi(id);
  if (!scopedDocumentId) {
    return NextResponse.json({ error: "A dokumentum nem talalhato" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const selection = parseSelection(body?.selection);
  const textItems = parseTextItems(body?.textItems);
  const calculationType = asCalculationType(body?.calculationType);
  // A helyiseg pontos horgonya (a kliens a kereseskor tudja) - ehhez valasztja az
  // elemzo a mezoket a legkozelebbrol, hogy a szomszed (nyitott ter) / ismetlodo
  // kod ne kevertesse be a rossz erteket.
  const rawAnchor = body?.anchor;
  const anchor =
    rawAnchor && typeof rawAnchor.x === "number" && typeof rawAnchor.y === "number" && Number.isFinite(rawAnchor.x) && Number.isFinite(rawAnchor.y)
      ? { x: rawAnchor.x, y: rawAnchor.y }
      : undefined;

  if (!selection) {
    return NextResponse.json({ error: "Ervenytelen kijeloles" }, { status: 400 });
  }

  const analyzer = getPlanAnalyzer();
  const result = await analyzer.analyze({ calculationType, textItems, anchor });

  return NextResponse.json({ data: { result, analyzer: analyzer.name }, mode: "supabase" });
}
