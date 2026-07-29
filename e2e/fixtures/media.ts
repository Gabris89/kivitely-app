/**
 * Teszt-fajlok kodbol generalva.
 *
 * Szandekosan nincs binaris fixture a repoban: egy 1x1-es PNG base64-kent
 * elfer egy sorban, es igy nem kell kepfajlokat verziokovetni.
 */

/** 1x1 pixeles, ervenyes PNG. */
const ONE_PIXEL_PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

/**
 * Playwright setInputFiles-hoz keszen allo fajl-leiro.
 * @param name a feltoltendo fajl neve (a futas-azonositot erdemes beletenni)
 */
export function pngUpload(name = "e2e-teszt-kep.png") {
  return {
    name,
    mimeType: "image/png",
    buffer: Buffer.from(ONE_PIXEL_PNG_BASE64, "base64")
  };
}

/**
 * Egyedi futas-azonosito. Minden teszt-futas sajat jelolest kap, igy a
 * letrehozott rekordok raneztre azonosithatok es keresehetok, ha egy
 * takaritas valamiert elmaradna.
 */
export const RUN_ID = `e2e-${Date.now().toString(36)}`;

/** Egysegesen jelolt cim a letrehozott teszt-rekordokhoz. */
export function marked(label: string) {
  return `[${RUN_ID}] ${label}`;
}
