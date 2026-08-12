import type { PDFPageProxy } from "pdfjs-dist";
import type { PlanSelectionRect, PlanTextItem } from "@/types";
import { ROOM_NAME_KEYWORDS } from "@/lib/ai/heuristicPlanAnalyzer";

/**
 * iOS Safari: a ReadableStream-nek nincs [Symbol.asyncIterator]-a, amit a pdf.js
 * getTextContent() belul hasznal -> "undefined is not a function (near value of
 * readableStream)". Ez desktopon (Chrome) mukodik, mobil Safarin nem. Potoljuk
 * a szabvanyos async-iteratorral, mielott a getTextContent-et hivnank.
 */
function ensureStreamAsyncIterator(): void {
  if (typeof ReadableStream === "undefined") return;
  const proto = ReadableStream.prototype as unknown as Record<PropertyKey, unknown>;
  if (proto[Symbol.asyncIterator]) return;
  proto[Symbol.asyncIterator] = async function* (this: ReadableStream<unknown>) {
    const reader = this.getReader();
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) return;
        yield value;
      }
    } finally {
      reader.releaseLock();
    }
  };
}

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
  ensureStreamAsyncIterator();
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

/** A TELJES lap text-layer elemei, normalizalt pozicioval - a kodra-kereseshez
 *  (az egesz lapon kell megtalalni a beirt kodot, nem csak egy kijelolesben). */
export async function extractAllTextItems(page: PDFPageProxy): Promise<PlanTextItem[]> {
  ensureStreamAsyncIterator();
  const { Util } = await import("pdfjs-dist");
  const viewport = page.getViewport({ scale: 1 });
  const width = viewport.width || 1;
  const content = await page.getTextContent();

  const items: PlanTextItem[] = [];
  for (const raw of content.items) {
    if (!("str" in raw) || !raw.str.trim()) continue;
    const tx = Util.transform(viewport.transform, raw.transform);
    items.push({ text: raw.str, x: tx[4] / width, y: tx[5] / width });
  }
  return items;
}

/** Egy megtalalt helyiseg a kereseshez: a kozeppont, a korulotte levo feliratok,
 *  es egy ember-olvashato cimke (kod + nev), amivel a valaszto-listaban latszik. */
export type RoomMatch = {
  center: { x: number; y: number };
  items: PlanTextItem[];
  code: string;
  name: string | null;
  label: string;
};

// Valodi helyiseg-kod: betu? + szam + PONT + szam (a "80-160" fele kotojeles
// meret NEM kod). Minden ilyen elofordulas egy kulon helyiseg (a kod a lakas
// szama, es minden szoban megismetlodik).
const CODE_ANCHOR = /^[A-ZÁÉÍÓÖŐÚÜŰ]?\d+\.\d+$/;
// Helyiseg-nev: csupa nagybetu (magyar), szokoz/vesszo megengedve (KONYHA, ÉTKEZŐ).
const ROOM_NAME = /^[A-ZÁÉÍÓÖŐÚÜŰ][A-ZÁÉÍÓÖŐÚÜŰ ,.]{1,}$/;

function detectName(items: PlanTextItem[]): string | null {
  // 1) Elonyben az ISMERT helyiseg-nev (SZOBA, FURDO, WC, ...) - igy nem egy
  //    rovid annotaciot (pl. "MG") vesz nevnek.
  for (const it of items) {
    const upper = it.text.toUpperCase();
    if (ROOM_NAME_KEYWORDS.some((keyword) => upper.includes(keyword))) return it.text.trim();
  }
  // 2) Visszaeses: a leghosszabb, csupa-nagybetus felirat (>=3 betu, hogy a
  //    2-betus jelek - MG, M - kimaradjanak). Nem kod.
  const uppercase = items
    .filter((it) => {
      const t = it.text.trim();
      return t.length >= 3 && ROOM_NAME.test(t) && !CODE_ANCHOR.test(t);
    })
    .sort((a, b) => b.text.trim().length - a.text.trim().length);
  return uppercase[0]?.text.trim() || null;
}

/**
 * A beirt kereses (kod es/vagy nev) OSSZES illeszkedo helyisege a lapon.
 *
 * Minden kod-elofordulas egy kulon helyiseg (a kod a lakas szama, ezert
 * ismetlodik). Egy helyiseg akkor illik, ha a KORNYEZETEBEN (kis sugarban) a
 * kereses MINDEN szava megvan - igy "B3.06" -> a lakas osszes szobaja (lista),
 * "B3.06 furdo" -> pontosan egy, "furdo" -> minden furdo (lista).
 */
export function findRoomMatches(allItems: PlanTextItem[], query: string, radius = 0.035): RoomMatch[] {
  const tokens = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (!tokens.length) return [];

  const anchors = allItems.filter((it) => CODE_ANCHOR.test(it.text.trim()));
  const matches: RoomMatch[] = [];
  for (const anchor of anchors) {
    const near = allItems.filter((it) => Math.hypot(it.x - anchor.x, it.y - anchor.y) <= radius);
    const nearText = near.map((it) => it.text.toLowerCase()).join(" ");
    if (!tokens.every((t) => nearText.includes(t))) continue;

    const code = anchor.text.trim();
    const name = detectName(near);
    matches.push({ center: { x: anchor.x, y: anchor.y }, items: near, code, name, label: name ? `${code} · ${name}` : code });
  }
  return matches;
}
