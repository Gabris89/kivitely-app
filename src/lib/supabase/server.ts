import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL)?.replace(/\/$/, "");
const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY;

export function isAuthConfigured() {
  return Boolean(supabaseUrl && supabasePublishableKey);
}

// A repository ezen keresztül éri el az adatbázist: a bejelentkezett felhasználó
// session-cookie-ját továbbítja, így a DB-műveletek az "authenticated" szerepben
// futnak (nem "anon"-ként). Ha nincs Supabase konfigurálva, null-t ad – így a
// repository mock-módú fallbackje (if (!supabase) ...) változatlanul működik.
export async function getServerSupabaseClient() {
  if (!isAuthConfigured()) return null;
  return createAuthServerClient();
}

export async function createAuthServerClient() {
  const cookieStore = await cookies();

  return createServerClient(supabaseUrl!, supabasePublishableKey!, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Called from a Server Component render, not an action/route handler.
          // Session refresh already happens in middleware, so this is safe to ignore.
        }
      }
    }
  });
}
