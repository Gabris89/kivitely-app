"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Project } from "@/types";
import { resolveScopeHref } from "@/lib/scope";
import { NavIcon } from "@/components/NavIcons";

const LAST_PROJECT_KEY = "kivitely.lastProjectId";

function CaretIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" width="16" height="16">
      <path d="M7 10l5 5 5-5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// Fejléc projektváltó (scope-választó). Mindig látható; a jelenlegi nézőpontot
// mutatja, és bárhonnan enged váltani projektet vagy a "Minden projekt"
// nézetre – a menüstruktúra nem változik, csak az adat, amin dolgozunk.
export function ProjectSwitcher({ currentProjectId }: { currentProjectId: string | null }) {
  const pathname = usePathname();
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/projects")
      .then((res) => (res.ok ? res.json() : { data: [] }))
      .then((json) => {
        if (active) setProjects(Array.isArray(json?.data) ? json.data : []);
      })
      .catch(() => {
        /* csendes hiba – a switcher üres listával is működik */
      });
    return () => {
      active = false;
    };
  }, []);

  // A legutóbb használt projekt megjegyzése (gyors visszaugráshoz).
  useEffect(() => {
    if (!currentProjectId) return;
    try {
      window.localStorage.setItem(LAST_PROJECT_KEY, currentProjectId);
    } catch {
      /* privát mód / letiltott storage – nem kritikus */
    }
  }, [currentProjectId]);

  // Bezárás kívülre kattintásra vagy Escape-re.
  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const current = useMemo(
    () => projects.find((project) => project.publicId === currentProjectId) ?? null,
    [projects, currentProjectId]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return projects;
    return projects.filter((project) => {
      const haystack = `${project.name} ${project.publicId} ${project.address ?? ""}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [projects, query]);

  function go(targetProjectId: string | null) {
    setOpen(false);
    setQuery("");
    router.push(resolveScopeHref(pathname, targetProjectId));
  }

  const triggerLabel = current ? current.name : "Minden projekt";
  const triggerBadge = current ? current.publicId : "MIND";

  return (
    <div className="project-switcher" ref={containerRef}>
      <button
        type="button"
        className="project-switcher-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <span className={`project-switcher-badge${current ? "" : " all"}`}>{triggerBadge}</span>
        <span className="project-switcher-label">{triggerLabel}</span>
        <span className="project-switcher-caret" aria-hidden="true">
          <CaretIcon />
        </span>
      </button>

      {open ? (
        <div className="project-switcher-menu" role="listbox">
          <div className="project-switcher-search">
            <input
              type="text"
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Projekt keresése…"
              aria-label="Projekt keresése"
            />
          </div>

          <button
            type="button"
            className={`project-switcher-option${current ? "" : " active"}`}
            onClick={() => go(null)}
          >
            <span className="project-switcher-badge all">MIND</span>
            <span className="project-switcher-option-main">
              <strong>Minden projekt</strong>
              <small>Összesített nézet</small>
            </span>
          </button>

          <div className="project-switcher-list">
            {filtered.map((project) => (
              <button
                key={project.id}
                type="button"
                className={`project-switcher-option${project.publicId === currentProjectId ? " active" : ""}`}
                onClick={() => go(project.publicId)}
              >
                <span className="project-switcher-badge">{project.publicId}</span>
                <span className="project-switcher-option-main">
                  <strong>{project.name}</strong>
                  <small>{[project.phase, project.address].filter(Boolean).join(" · ") || "Nincs megadva"}</small>
                </span>
              </button>
            ))}
            {filtered.length === 0 ? <p className="project-switcher-empty">Nincs találat.</p> : null}
          </div>

          <Link href="/projects/new" className="project-switcher-new" onClick={() => setOpen(false)}>
            <span className="nav-icon">
              <NavIcon name="add" />
            </span>
            Új projekt
          </Link>
        </div>
      ) : null}
    </div>
  );
}
