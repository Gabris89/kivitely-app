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

  return (
    <html lang="hu" suppressHydrationWarning>
      <body>
        <AppShell
          user={
            user
              ? {
                  displayName: user.displayName,
                  roleLabel: user.role ? appRoleLabels[user.role] : "Nincs profil",
                  hasProfile: Boolean(user.role)
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
