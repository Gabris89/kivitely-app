"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

const nav = [
  { href: "/", label: "Dashboard", icon: "D" },
  { href: "/issues", label: "Hibalista", icon: "H" },
  { href: "/blockers", label: "Akadálylista", icon: "!" },
  { href: "/workflow", label: "Workflow tábla", icon: "W" },
  { href: "/issues/new", label: "Új hiba", icon: "+" },
  { href: "/work-logs", label: "Teljesítménynapló", icon: "N" },
  { href: "/subcontractors", label: "Alvállalkozók", icon: "A" },
  { href: "/tig", label: "TIG csomag", icon: "T" },
  { href: "/mobile", label: "Mobil/PWA nézet", icon: "M" }
];

const bottomNav = [
  { href: "/", label: "Dashboard", icon: "D" },
  { href: "/issues", label: "Hibalista", icon: "H" },
  { href: "/blockers", label: "Akadály", icon: "!" },
  { href: "/work-logs", label: "Napló", icon: "N" },
  { href: "/issues/new", label: "Új hiba", icon: "+" },
  { href: "/tig", label: "TIG", icon: "T" }
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
