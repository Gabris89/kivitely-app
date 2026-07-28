import { NextResponse } from "next/server";
import { getCurrentUser, getCurrentWorkflowRole } from "@/lib/currentUser";
import { isAuthConfigured } from "@/lib/supabase/server";
import { buildPermissionFlags } from "@/lib/permissions";
import { getVisibilityScope } from "@/lib/visibility";

/**
 * Diagnosztikai vegpont a jogosultsagok teszteleséhez.
 *
 * Csak a HIVO SAJAT adatait adja vissza, semmilyen kulcsot vagy titkot nem.
 * A Supabase projekt-azonositot a NEXT_PUBLIC_ URL-bol vesszuk, ami amugy is
 * publikus. Nyugodtan bennmaradhat, de barmikor torolheto.
 */

export const dynamic = "force-dynamic";

const BUILD_MARKER = "jogosultsag-3-lepcso";

function supabaseProjectRef(): string | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  if (!url) return null;
  try {
    return new URL(url).hostname.split(".")[0];
  } catch {
    return null;
  }
}

export async function GET() {
  const user = await getCurrentUser();
  const workflowRole = await getCurrentWorkflowRole();
  const flags = buildPermissionFlags(workflowRole);
  // A latasi kor is ide kerul, hogy egyetlen hivassal ellenorizheto legyen a
  // 3. lepcso: mennyi projektet lat a fiok, es van-e ceg-szures. Csak sajat
  // adat, es csak darabszam - a projekt-azonositokat nem adjuk ki.
  const scope = await getVisibilityScope();

  return NextResponse.json({
    buildMarker: BUILD_MARKER,
    authConfigured: isAuthConfigured(),
    supabaseProjectRef: supabaseProjectRef(),
    loggedIn: Boolean(user),
    email: user?.email || null,
    dbRole: user?.role || null,
    workflowRole,
    isActive: user?.isActive ?? null,
    subcontractorId: user?.subcontractorId || null,
    visibility: {
      unrestricted: scope.unrestricted,
      projectCount: scope.projectIds?.length ?? null,
      subcontractorFiltered: Boolean(scope.subcontractorId)
    },
    canDeleteProject: flags["project.delete"],
    canUpdateProject: flags["project.update"],
    canCreateIssue: flags["issue.create"],
    canUploadEvidence: flags["evidence.create"],
    canViewMoney: flags["money.view"]
  });
}
