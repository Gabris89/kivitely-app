import Link from "next/link";
import { listIssues } from "@/lib/repository";
import { issueStatusLabels, issueStatusOrder } from "@/lib/workflow";
import { PageHeader } from "@/components/PageHeader";
import { PriorityBadge, StatusBadge } from "@/components/StatusBadge";

export default async function WorkflowPage() {
  const issues = await listIssues();

  return (
    <>
      <PageHeader title="Workflow tábla" subtitle="A hibalista Kanban nézete: innen látszik, hol akad el a kivitelezési folyamat.">
        <Link href="/issues" className="button ghost">Lista nézet</Link>
        <Link href="/issues/new" className="button primary">+ Új hiba</Link>
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
                  <Link className="workflow-card" href={`/issues/${issue.id}`} key={issue.id}>
                    <span className="id-link">{issue.id}</span>
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
