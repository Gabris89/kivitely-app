import Link from "next/link";
import { notFound } from "next/navigation";
import { getIssue, getIssueEvents, getIssueEvidence, listSubcontractors } from "@/lib/repository";
import { formatDate } from "@/lib/format";
import { getIssueTigReadiness } from "@/lib/issueMetrics";
import { PageHeader } from "@/components/PageHeader";
import { EvidenceChecklist } from "@/components/EvidenceChecklist";
import { IssueDetailPanel } from "@/components/IssueDetailPanel";

export const dynamic = "force-dynamic";

export default async function IssueDetailPage({ params }: { params: Promise<{ projectId: string; id: string }> }) {
  const { projectId, id } = await params;
  const issue = await getIssue(id, projectId);

  if (!issue) notFound();

  const [photos, events, subcontractors] = await Promise.all([
    getIssueEvidence(issue.id),
    getIssueEvents(issue.id),
    listSubcontractors()
  ]);
  const tigReadiness = getIssueTigReadiness(issue, photos);

  return (
    <>
      <PageHeader title={`${issue.id} · ${issue.title}`}>
        <Link className="button ghost" href={`/projects/${projectId}/issues`}>Vissza</Link>
        {tigReadiness.ready ? (
          <Link className="button primary" href={`/projects/${projectId}/tig`}>TIG csomag előnézet</Link>
        ) : null}
      </PageHeader>

      <section className="detail-grid">
        <IssueDetailPanel projectId={projectId} issue={issue} photos={photos} subcontractors={subcontractors} />

        <aside className="side-stack">
          <EvidenceChecklist issue={issue} photos={photos} />

          <details className="card panel timeline-panel timeline-disclosure">
            <summary className="section-title">
              <h2>Státusztörténet</h2>
              <span className="pill">audit trail</span>
            </summary>
            <div className="timeline">
              {events.length > 0 ? events.map((event) => (
                <div key={event.id}>
                  <strong>{event.title}</strong>
                  <span>{event.description}</span>
                  <small>{event.actor} · {event.createdAt}</small>
                </div>
              )) : (
                <>
                  <div><strong>Hiba rögzítve</strong><span>{formatDate(issue.createdAt)} · művezető</span></div>
                  <div><strong>Alvállalkozónak kiosztva</strong><span>{issue.subcontractor}</span></div>
                  <div><strong>Utolsó frissítés</strong><span>{formatDate(issue.updatedAt)}</span></div>
                </>
              )}
            </div>
          </details>
        </aside>
      </section>
    </>
  );
}
