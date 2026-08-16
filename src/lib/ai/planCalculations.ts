import type { PlanAnalysisResult } from "@/types";

/**
 * Munkanem-mennyiseg szabaly-motor.
 *
 * A kovetelmeny szerint a MATEMATIKA a backenden tortenik, nem az AI-ban: az
 * elemzo strukturalt alapadatot ad (padlo-terulet, belmagassag), a szarmaztatott
 * mennyisegeket (fal, labazat, alapozas, ...) mi szamoljuk DETERMINISTA
 * szabalyokbol - ellenorizheto, reprodukalhato, ingyenes.
 *
 * A szabalyok Attila konvencioi. Amit szabalybol tudunk, az "CALCULATED"; amit
 * nem (elvedo, ora, nedves-helyiseg szabalyok), az "MANUAL" - a felmero adja meg.
 *
 * Verifikalva a Vasut utcai mintan:
 *   - Alapozas = Fal + Padlo   (pl. 15,2 + 2,9 = 18,1)
 *   - Feszmentesites = Padlo
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

/** A helyisegrol ismert alap-mennyisegek (a szabalyok bemenete). */
export type RoomMetrics = {
  /** Padlo alapterulet (a terven kiirt / felismert). */
  floorAreaM2: number | null;
  /** Kerulet - a fal/labazat/szalag KULCSA. Meresbol (korberajzolas) vagy
   *  kotabol jon; amig nincs, ezek a munkanemek nem szamolhatok. */
  perimeterM: number | null;
  ceilingHeightM: number | null;
};

/** Egy munkanem szarmaztatott mennyisege + honnan (auto szabaly / kezi). */
export type DerivedQuantity = { value: number | null; source: "CALCULATED" | "MANUAL" };

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Munkanemenkenti mennyiseg a szabalyokbol. Ahol az input hianyzik (pl. nincs
 *  kerulet), az adott munkanem null marad. */
export function deriveWorkQuantities(m: RoomMetrics): Record<WorkType, DerivedQuantity> {
  const padlo = m.floorAreaM2;
  const ker = m.perimeterM;
  const bm = m.ceilingHeightM;

  // Fal = kerulet x belmagassag (nyilaszaro-levonas kesobbi finomitas).
  const fal = ker !== null && bm !== null ? round2(ker * bm) : null;
  // Alapozas = a burkolt osszfelulet (fal + padlo) - verifikalt.
  const alapozas = fal !== null && padlo !== null ? round2(fal + padlo) : null;

  const calc = (value: number | null): DerivedQuantity => ({ value, source: "CALCULATED" });
  const manual: DerivedQuantity = { value: null, source: "MANUAL" };

  return {
    padlo: calc(padlo),
    feszmentesites: calc(padlo), // = padlo (verifikalt)
    fal: calc(fal), // kerulet x bm
    labazat: calc(ker), // fm = kerulet
    szalag: calc(ker), // fm = kerulet (padlo-fal el menten)
    alapozas: calc(alapozas), // fal + padlo
    kiegyenlites: manual, // gyakran = padlo, de nem mindig - egyelore kezi
    szigeteles: manual, // nedves-helyiseg szabaly (Attila) kell
    halozas: manual, // szabaly kell
    tapadohid: manual, // szabaly kell
    elvedo: manual, // burkolat-el hossza - kezi
    ora: manual // munkaora - kezi
  };
}

/** Az elemzes eredmenyebol keszit RoomMetrics-et. A kerulet a tarolt
 *  (felmero altal megadott / kotabol felkinalt) ertekbol jon; ha explicit
 *  kapunk, az felulirja. */
export function roomMetricsFromResult(result: PlanAnalysisResult, perimeterM?: number | null): RoomMetrics {
  return {
    floorAreaM2: result.room.printedFloorAreaM2,
    perimeterM: perimeterM ?? result.room.perimeterM ?? null,
    ceilingHeightM: result.room.ceilingHeightM
  };
}
