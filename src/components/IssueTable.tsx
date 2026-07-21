import Link from "next/link";
import { formatDate, formatHuf } from "@/lib/format";
import { getEvidenceChecklistStatus, getIssueTigReadiness } from "@/lib/issueMetrics";
import type { Issue } from "@/types";
import { PriorityBadge, StatusBadge } from "./StatusBadge";

function IssueFieldCard({ issue, showProject }: { issue: Issue; showProject: boolean }) {
  const evidence = getEvidenceChecklistStatus(issue);
  const tig = getIssueTigReadiness(issue);
  const photoCount = issue.photosBefore + issue.photosAfter;

  return (
    <Link href={`/projects/${issue.projectId}/issues/${issue.id}`} className="issue-card">
      <div className="issue-card-head">
        <span className="id-link">{issue.id}</span>
        <StatusBadge status={issue.status} />
      </div>
      <strong>{issue.title}</strong>
      <div className="issue-card-meta">
        {showProject ? <span className="pill project-chip">{issue.projectId} · {issue.projectName}</span> : null}
        <span>{issue.location}</span>
        <span>{issue.subcontractor}</span>
      </div>
      <div className="issue-card-flags">
        <PriorityBadge priority={issue.priority} />
        <span className={tig.ready ? "readiness ok" : "readiness warn"}>{tig.label}</span>
      </div>
      <small>
        {photoCount} fotó · <span className={evidence.afterPhoto ? "flag-ok" : "flag-warn"}>{evidence.afterPhoto ? "utána kész" : "utána hiányzik"}</span> · Határidő: {formatDate(issue.dueDate)} · {formatHuf(issue.valueHuf)}
      </small>
    </Link>
  );
}

export function IssueTable({ issues, compact = false, showProject = false }: { issues: Issue[]; compact?: boolean; showProject?: boolean }) {
  return (
    <>
      <div className="issue-card-list">
        {issues.map((issue) => (
          <IssueFieldCard issue={issue} showProject={showProject} key={issue.id} />
        ))}
      </div>

      <div className="table-wrap">
        <table className="issue-table">
          <thead>
            <tr>
              <th>ID</th>
              {showProject ? <th>Projekt</th> : null}
              <th>Hiba</th>
              {!compact ? <th>Helyszín</th> : null}
              <th>Felelős</th>
              <th>Határidő</th>
              {!compact ? <th>Érték</th> : null}
              <th>Státusz</th>
            </tr>
          </thead>
          <tbody>
            {issues.map((issue) => (
              <tr key={issue.id}>
                <td>
                  <Link href={`/projects/${issue.projectId}/issues/${issue.id}`} className="id-link">
                    {issue.id}
                  </Link>
                </td>
                {showProject ? (
                  <td>
                    <div className="issue-title-cell">
                      <Link href={`/projects/${issue.projectId}`} className="id-link">{issue.projectId}</Link>
                      <span>{issue.projectName}</span>
                    </div>
                  </td>
                ) : null}
                <td>
                  <div className="issue-title-cell">
                    <strong>{issue.title}</strong>
                    <span>
                      <PriorityBadge priority={issue.priority} /> {issue.photosBefore + issue.photosAfter} fotó · {getIssueTigReadiness(issue).label}
                    </span>
                  </div>
                </td>
                {!compact ? <td>{issue.location}</td> : null}
                <td>{issue.subcontractor}</td>
                <td>{formatDate(issue.dueDate)}</td>
                {!compact ? <td>{formatHuf(issue.valueHuf)}</td> : null}
                <td>
                  <StatusBadge status={issue.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
