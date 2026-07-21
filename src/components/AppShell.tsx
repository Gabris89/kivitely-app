"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { signOut } from "@/app/login/actions";
import { NavIcon, type NavIconName } from "@/components/NavIcons";

type NavItem = {
  href: string;
  label: string;
  icon: NavIconName;
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
      title: "Projektek",
      items: [{ href: "/projects", label: "Projektek", icon: "projects" }]
    },
    {
      title: "Munka",
      items: [
        { href: `/projects/${projectId}`, label: "Dashboard", icon: "dashboard" },
        { href: `/projects/${projectId}/issues`, label: "Hibalista", icon: "issues" },
        { href: `/projects/${projectId}/issues/new`, label: "Új hiba", icon: "add" },
        { href: `/projects/${projectId}/blockers`, label: "Akadálylista", icon: "blockers" },
        { href: `/projects/${projectId}/workflow`, label: "Workflow tábla", icon: "workflow" }
      ]
    },
    {
      title: "Dokumentáció",
      items: [
        { href: `/projects/${projectId}/documents`, label: "Dokumentumok", icon: "documents" },
        { href: `/projects/${projectId}/work-logs`, label: "Teljesítménynapló", icon: "worklog" },
        { href: `/projects/${projectId}/tig`, label: "TIG csomag", icon: "tig" }
      ]
    },
    {
      title: "Admin",
      items: [
        { href: "/issues", label: "Összes hiba", icon: "issues" },
        { href: "/blockers", label: "Összes akadály", icon: "blockers" },
        { href: "/workflow", label: "Workflow tábla (összes)", icon: "workflow" },
        { href: "/subcontractors", label: "Alvállalkozók", icon: "subcontractors" }
      ]
    }
  ];
}

const globalNavSections: NavSection[] = [
  {
    title: "Projektek",
    items: [
      { href: "/projects", label: "Projektek", icon: "projects" },
      { href: "/projects/new", label: "Új projekt", icon: "add" }
    ]
  },
  {
    title: "Admin",
    items: [
      { href: "/issues", label: "Összes hiba", icon: "issues" },
      { href: "/blockers", label: "Összes akadály", icon: "blockers" },
      { href: "/workflow", label: "Workflow tábla (összes)", icon: "workflow" },
      { href: "/subcontractors", label: "Alvállalkozók", icon: "subcontractors" }
    ]
  }
];

function projectBottomNav(projectId: string): NavItem[] {
  return [
    { href: `/projects/${projectId}`, label: "Dashboard", icon: "dashboard" },
    { href: `/projects/${projectId}/issues`, label: "Hibalista", icon: "issues" },
    { href: `/projects/${projectId}/issues/new`, label: "Új hiba", icon: "add" }
  ];
}

const globalBottomNav: NavItem[] = [{ href: "/projects", label: "Projektek", icon: "projects" }];

function projectMobileMenuGroups(projectId: string): NavItem[][] {
  return [
    [
      { href: `/projects/${projectId}/blockers`, label: "Akadálylista", icon: "blockers" },
      { href: `/projects/${projectId}/workflow`, label: "Workflow tábla", icon: "workflow" },
      { href: `/projects/${projectId}/documents`, label: "Dokumentumok", icon: "documents" },
      { href: `/projects/${projectId}/work-logs`, label: "Teljesítménynapló", icon: "worklog" },
      { href: `/projects/${projectId}/tig`, label: "TIG csomag", icon: "tig" }
    ],
    [
      { href: "/issues", label: "Összes hiba", icon: "issues" },
      { href: "/blockers", label: "Összes akadály", icon: "blockers" },
      { href: "/workflow", label: "Workflow tábla (összes)", icon: "workflow" },
      { href: "/subcontractors", label: "Alvállalkozók", icon: "subcontractors" },
      { href: "/projects", label: "Projektek", icon: "projects" }
    ]
  ];
}

const globalMobileMenuGroups: NavItem[][] = [
  [
    { href: "/projects/new", label: "Új projekt", icon: "add" },
    { href: "/issues", label: "Összes hiba", icon: "issues" },
    { href: "/blockers", label: "Összes akadály", icon: "blockers" },
    { href: "/workflow", label: "Workflow tábla (összes)", icon: "workflow" },
    { href: "/subcontractors", label: "Alvállalkozók", icon: "subcontractors" }
  ]
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
  const mobileMenuGroups = projectId ? projectMobileMenuGroups(projectId) : globalMobileMenuGroups;

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
          <span className="brand-mark">
            <Image src="/brand/logo.png" alt="Kivitely" width={120} height={120} priority />
          </span>
        </Link>

        <nav className="nav-list" aria-label="Fő navigáció">
          {navSections.map((section) => (
            <div className="nav-section" key={section.title}>
              <span className="nav-section-title">{section.title}</span>
              <div className="nav-section-links">
                {section.items.map((item) => (
                  <Link key={item.href} href={item.href} className={isActive(activePathname, item.href) ? "active" : ""}>
                    <span className="nav-icon"><NavIcon name={item.icon} /></span>
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </nav>

        <form action={signOut} className="sidebar-logout" suppressHydrationWarning>
          <button type="submit" className="button ghost">
            <NavIcon name="logout" />
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
                <strong>Több</strong>
                <span>Kivitely modulok</span>
              </div>
              <button type="button" aria-label="Menü bezárása" onClick={closeMenuToDashboard}>
                ×
              </button>
            </div>

            {mobileMenuGroups.map((group, groupIndex) => (
              <div className="mobile-menu-group" key={group[0]?.href || groupIndex}>
                {groupIndex > 0 ? <div className="mobile-menu-divider" /> : null}
                {group.map((item) => (
                  <button key={item.href} type="button" onClick={() => navigateFromMenu(item.href)}>
                    <span className="nav-icon"><NavIcon name={item.icon} /></span>
                    {item.label}
                  </button>
                ))}
              </div>
            ))}

            <form action={signOut} className="mobile-menu-section" suppressHydrationWarning>
              <button type="submit" className="button ghost">
                <NavIcon name="logout" />
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
            <NavIcon name={item.icon} />
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
          <NavIcon name="more" />
          Több
        </button>
      </nav>
    </div>
  );
}
