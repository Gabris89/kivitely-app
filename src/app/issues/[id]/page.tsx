import Link from "next/link";
import { notFound } from "next/navigation";
import { getIssue, getIssueEvents, getIssueEvidence } from "@/lib/repository";
import { formatDate } from "@/lib/format";
import { getIssueTigReadiness } from "@/lib/issueMetrics";
import { PageHeader } from "@/components/PageHeader";
import { EvidenceChecklist } from "@/components/EvidenceChecklist";
import { EvidenceMetadataControls } from "@/components/EvidenceMetadataControls";
import { EvidencePhotoGallery } from "@/components/EvidencePhotoGallery";
import { IssueWorkflowPanel } from "@/components/IssueWorkflowPanel";
import { PriorityBadge, StatusBadge } from "@/components/StatusBadge";

export const dynamic = "force-dynamic";

export default async function IssueDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const issue = await getIssue(id);

  if (!issue) notFound();

  const [photos, events] = await Promise.all([getIssueEvidence(issue.id), getIssueEvents(issue.id)]);
  const tigReadiness = getIssueTigReadiness(issue, photos);

  return (
    <>
      <PageHeader title={`${issue.id} · ${issue.title}`}>
        <Link className="button ghost" href="/issues">Vissza</Link>
        {tigReadiness.ready ? (
          <Link className="button primary" href="/tig">TIG csomag előnézet</Link>
        ) : null}
      </PageHeader>

      <section className="detail-grid">
        <article className="card panel-large">
          <div className="section-title">
            <h2>Hiba adatai</h2>
            <StatusBadge status={issue.status} />
          </div>
          <div className="technical-description">
            <span>Műszaki leírás</span>
            <p>{issue.description || "Nincs megadva."}</p>
          </div>

          <div className="issue-detail-summary" aria-label="Hiba gyors áttekintés">
            <div className="issue-summary-card issue-summary-primary">
              <span>Felelős</span>
              <strong>{issue.subcontractor}</strong>
            </div>
            <div className="issue-summary-card">
              <span>Határidő</span>
              <strong>{formatDate(issue.dueDate)}</strong>
              <small><PriorityBadge priority={issue.priority} /></small>
            </div>
            <div className="issue-summary-card">
              <span>Helyszín</span>
              <strong>{issue.location}</strong>
            </div>
            <div className="issue-summary-card">
              <span>Szakág</span>
              <strong>{issue.trade}</strong>
            </div>
          </div>

          {!tigReadiness.ready ? (
            <div className="readiness-note">
              <strong>TIG-be jelöléshez még hiányzik</strong>
              <span>{tigReadiness.missing.join(", ")}</span>
            </div>
          ) : null}

          <h2 className="block-heading">Fotók</h2>
          <EvidenceMetadataControls issueId={issue.id} />
          <EvidencePhotoGallery issue={issue} photos={photos} />
        </article>

        <aside className="side-stack">
          <IssueWorkflowPanel issue={issue} />
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
