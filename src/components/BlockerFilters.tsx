"use client";

import { useMemo, useState } from "react";
import type { BlockerItem, BlockerStatus, Project } from "@/types";
import { blockerStatusLabels, blockerStatusOrder } from "@/lib/blockerWorkflow";
import { BlockerTable } from "@/components/BlockerTable";
import { SearchBox } from "@/components/SearchBox";

type Filter = "all" | BlockerStatus;

export function BlockerFilters({
  blockers,
  showProject = false,
  projects = []
}: {
  blockers: BlockerItem[];
  showProject?: boolean;
  projects?: Project[];
}) {
  const [statusFilter, setStatusFilter] = useState<Filter>("all");
  const [projectFilter, setProjectFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

  const filteredBlockers = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return blockers.filter((blocker) => {
      const matchesStatus = statusFilter === "all" || blocker.status === statusFilter;
      const matchesProject = projectFilter === "all" || blocker.projectId === projectFilter;
      const matchesSearch = !normalizedSearch || [blocker.publicId, blocker.title, blocker.trade, blocker.area, blocker.responsibleName, blocker.projectName]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(normalizedSearch);

      return matchesStatus && matchesProject && matchesSearch;
    });
  }, [blockers, search, statusFilter, projectFilter]);

  return (
    <div className="issue-filter-stack">
      <SearchBox value={search} onChange={setSearch} placeholder="ID, cím, szakma, felelős..." />

      {showProject && projects.length > 0 ? (
        <select
          className="project-filter-select"
          aria-label="Szűrés projektre"
          value={projectFilter}
          onChange={(event) => setProjectFilter(event.target.value)}
          suppressHydrationWarning
        >
          <option value="all">Összes projekt</option>
          {projects.map((project) => (
            <option key={project.publicId} value={project.publicId}>
              {project.publicId} · {project.name}
            </option>
          ))}
        </select>
      ) : null}

      <div className="status-filter-row" aria-label="Státusz szűrők">
        <button className={statusFilter === "all" ? "active" : ""} type="button" onClick={() => setStatusFilter("all")}>
          Összes <strong>{blockers.length}</strong>
        </button>
        {blockerStatusOrder.map((status) => {
          const count = blockers.filter((blocker) => blocker.status === status).length;
          if (count === 0) return null;

          return (
            <button key={status} className={statusFilter === status ? "active" : ""} type="button" onClick={() => setStatusFilter(status)}>
              {blockerStatusLabels[status]} <strong>{count}</strong>
            </button>
          );
        })}
      </div>

      <BlockerTable blockers={filteredBlockers} showProject={showProject} />
    </div>
  );
}
