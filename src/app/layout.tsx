import type { Metadata, Viewport } from "next";
import { AppShell } from "@/components/AppShell";
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

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="hu" suppressHydrationWarning>
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
