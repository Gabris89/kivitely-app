import { listProjects, listIssues, listBlockers } from "@/lib/repository";
import { PageHeader } from "@/components/PageHeader";
import { issueStatusLabels, issueStatusOrder } from "@/lib/workflow";

export const dynamic = "force-dynamic";

const activeBlockerStatuses = ["open", "in_progress", "waiting_external"];

export default async function DashboardPage() {
  const [projects, issues, blockers] = await Promise.all([listProjects(), listIssues(), listBlockers()]);

  const openIssues = issues.filter((issue) => issue.status !== "closed").length;
  const activeBlockers = blockers.filter((blocker) => activeBlockerStatuses.includes(blocker.status)).length;
  const overdueIssues = issues.filter((issue) => issue.status !== "closed" && new Date(issue.dueDate) < new Date()).length;

  const issuesByStatus = issueStatusOrder.map((status) => ({
    key: status,
    label: issueStatusLabels[status],
    count: issues.filter((issue) => issue.status === status).length
  }));
  const maxStatusCount = Math.max(1, ...issuesByStatus.map((row) => row.count));

  const issuesByProject = projects
    .map((project) => ({
      key: project.id,
      label: project.name,
      count: issues.filter((issue) => issue.projectId === project.publicId && issue.status !== "closed").length
    }))
    .sort((a, b) => b.count - a.count);
  const maxProjectCount = Math.max(1, ...issuesByProject.map((row) => row.count));

  return (
    <>
      <PageHeader title="Áttekintés" subtitle="Gyors kép az összes projektről." />

      <section className="dashboard-stats" aria-label="Fő mutatók">
        <div className="card stat-card">
          <span>Projektek</span>
          <strong>{projects.length}</strong>
        </div>
        <div className="card stat-card">
          <span>Nyitott hibák</span>
          <strong>{openIssues}</strong>
        </div>
        <div className="card stat-card">
          <span>Aktív akadályok</span>
          <strong>{activeBlockers}</strong>
        </div>
        <div className="card stat-card">
          <span>Lejárt hibák</span>
          <strong>{overdueIssues}</strong>
        </div>
      </section>

      <section className="dashboard-charts">
        <div className="card panel-large">
          <div className="section-title">
            <h2>Hibák állapot szerint</h2>
          </div>
          <div className="bar-chart">
            {issuesByStatus.map((row) => (
              <div className="bar-row" key={row.key}>
                <span>{row.label}</span>
                <div className="bar-track">
                  <div className="bar-fill" style={{ width: `${(row.count / maxStatusCount) * 100}%` }} />
                </div>
                <strong>{row.count}</strong>
              </div>
            ))}
          </div>
        </div>

        <div className="card panel-large">
          <div className="section-title">
            <h2>Nyitott hibák projektenként</h2>
          </div>
          {issuesByProject.length ? (
            <div className="bar-chart">
              {issuesByProject.map((row) => (
                <div className="bar-row" key={row.key}>
                  <span>{row.label}</span>
                  <div className="bar-track">
                    <div className="bar-fill" style={{ width: `${(row.count / maxProjectCount) * 100}%` }} />
                  </div>
                  <strong>{row.count}</strong>
                </div>
              ))}
            </div>
          ) : (
            <p className="empty-list">Még nincs projekt.</p>
          )}
        </div>
      </section>
    </>
  );
}
