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

export function analyzeTextItems(items: PlanTextItem[]): PlanAnalysisResult {
  const joined = items.map((item) => item.text).join("  ");

  const code = findRoomCode(items);
  const name = findRoomName(items);
  const printedFloorAreaM2 = findFloorArea(joined);
  const ceilingHeightM = findCeilingHeight(joined);
  const floorFinish = findFloorFinish(joined);

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
