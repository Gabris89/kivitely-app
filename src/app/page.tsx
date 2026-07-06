import { activities } from "@/data/mock";
import { formatHuf } from "@/lib/format";
import { calculateDashboardMetrics } from "@/lib/issueMetrics";
import { getProject, listIssues, listSubcontractors, listTigItems } from "@/lib/repository";
import { HeaderLink, PageHeader } from "@/components/PageHeader";
import { IssueTable } from "@/components/IssueTable";
import { KpiCard } from "@/components/KpiCard";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [project, issues, subcontractors] = await Promise.all([getProject(), listIssues(), listSubcontractors()]);
  const tigItems = listTigItems();
  const metrics = calculateDashboardMetrics(issues, tigItems);

  return (
    <>
      <PageHeader title={project.name} subtitle={`${project.phase} · ${project.address}`}>
        <HeaderLink href="/workflow" variant="ghost">Workflow tábla</HeaderLink>
        <HeaderLink href="/issues" variant="ghost">Hibalista</HeaderLink>
        <HeaderLink href="/issues/new" variant="primary">+ Új hiba</HeaderLink>
      </PageHeader>

      <section className="hero-card">
        <div>
          <span className="eyebrow">MVP demo fókusz</span>
          <h2>Hiba → alvállalkozó → fotós bizonyítás → TIG</h2>
          <p>
            Kivitely most mock-data MVP: státuszlogika, API route váz, szűrhető hibalista és TIG-ready bizonyítéklogika segíti a terepi validációt.
          </p>
        </div>
        <div className="hero-progress">
          <strong>{project.progress}%</strong>
          <span>projekt készültség</span>
        </div>
      </section>

      <section className="kpi-grid">
        <KpiCard label="Nyitott hibák" value={metrics.openIssues} trend="aktív terepi feladat" />
        <KpiCard label="Kritikus nyitott" value={metrics.overdueIssues} trend="vezetői figyelmet kér" />
        <KpiCard label="Ellenőrzésre vár" value={metrics.readyIssues} trend="elfogadásra vár" />
        <KpiCard label="TIG csomag értéke" value={formatHuf(metrics.tigValueHuf)} trend={`${metrics.missingProofCount} hiányzó proof`} />
      </section>

      <section className="dashboard-grid">
        <article className="card panel-large">
          <div className="section-title">
            <h2>Legfontosabb nyitott hibák</h2>
            <span className="pill">ma · lejárt · sürgős</span>
          </div>
          <IssueTable issues={issues.slice(0, 4)} compact />
        </article>

        <aside className="side-stack">
          <article className="card panel">
            <div className="section-title">
              <h2>Alvállalkozói terhelés</h2>
              <span className="pill">nyitott</span>
            </div>
            <div className="load-list">
              {subcontractors.map((sub) => (
                <div key={sub.id} className="load-row">
                  <span>{sub.trade}</span>
                  <div className="bar"><i style={{ width: `${Math.min(100, sub.openIssues * 7)}%` }} /></div>
                  <strong>{sub.openIssues}</strong>
                </div>
              ))}
            </div>
          </article>

          <article className="card panel">
            <div className="section-title">
              <h2>Aktivitásnapló</h2>
              <span className="pill live">élő</span>
            </div>
            <div className="activity-list">
              {activities.map((activity) => (
                <div key={activity.id} className="activity-item">
                  <span>{activity.icon}</span>
                  <div>
                    <strong>{activity.title}</strong>
                    <small>{activity.description} · {activity.time}</small>
                  </div>
                </div>
              ))}
            </div>
          </article>
        </aside>
      </section>
    </>
  );
}
