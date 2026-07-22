"use server";

import { redirect } from "next/navigation";
import { createAuthServerClient, isAuthConfigured } from "@/lib/supabase/server";

function safeNextPath(value: FormDataEntryValue | null) {
  const path = typeof value === "string" ? value : "";
  return path.startsWith("/") && !path.startsWith("//") ? path : "/";
}

export async function signIn(formData: FormData) {
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");
  const next = safeNextPath(formData.get("next"));

  if (!isAuthConfigured()) {
    redirect(`/login?error=${encodeURIComponent("Supabase Auth nincs konfigurálva.")}&next=${encodeURIComponent(next)}`);
  }

  if (!email || !password) {
    redirect(`/login?error=${encodeURIComponent("Add meg az e-mail címet és a jelszót.")}&next=${encodeURIComponent(next)}`);
  }

  const supabase = await createAuthServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    redirect(`/login?error=${encodeURIComponent("Hibás e-mail cím vagy jelszó.")}&next=${encodeURIComponent(next)}`);
  }

  redirect(next);
}

export async function signOut() {
  if (isAuthConfigured()) {
    const supabase = await createAuthServerClient();
    await supabase.auth.signOut();
  }

  // next=/ : a kijelentkezés utáni újra-bejelentkezés mindig a dashboardra
  // vigyen vissza (ne az utoljára nyitott oldalra / a "Több" menüre).
  redirect("/login?next=/");
}
