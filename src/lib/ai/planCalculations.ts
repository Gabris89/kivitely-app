import type { PlanAnalysisResult, RoomTakeoff, RoomTakeoffKind } from "@/types";

/**
 * Munkanem-mennyiseg szabaly-motor.
 *
 * A matematika a backenden tortenik (nem az AI-ban): az elemzo strukturalt
 * alapadatot ad (padlo-terulet, belmagassag), a felmero megad nehany dontest
 * (helyiseg-tipus, mennyezetig burkolt-e, kell-e kiegyenlites, nyilas-levonasok),
 * es ebbol szamoljuk a mennyisegeket DETERMINISTA szabalyokbol.
 *
 * A szabalyok Attila VALOS Excel-jebol lettek visszafejtve (Vasut utca):
 *   - Padlo   = alapterulet (csak ha a padlo hidegburkolt)
 *   - Fal     = kerulet x burkolasi_magassag - nyilaszaro-levonas   (teraszon nincs)
 *   - Alapozas= Fal + Padlo    (verifikalt: 15,2+2,9=18,1; 18,9+3,9=22,8; ...)
 *   - Kiegyenl= Padlo          (verifikalt; de CSAK ha a felmero bejeloli)
 *   - Labazat = teraszon kerulet - ajtok; csempezett furdoben 0
 *
 * A tobbi (Halozas, Szigeteles, Szalag, Elvedo, Tapadohid, Ora, Feszmentesites)
 * NEM vezetheto le tisztan a geometriabol - ezek szakmai dontes -> MANUAL. A
 * felmero minden AUTO erteket FELULIRHAT (a takeoff.manual-on keresztul).
 */

export type WorkType =
  | "fal"
  | "padlo"
  | "labazat"
  | "alapozas"
  | "halozas"
  | "szigeteles"
  | "szalag"
  | "elvedo"
  | "tapadohid"
  | "ora"
  | "kiegyenlites"
  | "feszmentesites";

/** Egy munkanem mennyisege + a forras: AUTO (szabalybol) vagy MANUAL (kezi/felulirt). */
export type QuantitySource = "AUTO" | "MANUAL";
export type DerivedQuantity = { value: number | null; source: QuantitySource };

/** A szabaly-motor teljes bemenete: a geometria + a felmero dontesei. */
export type RoomMetrics = {
  floorAreaM2: number | null;
  /** Kerulet (m) - a fal/labazat KULCSA (meresbol/kotabol). */
  perimeterM: number | null;
  ceilingHeightM: number | null;
  roomKind: RoomTakeoffKind;
  floorTiled: boolean;
  tiledToCeiling: boolean;
  tilingHeightM: number | null;
  levelingNeeded: boolean;
  wallOpeningDeductM2: number | null;
  skirtingDeductM: number | null;
  /** Kezi tetel-ertekek + AUTO felulirasok (munkanem-kulcs -> mennyiseg). */
  manual: Record<string, number>;
};

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

const WORK_TYPES: WorkType[] = [
  "fal",
  "padlo",
  "labazat",
  "alapozas",
  "halozas",
  "szigeteles",
  "szalag",
  "elvedo",
  "tapadohid",
  "ora",
  "kiegyenlites",
  "feszmentesites"
];

/**
 * Munkanemenkenti mennyiseg. Az AUTO tetelek a szabalyokbol jonnek (ahol az input
 * hianyzik, az adott tetel null marad); a tobbi MANUAL. Vegul a felmero kezi
 * ertekei (takeoff.manual) FELULIRJAK az adott tetelt (forras: MANUAL).
 */
export function deriveWorkQuantities(m: RoomMetrics): Record<WorkType, DerivedQuantity> {
  const area = m.floorAreaM2;
  const ker = m.perimeterM;
  const isTerrace = m.roomKind === "terrace";
  const burkMag = m.tiledToCeiling ? m.ceilingHeightM : m.tilingHeightM;
  const openingDeduct = m.wallOpeningDeductM2 ?? 0;
  const skirtingDeduct = m.skirtingDeductM ?? 0;

  // Padlo: csak ha a padlo hidegburkolt (parketta/laminalt -> nincs padlo-tetel).
  const padlo = m.floorTiled ? area : null;

  // Fal: teraszon nincs; egyebkent kerulet x burkolasi_magassag - nyilas-levonas.
  const fal = isTerrace
    ? null
    : ker !== null && burkMag !== null
      ? round2(Math.max(0, ker * burkMag - openingDeduct))
      : null;

  // Alapozas: teraszon = padlo; egyebkent Fal + Padlo (verifikalt).
  const alapozas = isTerrace ? padlo : fal !== null && padlo !== null ? round2(fal + padlo) : null;

  // Labazat: teraszon kerulet - ajtok; csempezett furdo/wc-ben alapertelmezetten 0.
  const labazat = isTerrace ? (ker !== null ? round2(Math.max(0, ker - skirtingDeduct)) : null) : 0;

  // Kiegyenlites: = padlo, de CSAK ha a felmero bejeloli, hogy kell.
  const kiegyenlites = m.levelingNeeded ? padlo : null;

  const auto = (value: number | null): DerivedQuantity => ({ value, source: "AUTO" });
  const manualEmpty: DerivedQuantity = { value: null, source: "MANUAL" };

  const out: Record<WorkType, DerivedQuantity> = {
    padlo: auto(padlo),
    fal: auto(fal),
    labazat: auto(labazat),
    alapozas: auto(alapozas),
    kiegyenlites: auto(kiegyenlites),
    // A geometriabol nem levezetheto, szakmai dontes -> kezi.
    halozas: manualEmpty,
    szigeteles: manualEmpty,
    szalag: manualEmpty,
    elvedo: manualEmpty,
    tapadohid: manualEmpty,
    ora: manualEmpty,
    feszmentesites: manualEmpty
  };

  // Felulirasi reteg: a kezi ertek BARMELY tetelt felulir (forras MANUAL).
  for (const key of WORK_TYPES) {
    const manualVal = m.manual[key];
    if (manualVal !== undefined && manualVal !== null && Number.isFinite(manualVal)) {
      out[key] = { value: round2(manualVal), source: "MANUAL" };
    }
  }

  return out;
}

/** A nevbol kovetkeztetett helyiseg-tipus (a felmero felulirhatja). */
export function roomKindFromName(name: string | null): RoomTakeoffKind {
  const n = (name || "").toUpperCase();
  if (/FÜRDŐ|FURDO|\bWC\b|ZUHANY|MOSÓ|MOSO/.test(n)) return "wet";
  if (/TERASZ|ERKÉLY|ERKELY|LOGGIA|BALKON/.test(n)) return "terrace";
  return "other";
}

/** A burkolatbol kovetkeztetett "padlo hidegburkolt-e". Ismeretlennel a nedves/
 *  terasz helyisegeket burkoltnak vesszuk, egyebkent nem. */
export function floorTiledFromFinish(finish: string | null, kind: RoomTakeoffKind): boolean {
  const f = (finish || "").toLowerCase();
  if (/parketta|laminál|laminal|szőnyeg|szonyeg/.test(f)) return false;
  if (/greslap|gres|csempe|járólap|jarolap|kőporcelán|koporcelan|pvc|vinyl|beton|epoxi|terazzo/.test(f)) return true;
  return kind === "wet" || kind === "terrace";
}

/** Az elemzes eredmenyebol RoomMetrics: a tarolt takeoff-bol (ha van), kulonben
 *  a nevbol/burkolatbol szarmaztatott ertelmes alapertelmezesekbol. A perimeterM
 *  explicit felulirhato (pl. friss meresbol). */
export function roomMetricsFromResult(result: PlanAnalysisResult, perimeterM?: number | null): RoomMetrics {
  const room = result.room;
  const t = room.takeoff ?? undefined;
  const kind = t?.roomKind ?? roomKindFromName(room.name);
  return {
    floorAreaM2: room.printedFloorAreaM2,
    perimeterM: perimeterM ?? room.perimeterM ?? null,
    ceilingHeightM: room.ceilingHeightM,
    roomKind: kind,
    floorTiled: t?.floorTiled ?? floorTiledFromFinish(room.floorFinish, kind),
    tiledToCeiling: t?.tiledToCeiling ?? true,
    tilingHeightM: t?.tilingHeightM ?? null,
    levelingNeeded: t?.levelingNeeded ?? false,
    wallOpeningDeductM2: t?.wallOpeningDeductM2 ?? null,
    skirtingDeductM: t?.skirtingDeductM ?? null,
    manual: t?.manual ?? {}
  };
}

/** Ertelmes alap-takeoff egy elemzeshez (a UI innen indul; a felmero allitja). */
export function defaultTakeoff(result: PlanAnalysisResult): RoomTakeoff {
  const room = result.room;
  const kind = roomKindFromName(room.name);
  return {
    roomKind: kind,
    floorTiled: floorTiledFromFinish(room.floorFinish, kind),
    tiledToCeiling: true,
    tilingHeightM: null,
    levelingNeeded: false,
    wallOpeningDeductM2: null,
    skirtingDeductM: null,
    manual: {}
  };
}
