"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { Issue, Project } from "@/types";
import { issueStatusOrder } from "@/lib/workflow";
import { PriorityBadge, StatusBadge } from "@/components/StatusBadge";

export function WorkflowBoard({ issues, projects = [] }: { issues: Issue[]; projects?: Project[] }) {
  const [projectFilter, setProjectFilter] = useState<string>("all");

  const filteredIssues = useMemo(() => {
    if (projectFilter === "all") return issues;
    return issues.filter((issue) => issue.projectId === projectFilter);
  }, [issues, projectFilter]);

  return (
    <>
      {projects.length > 0 ? (
        <select
          className="project-filter-select"
          aria-label="Szűrés projektre"
          value={projectFilter}
          onChange={(event) => setProjectFilter(event.target.value)}
          style={{ marginBottom: 16 }}
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

      <section className="workflow-board">
        {issueStatusOrder.map((status) => {
          const columnIssues = filteredIssues.filter((issue) => issue.status === status);
          if (columnIssues.length === 0) return null;

          return (
            <article className="workflow-column" key={status}>
              <div className="workflow-column-head">
                <StatusBadge status={status} />
                <strong>{columnIssues.length}</strong>
              </div>

              <div className="workflow-card-list">
                {columnIssues.map((issue) => (
                  <Link className="workflow-card" href={`/projects/${issue.projectId}/issues/${issue.id}`} key={issue.id}>
                    <span className="id-link">{issue.id}</span>
                    <span className="pill project-chip">{issue.projectId} · {issue.projectName}</span>
                    <strong>{issue.title}</strong>
                    <small>{issue.location}</small>
                    <div className="workflow-card-meta">
                      <PriorityBadge priority={issue.priority} />
                      <span>{issue.subcontractor}</span>
                    </div>
                  </Link>
                ))}
              </div>
            </article>
          );
        })}

        {!filteredIssues.length ? <p className="card empty-list">Nincs megjeleníthető hiba.</p> : null}
      </section>
    </>
  );
}
