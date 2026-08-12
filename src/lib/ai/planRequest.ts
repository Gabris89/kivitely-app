import type { PlanCalculationType, PlanSelectionRect, PlanTextItem } from "@/types";

/**
 * Az /analyze es /analyses vegpontok bemenetenek megtisztitasa.
 *
 * A kliens kuldi a normalizalt kijelolest es a pdf.js text-layerbol kigyujtott
 * text-itemeket. Ezek nem megbizhatok (barmilyen body johet), ezert a
 * hasznalat elott szerver-oldalon validaljuk: rossz tipus -> null/kihagyas.
 */

const CALCULATION_TYPES: PlanCalculationType[] = ["room_info"];

export function asCalculationType(value: unknown): PlanCalculationType {
  return CALCULATION_TYPES.includes(value as PlanCalculationType) ? (value as PlanCalculationType) : "room_info";
}

/** Normalizalt teglalap: x,y a bal-felso sarok, w,h a szelesseg/magassag.
 *  A koordinatak a szelesseghez normalizaltak (mint a meresnel), igy portret
 *  lapon y/h > 1 is lehet. Csak a nem-veges/nyilvanvaloan hibas erteket dobjuk. */
export function parseSelection(value: unknown): PlanSelectionRect | null {
  if (!value || typeof value !== "object") return null;
  const rect = value as Record<string, unknown>;
  const x = Number(rect.x);
  const y = Number(rect.y);
  const w = Number(rect.w);
  const h = Number(rect.h);
  if (![x, y, w, h].every((n) => Number.isFinite(n))) return null;
  if (w <= 0 || h <= 0) return null;
  if (x < -0.05 || x > 1.05 || y < -0.05 || y > 20) return null;
  return { x, y, w, h };
}

/** A text-itemek megtisztitasa: csak {text:string, x,y:number} marad, felso
 *  korlattal (nem fogadunk el korlatlan meretu payloadot). */
export function parseTextItems(value: unknown): PlanTextItem[] {
  if (!Array.isArray(value)) return [];
  const items: PlanTextItem[] = [];
  for (const raw of value) {
    if (items.length >= 500) break;
    if (!raw || typeof raw !== "object") continue;
    const item = raw as Record<string, unknown>;
    const text = typeof item.text === "string" ? item.text : "";
    const x = Number(item.x);
    const y = Number(item.y);
    if (!text.trim() || !Number.isFinite(x) || !Number.isFinite(y)) continue;
    items.push({ text: text.slice(0, 200), x, y });
  }
  return items;
}
