import { cache } from "react";
import { getCurrentUser } from "@/lib/currentUser";
import { getServerSupabaseClient, isAuthConfigured } from "@/lib/supabase/server";

// ── Mit LÁT a bejelentkezett felhasználó ────────────────────────────────────
// A jogosultsági munka 3. lépcsője (docs/permissions-plan.md).
//
// A 2. lépcső csak azt szabályozta, mit ÍRHAT egy szerep. Az olvasás továbbra
// is korlátlan volt: egy alvállalkozó a /issues listán az összes projekt összes
// hibáját látta, más cégek munkáját is. Ez a modul zárja be ezt a rést.
//
// A szabály (B változat, a felhasználó döntése alapján):
//
//   admin, project_manager   -> minden projekt, minden hiba
//   site_manager, viewer     -> csak a tagsági projektjeik, azokban minden hiba
//   subcontractor            -> csak a tagsági projektjeik, azokban csak a
//                               saját cégük hibái
//
// FONTOS: ez alkalmazás-szintű szűrés, NEM adatbázis-szintű (RLS). Aki a
// Supabase kulccsal közvetlenül kérdezi az API-t, egyelőre továbbra is mindent
// lát. Az RLS a 4. lépcső, és kötelező, mielőtt bármilyen külsős fiók kap
// belépést. Ez a modul addig is megszünteti a felületen látható szivárgást.

export type VisibilityScope = {
  /**
   * true: semmilyen szűkítés nincs (admin, projektvezető, vagy Supabase
   * nélküli demo mód). Ilyenkor a `projectIds` értéke null.
   */
  unrestricted: boolean;
  /**
   * Csak ezeknek a projekteknek az adatai láthatók (projects.id, azaz DB uuid,
   * nem PRJ-xxx publicId). Üres tömb = egyetlen projekt sem látható.
   * `unrestricted === true` esetén null.
   */
  projectIds: string[] | null;
  /**
   * Csak ennek az alvállalkozó cégnek a hibái láthatók
   * (issues.subcontractor_id egyezés). null = nincs cég-szűrés.
   */
  subcontractorId: string | null;
};

const UNRESTRICTED: VisibilityScope = {
  unrestricted: true,
  projectIds: null,
  subcontractorId: null
};

/**
 * Fail-closed alapállás: ha nem tudjuk biztosan, mit láthat valaki, akkor
 * semmit nem lát. Hiányzó jogosultsági adat soha nem adhat több jogot.
 */
const DENY_ALL: VisibilityScope = {
  unrestricted: false,
  projectIds: [],
  subcontractorId: null
};

/** Azok a szerepek, amelyek a teljes portfóliót látják, tagság nélkül is. */
const PORTFOLIO_ROLES = new Set(["admin", "employer", "project_manager"]);

/**
 * A kérés látási köre. `cache`: kérésenként egyszer fut le, akárhány
 * repository-függvény kéri el (egy oldalbetöltés több listát is hív).
 */
export const getVisibilityScope = cache(async (): Promise<VisibilityScope> => {
  // Supabase nélküli demo/mock mód: nincs valódi adat, nincs mit védeni, és az
  // app maradjon végigkattinthatóan használható. Élesben soha nem fut le.
  if (!isAuthConfigured()) return UNRESTRICTED;

  const supabase = await getServerSupabaseClient();
  if (!supabase) return DENY_ALL;

  const user = await getCurrentUser();
  // Nincs bejelentkezés, vagy letiltott fiók (profiles.is_active = false).
  if (!user || !user.isActive || !user.role) return DENY_ALL;

  if (PORTFOLIO_ROLES.has(user.role)) return UNRESTRICTED;

  // A tagsági listát security definer függvény adja (20260728120000 migráció),
  // nem közvetlen project_members lekérdezés. Így a tábla olvashatatlan
  // maradhat: ki melyik projekten dolgozik, az maga is üzleti információ.
  const { data, error } = await supabase.rpc("current_user_project_ids");

  if (error) {
    // Nem dobunk: a jogosultsági lekérdezés hibája nem állíthatja meg az appot.
    // De fail-closed: inkább ne lásson semmit, mint hogy mindent lásson.
    console.error("current_user_project_ids() sikertelen:", error.message);
    return DENY_ALL;
  }

  const projectIds = Array.isArray(data) ? (data as unknown[]).map(String).filter(Boolean) : [];

  if (user.workflowRole !== "subcontractor") {
    // Építésvezető / megtekintő: a tagsági projektjeikben MINDEN hibát látnak,
    // más cégek munkáját is – nekik ez a dolguk (koordináció, átvétel).
    return { unrestricted: false, projectIds, subcontractorId: null };
  }

  // Alvállalkozó céghez nem rendelt fiók: nem tudjuk megmondani, mi a "sajátja",
  // ezért semmit nem lát. Ez nem hibaállapot-kivétel, hanem a fail-closed
  // alapállás – a javítás a profiles.subcontractor_id kitöltése.
  if (!user.subcontractorId) return DENY_ALL;

  return { unrestricted: false, projectIds, subcontractorId: user.subcontractorId };
});

/** true, ha a scope egyetlen projektet sem enged – ilyenkor minden lista üres. */
export function isEmptyScope(scope: VisibilityScope) {
  return !scope.unrestricted && (scope.projectIds?.length ?? 0) === 0;
}

/** Látható-e ez a konkrét projekt (projects.id, DB uuid)? */
export function scopeAllowsProject(scope: VisibilityScope, projectDbId: string) {
  if (scope.unrestricted) return true;
  return (scope.projectIds || []).includes(projectDbId);
}
