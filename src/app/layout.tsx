import type { Metadata, Viewport } from "next";
import { AppShell } from "@/components/AppShell";
import { appRoleLabels, getCurrentUser } from "@/lib/currentUser";
import "./globals.css";

export const metadata: Metadata = {
  title: "Kivitely MVP",
  description: "Kivitelezésmenedzsment MVP hibalistával, fotós bizonyítással és TIG workflow-val.",
  formatDetection: {
    telephone: false,
    date: false,
    address: false,
    email: false,
    url: false
  }
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  // Ki van bejelentkezve: a menü aljában látszik a név és a szerep. Ez nem
  // dísz – ez a visszajelzés arról, hogy az app tényleg felismeri a szerepet
  // (a workflow-szabályok mostantól erre futnak). Lásd docs/permissions-plan.md.
  const user = await getCurrentUser();
  // Érvényes = van profiles sor ÉS nincs letiltva. Bármelyik hiányzik, a
  // badge figyelmeztet, a workflow pedig viewer jogokra esik vissza.
  const hasValidProfile = Boolean(user?.role && user.isActive);
  const roleLabel = !user?.role
    ? "Nincs profil"
    : user.isActive
      ? appRoleLabels[user.role]
      : `${appRoleLabels[user.role]} · letiltva`;

  return (
    <html lang="hu" suppressHydrationWarning>
      <body>
        <AppShell
          user={
            user
              ? {
                  displayName: user.displayName,
                  roleLabel,
                  hasProfile: hasValidProfile
                }
              : null
          }
        >
          {children}
        </AppShell>
      </body>
    </html>
  );
}
