"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { signOut } from "@/app/login/actions";

type NavItem = {
  href: string;
  label: string;
  icon: string;
};

type NavSection = {
  title: string;
  items: NavItem[];
};

const navSections: NavSection[] = [
  {
    title: "Munka",
    items: [
      { href: "/", label: "Dashboard", icon: "D" },
      { href: "/issues", label: "Hibalista", icon: "H" },
      { href: "/issues/new", label: "Új hiba", icon: "+" },
      { href: "/blockers", label: "Akadálylista", icon: "!" }
    ]
  },
  {
    title: "Dokumentáció",
    items: [
      { href: "/documents", label: "Dokumentumok", icon: "D" },
      { href: "/work-logs", label: "Teljesítménynapló", icon: "N" },
      { href: "/tig", label: "TIG csomag", icon: "T" }
    ]
  },
  {
    title: "Admin",
    items: [
      { href: "/workflow", label: "Workflow tábla", icon: "W" },
      { href: "/subcontractors", label: "Alvállalkozók", icon: "A" },
      { href: "/mobile", label: "Mobil/PWA nézet", icon: "M" }
    ]
  }
];

const bottomNav = [
  { href: "/", label: "Dashboard", icon: "D" },
  { href: "/issues", label: "Hibalista", icon: "H" },
  { href: "/issues/new", label: "Új hiba", icon: "+" }
];

const mobileMenuSections: NavSection[] = [
  {
    title: "Munka",
    items: [
      { href: "/blockers", label: "Akadálylista", icon: "!" },
      { href: "/workflow", label: "Workflow tábla", icon: "W" }
    ]
  },
  {
    title: "Dokumentáció",
    items: [
      { href: "/documents", label: "Dokumentumok", icon: "D" },
      { href: "/work-logs", label: "Teljesítménynapló", icon: "N" },
      { href: "/tig", label: "TIG csomag", icon: "T" }
    ]
  },
  {
    title: "Admin",
    items: [
      { href: "/subcontractors", label: "Alvállalkozók", icon: "A" },
      { href: "/mobile", label: "Mobil/PWA nézet", icon: "M" }
    ]
  }
];

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  if (href === "/issues") return pathname === "/issues" || (pathname.startsWith("/issues/") && pathname !== "/issues/new");
  return pathname.startsWith(href);
}

function isBottomNavActive(pathname: string, href: string, isMenuOpen: boolean) {
  if (isMenuOpen) return false;
  return isActive(pathname, href);
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [hasHydrated, setHasHydrated] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [pendingMenuHref, setPendingMenuHref] = useState<string | null>(null);
  const activePathname = hasHydrated ? pathname : "";

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setHasHydrated(true);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  useEffect(() => {
    if (!pendingMenuHref || pathname !== pendingMenuHref) return;

    const timeoutId = window.setTimeout(() => {
      setIsMenuOpen(false);
      setPendingMenuHref(null);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [pathname, pendingMenuHref]);

  function closeMenuToDashboard() {
    setPendingMenuHref("/");
    router.push("/");
  }

  function navigateFromMenu(href: string) {
    if (href === pathname) {
      setIsMenuOpen(false);
      setPendingMenuHref(null);
      return;
    }

    setPendingMenuHref(href);
    router.push(href);
  }

  if (pathname === "/login") {
    return <main className="content login-shell">{children}</main>;
  }

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
          {navSections.map((section) => (
            <div className="nav-section" key={section.title}>
              <span className="nav-section-title">{section.title}</span>
              <div className="nav-section-links">
                {section.items.map((item) => (
                  <Link key={item.href} href={item.href} className={isActive(activePathname, item.href) ? "active" : ""}>
                    <span className="nav-icon">{item.icon}</span>
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="sidebar-card">
          <strong>Demo narratíva</strong>
          <p>Hiba rögzítés → státuszváltás → fotós bizonyítás → TIG csomag.</p>
        </div>

        <form action={signOut} className="sidebar-logout">
          <button type="submit" className="button ghost">
            Kijelentkezés
          </button>
        </form>
      </aside>

      <main className="content">{children}</main>

      {isMenuOpen ? (
        <div className="mobile-menu-backdrop" role="presentation" onClick={closeMenuToDashboard}>
          <nav id="mobile-menu" className="mobile-menu-sheet" aria-label="Mobil menü" onClick={(event) => event.stopPropagation()}>
            <div className="mobile-menu-head">
              <div>
                <strong>Menü</strong>
                <span>Kivitely modulok</span>
              </div>
              <button type="button" aria-label="Menü bezárása" onClick={closeMenuToDashboard}>
                ×
              </button>
            </div>

            {mobileMenuSections.map((section) => (
              <div className="mobile-menu-section" key={section.title}>
                <span>{section.title}</span>
                <div>
                  {section.items.map((item) => (
                    <button
                      key={item.href}
                      type="button"
                      onClick={() => navigateFromMenu(item.href)}
                    >
                      <span className="nav-icon">{item.icon}</span>
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}

            <form action={signOut} className="mobile-menu-section">
              <button type="submit" className="button ghost">
                Kijelentkezés
              </button>
            </form>
          </nav>
        </div>
      ) : null}

      <nav className="bottom-nav" aria-label="Mobil fő navigáció">
        {bottomNav.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={isBottomNavActive(activePathname, item.href, isMenuOpen) ? "active" : ""}
            onClick={() => setIsMenuOpen(false)}
          >
            <span>{item.icon}</span>
            {item.label}
          </Link>
        ))}
        <button
          type="button"
          className={isMenuOpen ? "active" : ""}
          aria-expanded={isMenuOpen}
          aria-controls="mobile-menu"
          onClick={() => {
            if (isMenuOpen) {
              closeMenuToDashboard();
              return;
            }

            setIsMenuOpen(true);
          }}
        >
          <span>☰</span>
          Menü
        </button>
      </nav>
    </div>
  );
}
