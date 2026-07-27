"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { signOut } from "@/app/login/actions";
import { can } from "@/lib/permissions";
import type { UserRole } from "@/types";
import { NavIcon, type NavIconName } from "@/components/NavIcons";
import { ProjectSwitcher } from "@/components/ProjectSwitcher";

type NavItem = {
  href: string;
  label: string;
  icon: NavIconName;
};

type NavSection = {
  title: string;
  items: NavItem[];
};

function getProjectId(pathname: string): string | null {
  const id = pathname.match(/^\/projects\/([^/]+)/)?.[1] ?? null;
  // A "/projects/new" (új projekt) nem projekt-kontextus.
  if (id === "new") return null;
  return id;
}

// ── Egységes, scope-tudatos navigáció ──────────────────────────────────────
// A menüpontok LISTÁJA nem attól függ, hogy globális ("Minden projekt") vagy
// projekt-nézetben vagyunk. A jelenlegi projekt (scope) csak azt dönti el,
// MELYIK adaton dolgoznak a modulok (a link célja), és hogy megjelennek-e a
// kizárólag projektben értelmes extrák (Új hiba, Projekt dokumentáció).
// Nincs többé "Hibalista" vs "Összes hiba" duplikáció, és nincs külön "Admin"
// szekció – a "Minden projekt" scope adja az összesített nézetet.

// A "gyors letrehozas" menupont ahhoz igazodik, amit a szerep tenylegesen
// megtehet: aki nem hozhat letre hibat, annak fel sem ajanljuk (az oldal
// ugyis tiltast mutatna). Az alvallalkozo sajat akciója az akadaly-bejelentes.
function quickCreateItem(projectId: string, role: UserRole): NavItem | null {
  const base = `/projects/${projectId}`;
  if (can(role, "issue.create")) return { href: `${base}/issues/new`, label: "Új hiba", icon: "add" };
  if (can(role, "blocker.create")) return { href: `${base}/blockers/new`, label: "Új akadály", icon: "add" };
  return null;
}

function workItems(projectId: string | null, role: UserRole): NavItem[] {
  const base = projectId ? `/projects/${projectId}` : "";
  const items: NavItem[] = [
    { href: projectId ? base : "/", label: "Áttekintés", icon: "dashboard" },
    { href: projectId ? `${base}/issues` : "/issues", label: "Hibák", icon: "issues" },
    { href: projectId ? `${base}/blockers` : "/blockers", label: "Akadályok", icon: "blockers" },
    { href: projectId ? `${base}/workflow` : "/workflow", label: "Workflow tábla", icon: "workflow" }
  ];
  if (projectId) {
    const quickCreate = quickCreateItem(projectId, role);
    if (quickCreate) items.push(quickCreate);
  }
  return items;
}

function projectDocItems(projectId: string): NavItem[] {
  const base = `/projects/${projectId}`;
  return [
    { href: `${base}/documents`, label: "Dokumentumok", icon: "documents" },
    { href: `${base}/work-logs`, label: "Teljesítménynapló", icon: "worklog" },
    { href: `${base}/tig`, label: "TIG csomag", icon: "tig" }
  ];
}

const masterDataItems: NavItem[] = [
  { href: "/projects", label: "Projektek", icon: "projects" },
  { href: "/subcontractors", label: "Alvállalkozók", icon: "subcontractors" }
];

// Desktop sidebar – minden modul egy helyen, csoportosítva.
function buildNavSections(projectId: string | null, role: UserRole): NavSection[] {
  const sections: NavSection[] = [{ title: "Munka", items: workItems(projectId, role) }];
  if (projectId) {
    sections.push({ title: "Projekt dokumentáció", items: projectDocItems(projectId) });
  }
  sections.push({ title: "Törzsadatok", items: masterDataItems });
  return sections;
}

// Mobil alsó sáv – 3 elsődleges cél + a "Több" gomb (fix 4 hely, ennyi fér el
// kényelmesen egy telefon alján), azonos szerkezettel mindkét scope-ban. A
// középső "gyors létrehozás" akció a nézőponthoz igazodik: projektben új hiba
// (a napi legfontosabb művelet), összesített nézetben új projekt. A Workflow és
// az Akadályok a "Több" drawerbe kerül.
function buildBottomNav(projectId: string | null, role: UserRole): NavItem[] {
  const base = projectId ? `/projects/${projectId}` : "";
  // A harmadik hely mindig ki van toltve (a savban fix 4 slot van): ha a
  // szerep semmit sem hozhat letre, navigacios pont kerul ide helyette.
  const third: NavItem = projectId
    ? quickCreateItem(projectId, role) || { href: `${base}/blockers`, label: "Akadályok", icon: "blockers" }
    : can(role, "project.create")
      ? { href: "/projects/new", label: "Új projekt", icon: "add" }
      : { href: "/blockers", label: "Akadályok", icon: "blockers" };

  return [
    { href: projectId ? base : "/", label: "Áttekintés", icon: "dashboard" },
    { href: projectId ? `${base}/issues` : "/issues", label: "Hibák", icon: "issues" },
    third
  ];
}

// "Több" drawer – ami nincs az alsó sávban, egyetlen, csoportosított listában
// (nem külön második menü). Ugyanaz a szerkezet mindkét scope-ban, a projekt-
// dokumentáció csoport csak projekt-nézetben jelenik meg.
function buildDrawerSections(projectId: string | null): NavSection[] {
  const base = projectId ? `/projects/${projectId}` : "";
  const sections: NavSection[] = [
    {
      title: "Munka",
      items: [
        { href: projectId ? `${base}/blockers` : "/blockers", label: "Akadályok", icon: "blockers" },
        { href: projectId ? `${base}/workflow` : "/workflow", label: "Workflow tábla", icon: "workflow" }
      ]
    }
  ];
  if (projectId) {
    sections.push({ title: "Projekt dokumentáció", items: projectDocItems(projectId) });
  }
  sections.push({ title: "Törzsadatok", items: masterDataItems });
  return sections;
}

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  if (href === "/projects") return pathname === "/projects";
  // A projekt saját áttekintője (pl. /projects/PRJ-001) – minden más projekt-
  // aloldal is ezzel a prefixszel kezdődik, ezért pontos egyezés kell.
  if (/^\/projects\/[^/]+$/.test(href)) return pathname === href;
  if (href.endsWith("/issues")) return pathname === href || (pathname.startsWith(`${href}/`) && !pathname.startsWith(`${href}/new`));
  return pathname === href || pathname.startsWith(`${href}/`);
}

function isBottomNavActive(pathname: string, href: string, isMenuOpen: boolean) {
  if (isMenuOpen) return false;
  return isActive(pathname, href);
}

/** A bejelentkezett felhasználó megjelenítéshez kigyűjtött adata (a szerver
    adja át, lásd app/layout.tsx). */
type CurrentUserBadge = {
  displayName: string;
  roleLabel: string;
  hasProfile: boolean;
};

export function AppShell({
  children,
  user,
  role = "viewer"
}: {
  children: ReactNode;
  user?: CurrentUserBadge | null;
  /** A bejelentkezett felhasznalo szerepe (a szerver adja at, lasd
      app/layout.tsx). Fail-closed: ismeretlen szerep = viewer. */
  role?: UserRole;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [hasHydrated, setHasHydrated] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [pendingMenuHref, setPendingMenuHref] = useState<string | null>(null);
  const activePathname = hasHydrated ? pathname : "";
  const projectId = getProjectId(activePathname);
  const navSections = buildNavSections(projectId, role);
  const bottomNav = buildBottomNav(projectId, role);
  const drawerSections = buildDrawerSections(projectId);
  const canCreateProject = can(role, "project.create");

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setHasHydrated(true);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  useEffect(() => {
    // Safari's back-forward cache freezes the whole page (including this
    // component's React state, e.g. isMenuOpen) and restores it verbatim on
    // back/forward navigation, without re-running any server checks - so a
    // "Több" sheet left open before signing out can reappear open after
    // going back, even though the session is gone. Cache-Control: no-store
    // isn't reliably enough to stop this in Safari. event.persisted === true
    // means the page came from bfcache, not a fresh load - force a real
    // reload so auth state and component state both start clean.
    function handlePageShow(event: PageTransitionEvent) {
      if (event.persisted) {
        window.location.reload();
      }
    }

    window.addEventListener("pageshow", handlePageShow);
    return () => window.removeEventListener("pageshow", handlePageShow);
  }, []);

  useEffect(() => {
    if (!pendingMenuHref || pathname !== pendingMenuHref) return;

    const timeoutId = window.setTimeout(() => {
      setIsMenuOpen(false);
      setPendingMenuHref(null);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [pathname, pendingMenuHref]);

  // Bármilyen oldalváltáskor csukjuk be a "Több" drawert – így nem maradhat
  // nyitva az auth-váltás (kijelentkezés → bejelentkezés) körül sem.
  useEffect(() => {
    setIsMenuOpen(false);
    setPendingMenuHref(null);
  }, [pathname]);

  function closeMenuToDashboard() {
    const target = projectId ? `/projects/${projectId}` : "/";
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
        <Link href={projectId ? `/projects/${projectId}` : "/"} className="brand" aria-label="Kivitely kezdőlap">
          <span className="brand-mark">
            <Image src="/brand/logo.png" alt="Kivitely" width={120} height={120} priority />
          </span>
        </Link>

        <ProjectSwitcher currentProjectId={projectId} canCreateProject={canCreateProject} />

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

        {user ? (
          <div className="sidebar-user" title={user.hasProfile ? undefined : "Nincs érvényes profil ehhez a fiókhoz – csak megtekintői jogok"}>
            <span className="sidebar-user-avatar" aria-hidden="true">{user.displayName.slice(0, 1).toUpperCase()}</span>
            <span className="sidebar-user-text">
              <strong>{user.displayName}</strong>
              <small className={user.hasProfile ? undefined : "is-warn"}>{user.roleLabel}</small>
            </span>
          </div>
        ) : null}

        <form action={signOut} className="sidebar-logout" suppressHydrationWarning>
          <button type="submit" className="button ghost">
            <NavIcon name="logout" />
            Kijelentkezés
          </button>
        </form>
      </aside>

      <header className="mobile-topbar">
        <ProjectSwitcher currentProjectId={projectId} canCreateProject={canCreateProject} />
      </header>

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

            {drawerSections.map((section, sectionIndex) => (
              <div className="mobile-menu-group" key={section.title}>
                {sectionIndex > 0 ? <div className="mobile-menu-divider" /> : null}
                <span className="nav-section-title">{section.title}</span>
                {section.items.map((item) => (
                  <button key={item.href} type="button" onClick={() => navigateFromMenu(item.href)}>
                    <span className="nav-icon"><NavIcon name={item.icon} /></span>
                    {item.label}
                  </button>
                ))}
              </div>
            ))}

            {user ? (
              <div className="mobile-menu-group">
                <div className="mobile-menu-divider" />
                <div className="sidebar-user">
                  <span className="sidebar-user-avatar" aria-hidden="true">{user.displayName.slice(0, 1).toUpperCase()}</span>
                  <span className="sidebar-user-text">
                    <strong>{user.displayName}</strong>
                    <small className={user.hasProfile ? undefined : "is-warn"}>{user.roleLabel}</small>
                  </span>
                </div>
              </div>
            ) : null}

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
