import type { Metadata } from "next";
import { AppShell } from "@/components/AppShell";
import "./globals.css";

export const metadata: Metadata = {
  title: "Kivitely MVP",
  description: "Kivitelezésmenedzsment MVP hibalistával, fotós bizonyítással és TIG workflow-val."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="hu">
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
