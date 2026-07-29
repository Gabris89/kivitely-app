import type { APIRequestContext, Browser, BrowserContext } from "@playwright/test";
import { storageStatePath, type RoleKey } from "../accounts";

/**
 * Bejelentkezett kontextusok szerepenkent.
 *
 * A munkameneteket a globalSetup keszitette el (egyszer, a futas elejen), ezert
 * itt mar csak betoltjuk oket - nincs ujra-belepes tesztenkent.
 *
 * Ket alak van, mert ket fajta allitas kell:
 *   - browserContextFor: amikor a FELULETET nezzuk (mit lat a listan)
 *   - apiContextFor:     amikor a SZERVERT kerdezzuk kozvetlenul (HTTP statusz)
 *
 * Az API-alak fontos: az elrejtett gomb nem vedelem. Egy gomb hianyzhat a
 * feluleten, mikozben a vegpont valojaban kiszolgalja a kerest - ezt csak
 * kozvetlen hivassal lehet elkapni.
 */

export async function browserContextFor(browser: Browser, role: RoleKey): Promise<BrowserContext> {
  return browser.newContext({ storageState: storageStatePath(role) });
}

type PlaywrightRequest = { request: { newContext(options: Record<string, unknown>): Promise<APIRequestContext> } };

export async function apiContextFor(
  playwright: PlaywrightRequest,
  role: RoleKey,
  baseURL: string
): Promise<APIRequestContext> {
  return playwright.request.newContext({ baseURL, storageState: storageStatePath(role) });
}
