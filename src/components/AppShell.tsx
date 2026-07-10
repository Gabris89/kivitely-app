"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

const nav = [
  { href: "/", label: "Dashboard", icon: "📊" },
  { href: "/issues", label: "Hibalista", icon: "🧱" },
  { href: "/workflow", label: "Workflow tábla", icon: "🧭" },
  { href: "/issues/new", label: "Új hiba", icon: "➕" },
  { href: "/work-logs", label: "Teljesítménynapló", icon: "📝" },
  { href: "/subcontractors", label: "Alvállalkozók", icon: "👷" },
  { href: "/tig", label: "TIG csomag", icon: "🧾" },
  { href: "/mobile", label: "Mobil/PWA nézet", icon: "📱" }
];

const bottomNav = [
  { href: "/", label: "Dashboard", icon: "📊" },
  { href: "/issues", label: "Hibalista", icon: "🧱" },
  { href: "/work-logs", label: "Napló", icon: "📝" },
  { href: "/issues/new", label: "Új hiba", icon: "➕" },
  { href: "/tig", label: "TIG", icon: "🧾" }
];

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  if (href === "/issues") return pathname === "/issues" || (pathname.startsWith("/issues/") && pathname !== "/issues/new");
  return pathname.startsWith(href);
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Link href="/" className="brand" aria-label="Kivitely kezdőlap">
          <span className="brand-mark">KV</span>
          <span>
            <strong>Kivitely</strong>
            <small>Mock-data MVP</small>
          </span>
        </Link>

        <nav className="nav-list" aria-label="Fő navigáció">
          {nav.map((item) => (
            <Link key={item.href} href={item.href} className={isActive(pathname, item.href) ? "active" : ""}>
              <span className="nav-icon">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="sidebar-card">
          <strong>Demo narratíva</strong>
          <p>Hiba rögzítés → státuszváltás → fotós bizonyítás → TIG csomag.</p>
        </div>
      </aside>

      <main className="content">{children}</main>

      <nav className="bottom-nav" aria-label="Mobil fő navigáció">
        {bottomNav.map((item) => (
          <Link key={item.href} href={item.href} className={isActive(pathname, item.href) ? "active" : ""}>
            <span>{item.icon}</span>
            {item.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
