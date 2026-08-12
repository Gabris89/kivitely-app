import type { PlanAnalysisResult } from "@/types";

/**
 * Mennyiseg-szamito motor.
 *
 * A kovetelmeny szerint a MATEMATIKA a Kivitely backendjen tortenik, nem az AI-ban:
 * az elemzo csak strukturalt (kiirt/mert) alapadatot ad, a szarmaztatott ertekeket
 * (falfelulet, kerulet, festendo felulet...) mi szamoljuk determinisztikusan, hogy
 * ellenorizheto es reprodukalhato legyen.
 *
 * MVP (1. iteracio): a "room_info" csak kiirt ertekeket olvas ki, geometriat meg
 * nem szamolunk (nincs helyiseg-korvonal/nyilaszaro felismeres - az iter2). Ez a
 * modul most a belepesi pontot es a tipusokat rogziti, hogy az iter2 ne az
 * architekturat, csak a torzset toltse.
 */

export type PlanDerivedQuantities = {
  /** Brutto falfelulet (kerulet * belmagassag) - iter2, meg nem szamoljuk. */
  grossWallAreaM2: number | null;
  /** Netto falfelulet (brutto - nyilaszarok) - iter2. */
  netWallAreaM2: number | null;
  /** Padlofelulet - MVP-ben a kiirt alapterulettel egyenlo, ha van. */
  floorAreaM2: number | null;
};

/**
 * A strukturalt elemzesbol szarmaztatott mennyisegek. MVP-ben csak a padlofeluletet
 * "szamoljuk" (= a kiirt alapterulet), a tobbi null + a hianyat a hivo jelzi.
 */
export function deriveQuantities(result: PlanAnalysisResult): PlanDerivedQuantities {
  return {
    grossWallAreaM2: null,
    netWallAreaM2: null,
    floorAreaM2: result.room.printedFloorAreaM2
  };
}
