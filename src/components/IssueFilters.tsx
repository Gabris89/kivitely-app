"use client";

import { useMemo, useState } from "react";
import type { Issue, IssueStatus, Project } from "@/types";
import { issueStatusLabels, issueStatusOrder } from "@/lib/workflow";
import { IssueTable } from "@/components/IssueTable";
import { SearchBox } from "@/components/SearchBox";

type Filter = "all" | IssueStatus;

export function IssueFilters({
  issues,
  showProject = false,
  projects = []
}: {
  issues: Issue[];
  showProject?: boolean;
  projects?: Project[];
}) {
  const [statusFilter, setStatusFilter] = useState<Filter>("all");
  const [projectFilter, setProjectFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

  const filteredIssues = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return issues.filter((issue) => {
      const matchesStatus = statusFilter === "all" || issue.status === statusFilter;
      const matchesProject = projectFilter === "all" || issue.projectId === projectFilter;
      const matchesSearch = !normalizedSearch || [issue.id, issue.title, issue.location, issue.subcontractor, issue.assignee, issue.projectName]
        .join(" ")
        .toLowerCase()
        .includes(normalizedSearch);

      return matchesStatus && matchesProject && matchesSearch;
    });
  }, [issues, search, statusFilter, projectFilter]);

  return (
    <div className="issue-filter-stack">
      <SearchBox value={search} onChange={setSearch} placeholder="ID, hiba, helyszín, alvállalkozó..." />

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
          Összes <strong>{issues.length}</strong>
        </button>
        {issueStatusOrder.map((status) => {
          const count = issues.filter((issue) => issue.status === status).length;
          if (count === 0) return null;

          return (
            <button key={status} className={statusFilter === status ? "active" : ""} type="button" onClick={() => setStatusFilter(status)}>
              {issueStatusLabels[status]} <strong>{count}</strong>
            </button>
          );
        })}
      </div>

      <IssueTable issues={filteredIssues} showProject={showProject} />
    </div>
  );
}
