import { NextResponse } from "next/server";
import type { UserRole } from "@/types";
import { getCurrentWorkflowRole } from "@/lib/currentUser";
import { isAuthConfigured } from "@/lib/supabase/server";
import {
  buildPermissionFlags,
  can,
  permissionDeniedMessage,
  type PermissionAction,
  type PermissionFlags
} from "@/lib/permissions";

/**
 * Szerver-oldali jogosultsag-ellenorzes. Ket retegben hasznaljuk:
 *
 * 1. API route eleje: `checkPermission()` -> azonnali 403 ertheto uzenettel.
 * 2. repository.ts iras-fuggvenyek eleje: `requirePermission()` -> dob.
 *
 * A masodik reteg a lenyeg: minden adatbazis-iras ezen a ponton megy at,
 * igy egy uj route sem tudja veletlenul kihagyni az ellenorzest.
 */

/** Minden 403-as, jogosultsagi jellegu elutasitas kozos ose. */
export class ForbiddenError extends Error {
  readonly status = 403;

  constructor(message: string) {
    super(message);
    this.name = "ForbiddenError";
  }
}

export class PermissionError extends ForbiddenError {
  readonly action: PermissionAction;
  readonly role: UserRole;

  constructor(action: PermissionAction, role: UserRole) {
    super(permissionDeniedMessage(action, role));
    this.name = "PermissionError";
    this.action = action;
    this.role = role;
  }
}

/**
 * Demo mod: ha nincs Supabase konfiguralva, nincs valodi identitas sem,
 * es az app csak a mock adatokon dolgozik - ilyenkor nincs mit vedeni.
 * Ez env-valtozo alapu dontes, nem futasi hiba miatti visszaeses.
 */
function isEnforced() {
  return isAuthConfigured();
}

/** Dob, ha a bejelentkezett szerep nem vegezheti el a muveletet. */
export async function requirePermission(action: PermissionAction): Promise<UserRole> {
  const role = await getCurrentWorkflowRole();
  if (!isEnforced()) return role;
  if (!can(role, action)) throw new PermissionError(action, role);
  return role;
}

/** Nem dob - a hivo dont. */
export async function hasPermission(action: PermissionAction): Promise<boolean> {
  if (!isEnforced()) return true;
  return can(await getCurrentWorkflowRole(), action);
}

/**
 * API route-ok elejere: ha nincs jog, kesz 403-as valasz jon vissza,
 * kulonben null es a route fut tovabb.
 */
export async function checkPermission(action: PermissionAction): Promise<NextResponse | null> {
  const role = await getCurrentWorkflowRole();
  if (!isEnforced()) return null;
  if (can(role, action)) return null;
  return NextResponse.json({ error: permissionDeniedMessage(action, role) }, { status: 403 });
}

/**
 * Ha egy repository hivas ForbiddenError-t (pl. PermissionError vagy tiltott
 * allapotvaltas) dobott, ezzel forditjuk ertheto 403-as valassza.
 */
export function permissionErrorResponse(error: unknown): NextResponse | null {
  if (error instanceof ForbiddenError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  return null;
}

/** Szerver komponensbol a kliens komponenseknek atadhato jogosultsag-csomag. */
export async function getPermissionFlags(): Promise<PermissionFlags> {
  const role = await getCurrentWorkflowRole();
  if (!isEnforced()) return buildPermissionFlags("admin");
  return buildPermissionFlags(role);
}
