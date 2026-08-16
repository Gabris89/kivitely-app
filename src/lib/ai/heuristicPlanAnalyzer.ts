import type { PlanAnalysisResult, PlanTextItem } from "@/types";

/**
 * Heurisztikus tervelemzo - az MVP magja, AI NELKUL.
 *
 * A cel-PDF CAD-export, amelyben a helyiseg-feliratok valodi szovegkent vannak
 * jelen (a kliens a pdf.js text-layerbol olvassa ki oket a kijelolt regioban).
 * Ez a modul ebbol a szovegbol - regex + ismert szotar - strukturalja a
 * helyiseg adatait. Determinista, ingyenes, es a forras mindig "PRINTED"
 * (a terven kiirt ertek), amit a kovetelmeny is elonyben reszesit.
 *
 * SOHA nem talal ki hianyzo erteket: ami nem olvashato, az null + warning +
 * alacsonyabb confidence. Igy a felhasznalonak egyertelmu, mit kell ellenoriznie.
 */

// Ismert padloburkolatok (kisbetus a terven). Bovitheto.
const FLOOR_FINISHES = [
  "greslap",
  "gres",
  "jarolap",
  "járólap",
  "koporcelan",
  "kőporcelán",
  "lam. parketta",
  "laminalt parketta",
  "laminált parketta",
  "laminalt",
  "laminált",
  "szalagparketta",
  "parketta",
  "csempe",
  "pvc",
  "vinyl",
  "szonyeg",
  "szőnyeg",
  "beton",
  "epoxi",
  "terazzo"
];

// Ismert helyiseg-nevek (a terven nagybetuvel). A leghosszabb egyezes nyer,
// hogy a "KONYHA, ETKEZO" egyben jojjon at. Exportalt: a kodra-kereses
// valaszto-listaja is ezt hasznalja a cimkehez (ne "MG"-fele annotaciot vegyen).
export const ROOM_NAME_KEYWORDS = [
  "FÜRDŐ",
  "FÜRDŐSZOBA",
  "ZUHANYZÓ",
  "WC",
  "KONYHA",
  "ÉTKEZŐ",
  "HÁLÓ",
  "HÁLÓSZOBA",
  "ELŐSZOBA",
  "KÖZLEKEDŐ",
  "NAPPALI",
  "SZOBA",
  "GYEREKSZOBA",
  "KAMRA",
  "SPEIZ",
  "GARDRÓB",
  "ERKÉLY",
  "TERASZ",
  "LOGGIA",
  "LÉPCSŐHÁZ",
  "GÉPÉSZET",
  "TÁROLÓ",
  "MOSÓ",
  "DOLGOZÓ"
];

function normalizeLower(text: string): string {
  return text.toLowerCase();
}

/** "4,33 m2" / "4.33 m²" / "12,25 m 2" -> szam. Csak a legnagyobb, m2-hez kotott
 *  erteket vesszuk.
 *  - A zaro (?![\dA-Za-z]) a "\b" helyett: a "²" nem szo-karakter, igy utana a
 *    szohatar SOHA nem teljesulne - emiatt a "12,58 m²" korabban kimaradt.
 *  - A "m" es a "2/²" kozott \s* megengedett: a CAD-export a felso indexes 2-t
 *    gyakran KULON szoveg-elemként adja, igy a kinyert szoveg "12,25 m 2". */
function findFloorArea(joined: string): number | null {
  // A zaro (?![\dA-Za-z.,]) a "2" utan tizedest is kizar, hogy egy "3,00 m 2,10"
  // (hossz-meret + kovetkezo meret) NE illeszkedjen teruletkent.
  const matches = [...joined.matchAll(/(\d+(?:[.,]\d+)?)\s*m\s*(?:2|²)(?![\dA-Za-z.,])/gi)];
  const values = matches
    .map((m) => Number(m[1].replace(",", ".")))
    .filter((n) => Number.isFinite(n) && n > 0 && n < 10000);
  if (!values.length) return null;
  // Egy helyiseg-kijelolesnel altalaban egyetlen terulet-ertek van; ha tobb,
  // a legnagyobb a helyiseg alapterulete (a tobbi lehet reszlet/burkolat).
  return Math.max(...values);
}

/** "bm = 270 cm" / "bm=270" / "bm: 2,70 m" -> 2.70 (meterben). */
function findCeilingHeight(joined: string): number | null {
  const cm = joined.match(/bm\s*[=:]?\s*(\d+(?:[.,]\d+)?)\s*cm/i);
  if (cm) {
    const n = Number(cm[1].replace(",", ".")) / 100;
    if (Number.isFinite(n) && n > 0) return n;
  }
  const m = joined.match(/bm\s*[=:]?\s*(\d+(?:[.,]\d+)?)\s*m\b/i);
  if (m) {
    const n = Number(m[1].replace(",", "."));
    if (Number.isFinite(n) && n > 0) return n;
  }
  // "bm = 270" merteregyseg nelkul: cm-nek tekintjuk (a tervek igy irjak).
  const bare = joined.match(/bm\s*[=:]?\s*(\d{2,3})\b/i);
  if (bare) {
    const n = Number(bare[1]) / 100;
    if (Number.isFinite(n) && n >= 1.5 && n <= 6) return n;
  }
  return null;
}

/** A leghosszabb ismert burkolat-megnevezes, ami elofordul a szovegben. */
function findFloorFinish(joined: string): string | null {
  const lower = normalizeLower(joined);
  const found = FLOOR_FINISHES.filter((finish) => lower.includes(finish)).sort((a, b) => b.length - a.length);
  return found[0] || null;
}

/** Helyiseg-kod, pl. "B3.12".
 *  A tervek a helyiseg-kodot BETUVEL + PONTTAL irjak (B3.12), a mereteket/
 *  reviziot viszont betu nelkul, gyakran KOTOJELLEL (pl. "80-160"). Ezert
 *  eloszor a SZIGORU mintat keressuk (betu-prefix + pont-elvalaszto), es csak
 *  ha az nincs, esunk vissza a lazabbra - de a "szam-KOTOJEL-szam" formatumot
 *  (meret/revizio) SOHA nem fogadjuk el kodkent. */
function findRoomCode(items: PlanTextItem[]): string | null {
  // 1) Szigoru: betu + szam(ok) + pont + szam(ok) -> valodi helyiseg-kod.
  for (const item of items) {
    const m = item.text.match(/\b([A-ZÁÉÍÓÖŐÚÜŰ]\d+\.\d+)\b/);
    if (m) return m[1];
  }
  // 2) Visszaeses: betu-prefixes (pont vagy kotojel), VAGY betu nelkuli, de csak
  //    PONTTAL (pl. "3.08"). A betu nelkuli kotojeles szam (meret) kimarad.
  for (const item of items) {
    const m = item.text.match(/\b([A-ZÁÉÍÓÖŐÚÜŰ]\d+[.\-]\d+|\d+\.\d+)\b/);
    if (m) return m[1];
  }
  return null;
}

/** A helyiseg neve: az a (tobbnyire) nagybetus felirat, ami ismert
 *  helyiseg-kulcsszot tartalmaz. A teljes item-szoveget adjuk vissza, hogy a
 *  "KONYHA, ÉTKEZŐ" egyben jojjon. */
function findRoomName(items: PlanTextItem[]): string | null {
  // Elonyben az az item, ami ismert kulcsszot tartalmaz.
  for (const item of items) {
    const upper = item.text.toUpperCase();
    if (ROOM_NAME_KEYWORDS.some((keyword) => upper.includes(keyword))) {
      return item.text.trim();
    }
  }
  return null;
}

/** A helyiseg-kod ITEMje (pozicioval): ehhez a horgonyhoz valasztjuk a tobbi
 *  mezot a LEGKOZELEBBRE - igy a szomszed helyiseg (nyitott ter!) ertekeit nem
 *  huzzuk be. */
function findCodeItem(items: PlanTextItem[]): PlanTextItem | null {
  for (const item of items) if (/\b[A-ZÁÉÍÓÖŐÚÜŰ]\d+\.\d+\b/.test(item.text)) return item;
  for (const item of items) if (/\b([A-ZÁÉÍÓÖŐÚÜŰ]\d+[.\-]\d+|\d+\.\d+)\b/.test(item.text)) return item;
  return null;
}

function dist(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/** A horgony: a kod-item, kulonben a legelso ismert nev-item, kulonben az
 *  itemek atlaga (kozeppont). */
function anchorPoint(items: PlanTextItem[]): { x: number; y: number } {
  const code = findCodeItem(items);
  if (code) return { x: code.x, y: code.y };
  const nameItem = items.find((it) => ROOM_NAME_KEYWORDS.some((k) => it.text.toUpperCase().includes(k)));
  if (nameItem) return { x: nameItem.x, y: nameItem.y };
  const n = items.length || 1;
  return { x: items.reduce((s, i) => s + i.x, 0) / n, y: items.reduce((s, i) => s + i.y, 0) / n };
}

/** Terulet-jeloltek pozicioval: "N m²" egy itemben, VAGY szam-item, amit a
 *  kozelben (kulon elemkent) egy "m²" kovet (a CAD gyakran szetszedi). */
function areaCandidates(items: PlanTextItem[]): { value: number; x: number; y: number }[] {
  const out: { value: number; x: number; y: number }[] = [];
  for (const it of items) {
    const full = it.text.match(/(\d+(?:[.,]\d+)?)\s*m\s*(?:2|²)(?![\dA-Za-z.,])/i);
    if (full) {
      const v = Number(full[1].replace(",", "."));
      if (v > 0 && v < 10000) out.push({ value: v, x: it.x, y: it.y });
      continue;
    }
    const bare = it.text.trim().match(/^(\d+(?:[.,]\d+)?)$/);
    if (!bare) continue;
    const v = Number(bare[1].replace(",", "."));
    if (!(v > 0 && v < 10000)) continue;
    const hasUnit = items.some((o) => o !== it && dist(o, it) <= 0.02 && /(?:m\s*(?:2|²)|²)/i.test(o.text));
    if (hasUnit) out.push({ value: v, x: it.x, y: it.y });
  }
  return out;
}

/** Belmagassag-jeloltek pozicioval: a "bm"-et tartalmazo item + kozeli szoveg. */
function ceilingCandidates(items: PlanTextItem[]): { value: number; x: number; y: number }[] {
  const out: { value: number; x: number; y: number }[] = [];
  for (const it of items) {
    if (!/bm/i.test(it.text)) continue;
    const local = items.filter((o) => dist(o, it) <= 0.03).map((o) => o.text).join(" ");
    const v = findCeilingHeight(local);
    if (v !== null) out.push({ value: v, x: it.x, y: it.y });
  }
  return out;
}

function nearest<T extends { x: number; y: number }>(cands: T[], anchor: { x: number; y: number }): T | null {
  if (!cands.length) return null;
  return [...cands].sort((a, b) => dist(a, anchor) - dist(b, anchor))[0];
}

export function analyzeTextItems(items: PlanTextItem[], anchorOverride?: { x: number; y: number }): PlanAnalysisResult {
  const joined = items.map((item) => item.text).join("  ");
  // A horgony: ha a kliens megadta a helyiseg pontos poziciojat (a kod ismetlodik
  // a lakasban, ezert a szerver-oldali talalgatas tevedhet), azt hasznaljuk; a
  // tobbi mezot (terulet/nev/burkolat/belm.) EHHEZ valasztjuk a legkozelebbrol.
  const anchor = anchorOverride ?? anchorPoint(items);

  const code = findRoomCode(items);

  // A nev / terulet / burkolat / belmagassag a KOD-horgonyhoz LEGKOZELEBBRE -
  // igy a szomszed helyiseg (nyitott ter) ertekeit nem huzzuk be. Ha nincs
  // pozicionalt talalat, visszaesunk a regi, joined-alapu keresesre.
  const nameHit = nearest(
    items
      .filter((it) => ROOM_NAME_KEYWORDS.some((k) => it.text.toUpperCase().includes(k)))
      .map((it) => ({ value: it.text.trim(), x: it.x, y: it.y })),
    anchor
  );
  const name = nameHit?.value ?? findRoomName(items);

  const printedFloorAreaM2 = nearest(areaCandidates(items), anchor)?.value ?? findFloorArea(joined);
  const ceilingHeightM = nearest(ceilingCandidates(items), anchor)?.value ?? findCeilingHeight(joined);

  const finishHit = nearest(
    items
      .map((it) => {
        const lower = it.text.toLowerCase();
        const f = FLOOR_FINISHES.filter((x) => lower.includes(x)).sort((a, b) => b.length - a.length)[0];
        return f ? { value: f, x: it.x, y: it.y } : null;
      })
      .filter((v): v is { value: string; x: number; y: number } => v !== null),
    anchor
  );
  const floorFinish = finishHit?.value ?? findFloorFinish(joined);

  const fieldSources: PlanAnalysisResult["fieldSources"] = {};
  const warnings: string[] = [];

  // Minden megtalalt ertek forrasa PRINTED (a terven kiirt szoveg).
  if (code) fieldSources.code = "PRINTED";
  if (name) fieldSources.name = "PRINTED";
  if (printedFloorAreaM2 !== null) fieldSources.printedFloorAreaM2 = "PRINTED";
  if (ceilingHeightM !== null) fieldSources.ceilingHeightM = "PRINTED";
  if (floorFinish) fieldSources.floorFinish = "PRINTED";

  if (!name) warnings.push("A helyiség neve nem volt egyértelműen olvasható a kijelölésből.");
  if (printedFloorAreaM2 === null) warnings.push("Nem találtam alapterületet (pl. „4,33 m²”) a kijelölt részen.");
  if (ceilingHeightM === null) warnings.push("Nem találtam belmagasságot (pl. „bm = 270 cm”).");
  if (!floorFinish) warnings.push("Nem ismertem fel padlóburkolatot.");
  if (!items.length) warnings.push("A kijelölt részen nem volt kiolvasható szöveg. Lehet, hogy szkennelt terv – próbáld nagyobb kijelöléssel.");

  // Biztonsag: mennyi az 5 mezobol megvan. A nev es a terulet a legfontosabb.
  const foundCount = [code, name, printedFloorAreaM2, ceilingHeightM, floorFinish].filter(
    (value) => value !== null && value !== undefined
  ).length;
  const confidence = items.length === 0 ? 0 : Math.min(0.99, 0.2 + foundCount * 0.16);

  return {
    room: { code, name, printedFloorAreaM2, ceilingHeightM, floorFinish },
    fieldSources,
    confidence,
    warnings
  };
}
