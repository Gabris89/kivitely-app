"use client";

import { useMemo, useState } from "react";
import type { Issue, IssueStatus } from "@/types";
import { issueStatusLabels, issueStatusOrder } from "@/lib/workflow";
import { IssueTable } from "@/components/IssueTable";

type Filter = "all" | IssueStatus;

export function IssueFilters({ issues }: { issues: Issue[] }) {
  const [statusFilter, setStatusFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");

  const filteredIssues = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return issues.filter((issue) => {
      const matchesStatus = statusFilter === "all" || issue.status === statusFilter;
      const matchesSearch = !normalizedSearch || [issue.id, issue.title, issue.location, issue.subcontractor, issue.assignee]
        .join(" ")
        .toLowerCase()
        .includes(normalizedSearch);

      return matchesStatus && matchesSearch;
    });
  }, [issues, search, statusFilter]);

  return (
    <div className="issue-filter-stack">
      <div className="filter-toolbar">
        <label className="search-box">
          <span>Keresés</span>
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="ID, hiba, helyszín, alvállalkozó..." />
        </label>
        <span className="pill">{filteredIssues.length} találat</span>
      </div>

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

      <IssueTable issues={filteredIssues} />
    </div>
  );
}
