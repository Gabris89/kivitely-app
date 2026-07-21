import Link from "next/link";
import { listIssues } from "@/lib/repository";
import { issueStatusLabels, issueStatusOrder } from "@/lib/workflow";
import { PageHeader } from "@/components/PageHeader";
import { PriorityBadge, StatusBadge } from "@/components/StatusBadge";

export const dynamic = "force-dynamic";

export default async function AllProjectsWorkflowPage() {
  const issues = await listIssues();

  return (
    <>
      <PageHeader title="Workflow tábla" subtitle="Minden projekt hibája egy Kanban nézetben, státusz szerint csoportosítva.">
        <Link href="/issues" className="button ghost">Lista nézet</Link>
      </PageHeader>

      <section className="workflow-board">
        {issueStatusOrder.map((status) => {
          const columnIssues = issues.filter((issue) => issue.status === status);
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

              <p>{issueStatusLabels[status]} állapotú feladatok</p>
            </article>
          );
        })}
      </section>
    </>
  );
}
