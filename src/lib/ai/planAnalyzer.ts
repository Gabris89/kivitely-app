import type { PlanAnalysisResult, PlanCalculationType, PlanTextItem } from "@/types";
import { analyzeTextItems } from "@/lib/ai/heuristicPlanAnalyzer";
import { validatePlanAnalysisResult } from "@/lib/ai/planAnalysisSchema";

/**
 * Provider-fuggetlen tervelemzo reteg.
 *
 * A kerelem szerint: az AI provider csereheto legyen, es a hivas SZERVER-oldalon
 * tortenjen (az AI-kulcs sosem kerul frontendbe). Ez a modul csak szerverrol
 * hivodik (API route-ok), es mindig a schema-validatoron at adja vissza az
 * eredmenyt - meg a sajat heurisztikus parsere kimenetet is megtisztitja.
 */

export type PlanAnalyzeInput = {
  calculationType: PlanCalculationType;
  /** A kliens a pdf.js text-layerbol gyujti ossze a kijelolt regioban. */
  textItems: PlanTextItem[];
  /** Opcionalis: a canvasbol vagott PNG (base64) a vision-fallbackhez. */
  imageBase64?: string;
  /** Opcionalis: a helyiseg pontos horgony-pozicioja (normalizalt). A kliens a
   *  kereseskor tudja; ehhez valasztjuk a mezoket a legkozelebbrol (a kod
   *  ismetlodik a lakasban, ezert a szerver-oldali talalgatas tevedhet). */
  anchor?: { x: number; y: number };
};

export interface AiPlanAnalyzer {
  readonly name: string;
  analyze(input: PlanAnalyzeInput): Promise<PlanAnalysisResult>;
}

/** Az MVP alap-elemzoje: determinista, ingyenes, AI nelkul. */
const heuristicAnalyzer: AiPlanAnalyzer = {
  name: "heuristic",
  async analyze(input) {
    return validatePlanAnalysisResult(analyzeTextItems(input.textItems, input.anchor));
  }
};

/**
 * A confidence-kuszob, ami alatt (ha van AI-kulcs) a vision-fallback bekapcsol.
 * Az MVP-ben nincs Gemini-ag bekotve, igy ez ma csak a hatarpontot dokumentalja.
 */
const VISION_FALLBACK_THRESHOLD = 0.55;

/**
 * A hasznalando elemzo kivalasztasa. MVP-ben mindig a heurisztikus parser.
 *
 * Bovitesi pont (kesobb, kulon jovahagyassal): ha `process.env.GEMINI_API_KEY`
 * letezik, egy kompozit elemzot adunk vissza, ami eloszor a heurisztikus parsert
 * futtatja, es CSAK akkor hivja a Gemini vision-agat, ha a confidence a
 * VISION_FALLBACK_THRESHOLD alatt van. A `geminiPlanAnalyzer` modult ilyenkor
 * DINAMIKUSAN importaljuk, hogy a `@google/generative-ai` fuggoseg ne kelljen az
 * MVP-hez. A kulcs kizarolag szerver-oldalon olvasott env - sosem frontend.
 */
export function getPlanAnalyzer(): AiPlanAnalyzer {
  return heuristicAnalyzer;
}

export { VISION_FALLBACK_THRESHOLD };
