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

/** A helyiseg kozeleben talalt MERET-szamok (kotak) ertekei. Determinista:
 *  a text-layerbol mar egzaktul megvannak, nem kell a tervet leolvasni.
 *  Szures: "N,NN" / "N.NN" / "N" formatum, 0.4..12 m (szoba-melet tartomany). */
function nearbyDimensionValues(allItems: PlanTextItem[], center: { x: number; y: number }, radius: number): number[] {
  const seen = new Set<string>();
  const out: number[] = [];
  for (const it of allItems) {
    if (Math.hypot(it.x - center.x, it.y - center.y) > radius) continue;
    const t = it.text.trim();
    if (!/^\d{1,2}([.,]\d{1,2})?$/.test(t)) continue;
    const value = Number(t.replace(",", "."));
    if (!Number.isFinite(value) || value < 0.4 || value > 12) continue;
    const norm = value.toFixed(2);
    if (seen.has(norm)) continue;
    seen.add(norm);
    out.push(value);
  }
  return out;
}

export type DimensionPair = { w: number; d: number; area: number };

/**
 * A helyiseg SZELESSEG x HOSSZ jelolt-parjai. A kulcs-otlet: a terulet mar
 * ismert (kiirt), ezert nem kell a kotat leolvasni - eleg megkeresni a kozeli
 * szam-parokat, amelyek SZORZATA ~ a kiirt terulet. Igy a felmero csak a helyes
 * PARRA bok (nulla zoom/leolvasas), es a szamok a terv egzakt kotai maradnak.
 *
 * A talalatok a terulet-egyezes szerint rangsorolva; ha nincs kiirt terulet
 * (targetAreaM2 = null), akkor is felkinalunk plauzibilis parokat.
 */
export function suggestDimensionPairs(
  allItems: PlanTextItem[],
  center: { x: number; y: number },
  targetAreaM2: number | null,
  radius = 0.09
): DimensionPair[] {
  const vals = nearbyDimensionValues(allItems, center, radius);
  const scored: { pair: DimensionPair; diff: number }[] = [];
  for (let i = 0; i < vals.length; i += 1) {
    for (let j = i; j < vals.length; j += 1) {
      const w = Math.max(vals[i], vals[j]);
      const d = Math.min(vals[i], vals[j]);
      const area = Math.round(w * d * 100) / 100;
      // Terulet-egyezes: ha van kiirt terulet, csak a hozza kozeli parok; kulonben
      // minden plauzibilis par (2..30 m2 kozott).
      const diff = targetAreaM2 !== null ? Math.abs(area - targetAreaM2) : 0;
      const ok = targetAreaM2 !== null ? diff <= Math.max(0.35, targetAreaM2 * 0.07) : area >= 2 && area <= 30;
      if (ok) scored.push({ pair: { w, d, area }, diff });
    }
  }
  scored.sort((a, b) => a.diff - b.diff || b.pair.area - a.pair.area);
  const seen = new Set<string>();
  const out: DimensionPair[] = [];
  for (const s of scored) {
    const key = `${s.pair.w}x${s.pair.d}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(s.pair);
    if (out.length >= 5) break;
  }
  return out;
}

/** A megadott ponthoz LEGKOZELEBBI kota (kiirt meret-szam) es annak EGZAKT
 *  erteke - a "koppints a kotakra" modhoz. Igy a kerulet a terv pontos szamaibol
 *  all ossze, nem pixel-meresbol vagy tippbol. Csak plauzibilis fal-meret
 *  (0.1..20 m) es a sugaron belul szamit. */
export function findNearestDimension(
  items: PlanTextItem[],
  point: { x: number; y: number },
  radius = 0.03
): { x: number; y: number; value: number } | null {
  let best: { x: number; y: number; value: number } | null = null;
  let bestDist = Infinity;
  for (const it of items) {
    const t = it.text.trim();
    if (!/^\d{1,2}([.,]\d{1,2})?$/.test(t)) continue;
    const value = Number(t.replace(",", "."));
    if (!Number.isFinite(value) || value < 0.1 || value > 20) continue;
    const d = Math.hypot(it.x - point.x, it.y - point.y);
    if (d <= radius && d < bestDist) {
      bestDist = d;
      best = { x: it.x, y: it.y, value };
    }
  }
  return best;
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
// A HORGONY valodi helyiseg-kod: betu KOTELEZO (pl. "B3.08"). Igy a meret-kotak
// ("2.70", "1.20") NEM lesznek horgonyok - korabban azok is azok voltak, ami
// hibas "kodokat" es duplikatumokat okozott.
const CODE_STRICT = /^[A-ZÁÉÍÓÖŐÚÜŰ]\d+\.\d+$/;
// Helyiseg-nev: csupa nagybetu (magyar), szokoz/vesszo megengedve (KONYHA, ÉTKEZŐ).
const ROOM_NAME = /^[A-ZÁÉÍÓÖŐÚÜŰ][A-ZÁÉÍÓÖŐÚÜŰ ,.]{1,}$/;

// A horgony (kod) KORNYEZETEBEN a LEGKOZELEBBI helyiseg-nev. Fontos, hogy a
// legkozelebbit valasszuk, ne az elsot a tombben: egy nagy helyisegnel (NAPPALI)
// a szomszed szoba neve (FÜRDŐ) is a sugarba eshet, es ha az van elorebb a
// tombben, tevesen azt venne nevnek -> "ket furdo", a nappali meg elveszik.
function detectName(items: PlanTextItem[], center: { x: number; y: number }): string | null {
  const dist = (it: PlanTextItem) => Math.hypot(it.x - center.x, it.y - center.y);
  // 1) Elonyben az ISMERT helyiseg-nev (SZOBA, FÜRDŐ, WC, ...), a legkozelebbi.
  const keywordItems = items
    .filter((it) => ROOM_NAME_KEYWORDS.some((keyword) => it.text.toUpperCase().includes(keyword)))
    .sort((a, b) => dist(a) - dist(b));
  if (keywordItems.length) return keywordItems[0].text.trim();
  // 2) Visszaeses: a legkozelebbi, csupa-nagybetus felirat (>=3 betu, nem kod).
  const uppercase = items
    .filter((it) => {
      const t = it.text.trim();
      return t.length >= 3 && ROOM_NAME.test(t) && !CODE_ANCHOR.test(t);
    })
    .sort((a, b) => dist(a) - dist(b));
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
export function findRoomMatches(allItems: PlanTextItem[], query: string, radius = 0.05): RoomMatch[] {
  const tokens = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (!tokens.length) return [];
  // A kereses KOD-tokenjei (szamot tartalmaz, pl. "b3.08") es NEV-tokenjei
  // (pl. "nappali") kulon: a kodot a horgonyra, a nevet a FELISMERT nevre
  // illesztjuk - igy egy "nappali" kereses nem talal furdot csak azert, mert a
  // nappali felirata veletlenul a furdo kodjanak sugaraba esik.
  const codeTokens = tokens.filter((t) => /\d/.test(t));
  const nameTokens = tokens.filter((t) => !/\d/.test(t));

  const anchors = allItems.filter((it) => CODE_STRICT.test(it.text.trim()));
  const matches: RoomMatch[] = [];
  for (const anchor of anchors) {
    const codeText = anchor.text.trim().toLowerCase();
    if (codeTokens.length && !codeTokens.some((t) => codeText === t || codeText.includes(t))) continue;

    const center = { x: anchor.x, y: anchor.y };
    const near = allItems.filter((it) => Math.hypot(it.x - center.x, it.y - center.y) <= radius);
    const name = detectName(near, center);
    if (nameTokens.length && (!name || !nameTokens.every((t) => name.toLowerCase().includes(t)))) continue;

    const code = anchor.text.trim();
    // Dedup: ugyanaz a helyiseg (kod+nev) tobb kozeli horgonnyal is elojohet -
    // a kozeli, azonos kod+nev talalatokat egynek vesszuk.
    const dup = matches.find(
      (m) => m.code === code && m.name === name && Math.hypot(m.center.x - center.x, m.center.y - center.y) < 0.04
    );
    if (dup) continue;
    matches.push({ center, items: near, code, name, label: name ? `${code} · ${name}` : code });
  }
  return matches;
}
