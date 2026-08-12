import type { PlanAnalysisResult, PlanValueSource } from "@/types";

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
    floorFinish: asStringOrNull(roomInput.floorFinish)
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
