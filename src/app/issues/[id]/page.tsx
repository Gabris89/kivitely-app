import Link from "next/link";
import { notFound } from "next/navigation";
import { getIssue, getIssueEvents, getIssueEvidence } from "@/lib/repository";
import { formatDate, formatHuf } from "@/lib/format";
import { getIssueTigReadiness } from "@/lib/issueMetrics";
import { PageHeader } from "@/components/PageHeader";
import { EvidenceChecklist } from "@/components/EvidenceChecklist";
import { EvidenceMetadataControls } from "@/components/EvidenceMetadataControls";
import { IssueWorkflowPanel } from "@/components/IssueWorkflowPanel";
import { PriorityBadge, StatusBadge } from "@/components/StatusBadge";

export const dynamic = "force-dynamic";

export default async function IssueDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const issue = await getIssue(id);

  if (!issue) notFound();

  const [photos, events] = await Promise.all([getIssueEvidence(issue.id), getIssueEvents(issue.id)]);
  const tigReadiness = getIssueTigReadiness(issue, photos);
  const beforeCount = photos.filter((photo) => photo.type === "before_photo").length;
  const afterCount = photos.filter((photo) => photo.type === "after_photo").length;

  return (
    <>
      <PageHeader title={`${issue.id} · ${issue.title}`} subtitle="Hiba részletező · fotók · felelős · státusztörténet">
        <Link className="button ghost" href="/issues">Vissza</Link>
        {tigReadiness.ready ? (
          <Link className="button primary" href="/tig">TIG csomag előnézet</Link>
        ) : (
          <span className="button ghost disabled-control">TIG feltételek hiányoznak</span>
        )}
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

          <div className="meta-grid">
            <div><span>Helyszín</span><strong>{issue.location}</strong></div>
            <div><span>Szakág</span><strong>{issue.trade}</strong></div>
            <div><span>Felelős</span><strong>{issue.subcontractor}</strong></div>
            <div><span>Kapcsolattartó</span><strong>{issue.assignee}</strong></div>
            <div><span>Határidő</span><strong>{formatDate(issue.dueDate)}</strong></div>
            <div><span>Prioritás</span><strong><PriorityBadge priority={issue.priority} /></strong></div>
            <div><span>TIG érték</span><strong>{formatHuf(issue.valueHuf)}</strong></div>
            <div>
              <span>TIG készenlét</span>
              <strong className={tigReadiness.ready ? "ready-text" : "warn-text"}>{tigReadiness.label}</strong>
            </div>
          </div>

          {!tigReadiness.ready ? (
            <div className="readiness-note">
              <strong>TIG-be jelöléshez még hiányzik</strong>
              <span>{tigReadiness.missing.join(", ")}</span>
            </div>
          ) : null}

          <h2 className="block-heading">Fotós bizonyítás</h2>
          <p className="description-text">
            Előtte: {beforeCount} db · utána: {afterCount} db. A valós feltöltés később Supabase Storage-ra kerül.
          </p>
          <EvidenceMetadataControls issueId={issue.id} />
          <div className="photo-grid">
            {photos.length > 0 ? photos.map((photo) => (
              <div className="photo-card" key={photo.id}>
                <span>{photo.type === "before_photo" ? "előtte" : "utána"}</span>
                <small>{photo.label}</small>
              </div>
            )) : Array.from({ length: Math.max(3, issue.photosBefore + issue.photosAfter) }).map((_, index) => (
              <div className="photo-card" key={index}>
                <span>{index < issue.photosBefore ? "előtte" : "utána"}</span>
              </div>
            ))}
          </div>
        </article>

        <aside className="side-stack">
          <IssueWorkflowPanel issue={issue} />
          <EvidenceChecklist issue={issue} photos={photos} />

          <article className="card panel timeline-panel">
            <div className="section-title">
              <h2>Státusztörténet</h2>
              <span className="pill">audit trail</span>
            </div>
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
          </article>
        </aside>
      </section>
    </>
  );
}
