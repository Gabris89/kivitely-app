import type { PDFPageProxy } from "pdfjs-dist";
import type { PlanSelectionRect, PlanTextItem } from "@/types";

/**
 * A kijelolt teglalapba eso PDF text-layer elemek kiolvasasa (kliens-oldal).
 *
 * A cel-PDF CAD-export: a helyiseg-feliratok valodi szovegek. A pdf.js
 * getTextContent() ezeket adja PDF-koordinatakban; a viewport.transform-mal a
 * rendereltt pixeltérbe visszük, majd - ugyanugy, mint a merőeszkoz a
 * pontjait - a SZELESSEGHEZ normalizaljuk (osztas viewport.width-tel), hogy a
 * kijeloles (ami szinten igy normalizalt) es a text-itemek azonos terben
 * legyenek, fuggetlenul a render-felbontastol.
 *
 * Ha a PDF szkennelt (nincs text-layer), ures tomb jon vissza - ezt a hivo
 * jelzi a felhasznalonak (es kesobb a vision-fallback kaphat prioritast).
 */
export async function extractTextItemsInRect(page: PDFPageProxy, rect: PlanSelectionRect): Promise<PlanTextItem[]> {
  const { Util } = await import("pdfjs-dist");
  const viewport = page.getViewport({ scale: 1 });
  const width = viewport.width || 1;
  const content = await page.getTextContent();

  // Kis paddinggel a hatarra eso feliratok is bekerulnek.
  const pad = 0.01;
  const minX = rect.x - pad;
  const maxX = rect.x + rect.w + pad;
  const minY = rect.y - pad;
  const maxY = rect.y + rect.h + pad;

  const items: PlanTextItem[] = [];
  for (const raw of content.items) {
    if (!("str" in raw) || !raw.str.trim()) continue;
    const tx = Util.transform(viewport.transform, raw.transform);
    const nx = tx[4] / width;
    const ny = tx[5] / width;
    if (nx >= minX && nx <= maxX && ny >= minY && ny <= maxY) {
      items.push({ text: raw.str, x: nx, y: ny });
    }
  }
  return items;
}
