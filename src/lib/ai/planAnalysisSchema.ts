import type { PlanAnalysisResult, PlanValueSource, RoomTakeoff, RoomTakeoffKind } from "@/types";

/**
 * A tervelemzes strukturalt eredmenyenek KEZI validatora.
 *
 * Miert kezi, nem zod: nem akarunk uj fuggoseget csak ezert (AGENTS.md). Az
 * ellenorzes ket helyen kell:
 *   - a heurisztikus parser sajat kimenetere (biztonsag),
 *   - es kulonosen az AI (Gemini) valaszara: az AI kimenete SOHA nem megbizhato,
 *     szerver-oldalon kotelezoen validaljuk, mielott tovabbadjuk vagy elmentjuk.
 *
 * A validator "megtisztit": ismeretlen mezot eldob, rossz tipust null-ra tesz,
 * szamokat tartomanyra szorit. Sosem dob - a hibas reszek warningba kerulnek.
 */

const VALUE_SOURCES: PlanValueSource[] = ["PRINTED", "DIMENSION", "CALCULATED", "USER_ENTERED"];

function asStringOrNull(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function asPositiveNumberOrNull(value: unknown): number | null {
  const n = typeof value === "number" ? value : typeof value === "string" ? Number(value.replace(",", ".")) : NaN;
  return Number.isFinite(n) && n > 0 ? n : null;
}

function asSource(value: unknown): PlanValueSource | null {
  return VALUE_SOURCES.includes(value as PlanValueSource) ? (value as PlanValueSource) : null;
}

function asNonNegativeNumberOrNull(value: unknown): number | null {
  const n = typeof value === "number" ? value : typeof value === "string" ? Number(value.replace(",", ".")) : NaN;
  return Number.isFinite(n) && n >= 0 ? n : null;
}

function asBool(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function asRoomKind(value: unknown): RoomTakeoffKind {
  return value === "wet" || value === "terrace" || value === "other" ? value : "other";
}

function asManual(value: unknown): Record<string, number> {
  const out: Record<string, number> = {};
  if (value && typeof value === "object") {
    for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
      const n = typeof raw === "number" ? raw : Number(String(raw).replace(",", "."));
      if (Number.isFinite(n)) out[key] = n;
    }
  }
  return out;
}

/** A felmeresi takeoff-blokk megtisztitasa (a felmero bemenetei). Ha nincs, undefined. */
function asTakeoff(value: unknown): RoomTakeoff | undefined {
  if (!value || typeof value !== "object") return undefined;
  const o = value as Record<string, unknown>;
  return {
    roomKind: asRoomKind(o.roomKind),
    floorTiled: asBool(o.floorTiled, false),
    tiledToCeiling: asBool(o.tiledToCeiling, true),
    tilingHeightM: asPositiveNumberOrNull(o.tilingHeightM),
    levelingNeeded: asBool(o.levelingNeeded, false),
    wallOpeningDeductM2: asNonNegativeNumberOrNull(o.wallOpeningDeductM2),
    skirtingDeductM: asNonNegativeNumberOrNull(o.skirtingDeductM),
    manual: asManual(o.manual)
  };
}

function clampConfidence(value: unknown): number {
  const n = typeof value === "number" ? value : NaN;
  if (!Number.isFinite(n)) return 0;
  return Math.min(1, Math.max(0, n));
}

/**
 * Barmilyen (parser vagy AI) nyers objektumot ervenyes PlanAnalysisResult-ta
 * tisztit. A visszaadott ertek mindig hasznalhato - a hianyzo/hibas reszek
 * null-ok es warningok.
 */
export function validatePlanAnalysisResult(raw: unknown): PlanAnalysisResult {
  const input = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const roomInput = (input.room && typeof input.room === "object" ? input.room : {}) as Record<string, unknown>;

  const room: PlanAnalysisResult["room"] = {
    code: asStringOrNull(roomInput.code),
    name: asStringOrNull(roomInput.name),
    printedFloorAreaM2: asPositiveNumberOrNull(roomInput.printedFloorAreaM2),
    ceilingHeightM: asPositiveNumberOrNull(roomInput.ceilingHeightM),
    floorFinish: asStringOrNull(roomInput.floorFinish),
    takeoff: asTakeoff(roomInput.takeoff),
    widthM: asPositiveNumberOrNull(roomInput.widthM),
    depthM: asPositiveNumberOrNull(roomInput.depthM),
    perimeterM: asPositiveNumberOrNull(roomInput.perimeterM)
  };

  // Mezonkenti forras: csak ervenyes forras-ertekek maradnak.
  const fieldSources: PlanAnalysisResult["fieldSources"] = {};
  const rawSources = (input.fieldSources && typeof input.fieldSources === "object" ? input.fieldSources : {}) as Record<string, unknown>;
  for (const [key, value] of Object.entries(rawSources)) {
    const source = asSource(value);
    if (source) fieldSources[key] = source;
  }

  const warnings = Array.isArray(input.warnings)
    ? input.warnings.filter((w): w is string => typeof w === "string")
    : [];

  return {
    room,
    fieldSources,
    confidence: clampConfidence(input.confidence),
    warnings
  };
}
