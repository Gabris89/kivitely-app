import { cache } from "react";
import type { AppRole, UserRole } from "@/types";
import { getServerSupabaseClient, isAuthConfigured } from "@/lib/supabase/server";

// ── "Ki vagyok én" ─────────────────────────────────────────────────────────
// A jogosultsági munka 1. lépcsője (docs/permissions-plan.md). Ez a modul az
// EGYETLEN hely, ahol az app eldönti, ki a bejelentkezett felhasználó és milyen
// szerepben van. Eddig ilyen hely nem volt: a kód mindenhol a hardkódolt
// "project_manager" szerepet használta, ezért a workflow-szabályok tesztelése
// értelmetlen volt (mindenki a legmagasabb jogú szerepként viselkedett).
//
// Ez a lépcső még NEM korlátoz semmit azon túl, hogy a hibák állapotmozgatása
// mostantól a valódi szerepre fut. A tényleges tiltás (mit lát / mit írhat egy
// szerep, projekt-hatókör, RLS) a 2-4. lépcső.

/** DB app_role -> a workflow.ts szűkebb szerepkészlete. */
const workflowRoleByAppRole: Record<AppRole, UserRole> = {
  admin: "admin",
  // A munkáltató (cégtulajdonos) üzletileg mindent jóváhagyhat a saját cége
  // adatain, ezért a workflow szempontjából admin-ekvivalens.
  employer: "admin",
  project_manager: "project_manager",
  site_manager: "site_manager",
  // A workflow.ts-ben nincs külön "worker" szerep. A saját munkavállaló és a
  // külsős alvállalkozó a FOLYAMATBAN ugyanazt csinálja (elkezdi a munkát,
  // készre jelenti), ezért egyelőre azonos átmeneteket kap. A kettő közti
  // különbség (láthatóság, árak) a 2-3. lépcsőben válik el.
  worker: "subcontractor",
  subcontractor: "subcontractor",
  viewer: "viewer"
};

export const appRoleLabels: Record<AppRole, string> = {
  admin: "Adminisztrátor",
  employer: "Munkáltató",
  project_manager: "Projektvezető",
  site_manager: "Építésvezető",
  worker: "Munkavállaló",
  subcontractor: "Alvállalkozó",
  viewer: "Megtekintő"
};

/**
 * Fail-closed alapállás: ha van Auth, de a felhasználóhoz nem tartozik érvényes
 * profil (nincs sor, letiltott fiók, vagy nem sikerült lekérdezni), akkor a
 * LEGSZŰKEBB jogot kapja, nem a legtágabbat. Egy hiányzó jogosultsági adat
 * soha nem eredményezhet több jogot – ez a "secure by default" alapszabály.
 */
export const NO_PROFILE_WORKFLOW_ROLE: UserRole = "viewer";

/**
 * Supabase nélküli demo/mock mód: nincs bejelentkezés és nincs védendő valódi
 * adat sem, ilyenkor az app maradjon végigkattinthatóan használható.
 * FIGYELEM: ez kizárólag akkor él, ha nincs Supabase konfigurálva
 * (isAuthConfigured() === false). Élesben soha nem fut le.
 */
export const DEMO_WORKFLOW_ROLE: UserRole = "project_manager";

export type CurrentUser = {
  authUserId: string;
  email: string;
  profileId: string | null;
  displayName: string;
  /** null, ha nincs hozzá profiles sor. */
  role: AppRole | null;
  /**
   * Melyik alvállalkozó céghez tartozik ez a belépés (`profiles.subcontractor_id`).
   * Ez dönti el, hogy egy hiba a „sajátja”-e: `issues.subcontractor_id` egyezés.
   * `null` esetén egyetlen hiba sem számít sajátnak – ez a fail-closed alapállás,
   * nem hiányzó adat miatti kivétel.
   */
  subcontractorId: string | null;
  /** false: letiltott fiók (profiles.is_active). A workflow-ban viewer-ként viselkedik. */
  isActive: boolean;
  workflowRole: UserRole;
};

type ProfileRow = {
  id: string;
  display_name: string | null;
  role: AppRole | null;
  is_active: boolean | null;
  email: string | null;
  subcontractor_id: string | null;
};

/**
 * A bejelentkezett felhasználó azonossága és szerepe.
 * `cache`: kérésenként egyszer fut le, akárhány komponens kéri el.
 * `null`, ha nincs bejelentkezés vagy nincs Supabase (mock/demo mód).
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const supabase = await getServerSupabaseClient();
  if (!supabase) return null;

  const { data, error } = await supabase.auth.getUser();
  const authUser = data?.user;
  if (error || !authUser) return null;

  // A saját profilt egy security definer függvényen keresztül kérjük el
  // (20260727140000 migráció), nem közvetlen tábla-lekérdezéssel. Így a
  // profiles táblán MÁSOK szerepe/e-mailje olvashatatlan maradhat: a függvény
  // definíció szerint csak a hívó saját sorát adja vissza.
  const { data: rows, error: profileError } = await supabase.rpc("current_user_profile");

  if (profileError) {
    // Nem dobunk: a hiányzó jogosultsági adat nem állíthatja meg az appot.
    // A fail-closed fallback miatt ilyenkor a legszűkebb jogot kapja.
    console.error("current_user_profile() sikertelen:", profileError.message);
  }

  const row = (Array.isArray(rows) ? (rows[0] as ProfileRow | undefined) : undefined) || null;
  const isActive = row ? row.is_active !== false : false;
  const role = row?.role || null;

  return {
    authUserId: authUser.id,
    email: row?.email || authUser.email || "",
    profileId: row?.id || null,
    displayName: row?.display_name || authUser.email?.split("@")[0] || "Ismeretlen felhasználó",
    role,
    subcontractorId: row?.subcontractor_id || null,
    isActive,
    // Letiltott fiók = nincs érvényes szerep. Ez az "azonnali kikapcsoló"
    // gomb: elég a profiles.is_active-ot false-ra állítani.
    workflowRole: role && isActive ? workflowRoleByAppRole[role] : NO_PROFILE_WORKFLOW_ROLE
  };
});

/** A hibák állapotmozgatásához használt tényleges szerep. */
export async function getCurrentWorkflowRole(): Promise<UserRole> {
  const user = await getCurrentUser();
  if (user) return user.workflowRole;
  // Nincs bejelentkezett felhasználó. Ha van Auth konfigurálva, ez tényleges
  // hiányzó azonosság -> fail-closed. Ha nincs, akkor demo-mód.
  return isAuthConfigured() ? NO_PROFILE_WORKFLOW_ROLE : DEMO_WORKFLOW_ROLE;
}
