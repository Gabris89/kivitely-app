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

function getProjectId(pathname: string) {
  return pathname.match(/^\/projects\/([^/]+)/)?.[1] || null;
}

function projectNavSections(projectId: string): NavSection[] {
  return [
    {
      title: "Munka",
      items: [
        { href: `/projects/${projectId}`, label: "Dashboard", icon: "D" },
        { href: `/projects/${projectId}/issues`, label: "Hibalista", icon: "H" },
        { href: `/projects/${projectId}/issues/new`, label: "Új hiba", icon: "+" },
        { href: `/projects/${projectId}/blockers`, label: "Akadálylista", icon: "!" }
      ]
    },
    {
      title: "Dokumentáció",
      items: [
        { href: `/projects/${projectId}/documents`, label: "Dokumentumok", icon: "D" },
        { href: `/projects/${projectId}/work-logs`, label: "Teljesítménynapló", icon: "N" },
        { href: `/projects/${projectId}/tig`, label: "TIG csomag", icon: "T" }
      ]
    },
    {
      title: "Admin",
      items: [
        { href: `/projects/${projectId}/workflow`, label: "Workflow tábla", icon: "W" },
        { href: "/subcontractors", label: "Alvállalkozók", icon: "A" },
        { href: "/projects", label: "Projektek", icon: "P" }
      ]
    }
  ];
}

const globalNavSections: NavSection[] = [
  {
    title: "Projektek",
    items: [
      { href: "/projects", label: "Projektek", icon: "P" },
      { href: "/projects/new", label: "Új projekt", icon: "+" }
    ]
  },
  {
    title: "Admin",
    items: [{ href: "/subcontractors", label: "Alvállalkozók", icon: "A" }]
  }
];

function projectBottomNav(projectId: string) {
  return [
    { href: `/projects/${projectId}`, label: "Dashboard", icon: "D" },
    { href: `/projects/${projectId}/issues`, label: "Hibalista", icon: "H" },
    { href: `/projects/${projectId}/issues/new`, label: "Új hiba", icon: "+" }
  ];
}

const globalBottomNav = [{ href: "/projects", label: "Projektek", icon: "P" }];

function projectMobileMenuSections(projectId: string): NavSection[] {
  return [
    {
      title: "Munka",
      items: [
        { href: `/projects/${projectId}/blockers`, label: "Akadálylista", icon: "!" },
        { href: `/projects/${projectId}/workflow`, label: "Workflow tábla", icon: "W" }
      ]
    },
    {
      title: "Dokumentáció",
      items: [
        { href: `/projects/${projectId}/documents`, label: "Dokumentumok", icon: "D" },
        { href: `/projects/${projectId}/work-logs`, label: "Teljesítménynapló", icon: "N" },
        { href: `/projects/${projectId}/tig`, label: "TIG csomag", icon: "T" }
      ]
    },
    {
      title: "Admin",
      items: [
        { href: "/subcontractors", label: "Alvállalkozók", icon: "A" },
        { href: "/projects", label: "Projektek", icon: "P" }
      ]
    }
  ];
}

const globalMobileMenuSections: NavSection[] = [
  {
    title: "Admin",
    items: [
      { href: "/projects/new", label: "Új projekt", icon: "+" },
      { href: "/subcontractors", label: "Alvállalkozók", icon: "A" }
    ]
  }
];

function isActive(pathname: string, href: string) {
  if (href === "/projects") return pathname === "/projects";
  if (href.endsWith("/issues")) return pathname === href || (pathname.startsWith(`${href}/`) && !pathname.startsWith(`${href}/new`));
  return pathname === href || pathname.startsWith(`${href}/`);
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
  const projectId = getProjectId(activePathname);
  const navSections = projectId ? projectNavSections(projectId) : globalNavSections;
  const bottomNav = projectId ? projectBottomNav(projectId) : globalBottomNav;
  const mobileMenuSections = projectId ? projectMobileMenuSections(projectId) : globalMobileMenuSections;

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
    const target = projectId ? `/projects/${projectId}` : "/projects";
    setPendingMenuHref(target);
    router.push(target);
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
        <Link href={projectId ? `/projects/${projectId}` : "/projects"} className="brand" aria-label="Kivitely kezdőlap">
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

        <form action={signOut} className="sidebar-logout" suppressHydrationWarning>
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

            <form action={signOut} className="mobile-menu-section" suppressHydrationWarning>
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
