import { cache } from "react";
import type { AppRole, UserRole } from "@/types";
import { getServerSupabaseClient } from "@/lib/supabase/server";

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

// Ha nincs profiles sor (vagy nincs Supabase / nincs bejelentkezés: demo-mód),
// a korábbi viselkedést tartjuk meg. Szándékosan NEM "viewer": ez a lépcső nem
// vehet el jogot senkitől, különben egy hiányzó profiles sor kizárná a saját
// felhasználóinkat a működésből. A 20260727090000 migráció minden létező
// Auth-felhasználóhoz létrehozza a profilt, tehát ez éles úton nem fut le.
export const FALLBACK_WORKFLOW_ROLE: UserRole = "project_manager";

export type CurrentUser = {
  authUserId: string;
  email: string;
  profileId: string | null;
  displayName: string;
  /** null, ha nincs hozzá profiles sor (lásd FALLBACK_WORKFLOW_ROLE). */
  role: AppRole | null;
  workflowRole: UserRole;
};

type ProfileRow = {
  id: string;
  display_name: string | null;
  role: AppRole | null;
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

  // maybeSingle: nincs profil -> null, nem hiba. A select hibázhat is (pl. ha a
  // 20260727090000 migráció még nem futott le), ezt is profil nélküli esetként
  // kezeljük, hogy az app soha ne álljon meg egy hiányzó jogosultság miatt.
  const { data: profile } = await supabase
    .from("profiles")
    .select("id,display_name,role")
    .eq("auth_user_id", authUser.id)
    .maybeSingle();

  const row = (profile as ProfileRow | null) || null;
  const role = row?.role || null;

  return {
    authUserId: authUser.id,
    email: authUser.email || "",
    profileId: row?.id || null,
    displayName: row?.display_name || authUser.email?.split("@")[0] || "Ismeretlen felhasználó",
    role,
    workflowRole: role ? workflowRoleByAppRole[role] : FALLBACK_WORKFLOW_ROLE
  };
});

/** A hibák állapotmozgatásához használt tényleges szerep. */
export async function getCurrentWorkflowRole(): Promise<UserRole> {
  const user = await getCurrentUser();
  return user?.workflowRole || FALLBACK_WORKFLOW_ROLE;
}
