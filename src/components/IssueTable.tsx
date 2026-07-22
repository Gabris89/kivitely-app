import Link from "next/link";
import { formatDate } from "@/lib/format";
import { issueStatusLabels } from "@/lib/workflow";
import type { Issue } from "@/types";
import { ChevronRightIcon } from "@/components/ActionIcons";

export function IssueTable({ issues, showProject = false }: { issues: Issue[]; showProject?: boolean }) {
  if (!issues.length) {
    return <p className="card empty-list">Nincs megjeleníthető hiba.</p>;
  }

  return (
    <div className="entity-list" aria-label="Hibák">
      {issues.map((issue) => (
        <Link key={issue.id} className="entity-row" href={`/projects/${issue.projectId}/issues/${issue.id}`}>
          <div className="entity-row-main">
            <strong>{issue.id} · {issue.title}</strong>
            <span>
              {issueStatusLabels[issue.status]}
              {showProject ? ` · ${issue.projectId} · ${issue.projectName}` : ""}
              {` · ${issue.subcontractor} · Határidő: ${formatDate(issue.dueDate)}`}
            </span>
          </div>
          <span className="entity-row-chevron"><ChevronRightIcon /></span>
        </Link>
      ))}
    </div>
  );
}
