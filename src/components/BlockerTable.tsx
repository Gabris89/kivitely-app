import Link from "next/link";
import { formatDate } from "@/lib/format";
import type { BlockerItem } from "@/types";
import { BlockerStatusBadge, PriorityBadge } from "./StatusBadge";

function scopeLabel(blocker: BlockerItem) {
  return [blocker.trade, blocker.area].filter(Boolean).join(" · ") || "Nincs megadva";
}

function BlockerFieldCard({ blocker, showProject }: { blocker: BlockerItem; showProject: boolean }) {
  return (
    <Link href={`/projects/${blocker.projectId}/blockers/${blocker.publicId}`} className="issue-card">
      <div className="issue-card-head">
        <span className="id-link">{blocker.publicId}</span>
        <BlockerStatusBadge status={blocker.status} />
      </div>
      <strong>{blocker.title}</strong>
      <div className="issue-card-meta">
        {showProject ? <span className="pill project-chip">{blocker.projectId} · {blocker.projectName}</span> : null}
        <span>{scopeLabel(blocker)}</span>
        <span>{blocker.responsibleName}</span>
      </div>
      <div className="issue-card-flags">
        <PriorityBadge priority={blocker.severity} />
      </div>
      <small>Létrehozva: {formatDate(blocker.createdAt)}</small>
    </Link>
  );
}

export function BlockerTable({ blockers, showProject = false }: { blockers: BlockerItem[]; showProject?: boolean }) {
  return (
    <>
      <div className="issue-card-list">
        {blockers.map((blocker) => (
          <BlockerFieldCard blocker={blocker} showProject={showProject} key={blocker.id} />
        ))}
      </div>

      <div className="table-wrap">
        <table className="issue-table">
          <thead>
            <tr>
              <th>ID</th>
              {showProject ? <th>Projekt</th> : null}
              <th>Akadály</th>
              <th>Szakma / terület</th>
              <th>Felelős</th>
              <th>Létrehozva</th>
              <th>Súlyosság</th>
              <th>Státusz</th>
            </tr>
          </thead>
          <tbody>
            {blockers.map((blocker) => (
              <tr key={blocker.id}>
                <td>
                  <Link href={`/projects/${blocker.projectId}/blockers/${blocker.publicId}`} className="id-link">
                    {blocker.publicId}
                  </Link>
                </td>
                {showProject ? (
                  <td>
                    <div className="issue-title-cell">
                      <Link href={`/projects/${blocker.projectId}`} className="id-link">{blocker.projectId}</Link>
                      <span>{blocker.projectName}</span>
                    </div>
                  </td>
                ) : null}
                <td>
                  <div className="issue-title-cell">
                    <strong>{blocker.title}</strong>
                  </div>
                </td>
                <td>{scopeLabel(blocker)}</td>
                <td>{blocker.responsibleName}</td>
                <td>{formatDate(blocker.createdAt)}</td>
                <td>
                  <PriorityBadge priority={blocker.severity} />
                </td>
                <td>
                  <BlockerStatusBadge status={blocker.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!blockers.length ? <p className="card empty-list">Nincs megjeleníthető akadály.</p> : null}
    </>
  );
}
