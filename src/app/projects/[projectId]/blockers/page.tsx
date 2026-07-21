import { HeaderLink, PageHeader } from "@/components/PageHeader";
import { formatDate } from "@/lib/format";
import { listActiveBlockers } from "@/lib/repository";
import type { BlockerSeverity, BlockerStatus } from "@/types";

export const dynamic = "force-dynamic";

const statusLabels: Record<BlockerStatus, string> = {
  open: "Nyitott",
  in_progress: "Folyamatban",
  waiting_external: "Külsőre vár",
  resolved: "Megoldva",
  closed: "Lezárva",
  cancelled: "Tárgytalan"
};

const severityLabels: Record<BlockerSeverity, string> = {
  low: "Alacsony",
  normal: "Normál",
  high: "Magas",
  critical: "Kritikus"
};

export default async function BlockersPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const blockers = await listActiveBlockers(projectId);

  return (
    <>
      <PageHeader
        title="Akadálylista"
        subtitle="Read-only áttekintés az aktív, munkát lassító akadályokról."
      >
        <HeaderLink href={`/projects/${projectId}/blockers/new`} variant="primary">+ Új akadály</HeaderLink>
      </PageHeader>

      <section className="blocker-page-list" aria-label="Aktív akadályok">
        {blockers.map((blocker) => (
          <article className={`card blocker-page-card blocker-${blocker.severity}`} key={blocker.id}>
            <div className="blocker-page-head">
              <div>
                <span>{blocker.projectName}</span>
                <h2>{blocker.title}</h2>
              </div>
              <div className="blocker-page-badges">
                <span className={`status blocker-status status-${blocker.status}`}>{statusLabels[blocker.status]}</span>
                <span className={`priority blocker-severity priority-${blocker.severity}`}>{severityLabels[blocker.severity]}</span>
              </div>
            </div>

            <p>{blocker.description}</p>

            <dl className="blocker-page-meta">
              <div>
                <dt>Szakma / terület</dt>
                <dd>{[blocker.trade, blocker.area].filter(Boolean).join(" · ") || "Nincs megadva"}</dd>
              </div>
              <div>
                <dt>Felelős</dt>
                <dd>{blocker.responsibleName}</dd>
              </div>
              <div>
                <dt>Létrehozás dátuma</dt>
                <dd>{formatDate(blocker.createdAt)}</dd>
              </div>
            </dl>
          </article>
        ))}

        {!blockers.length ? <p className="card empty-list">Nincs aktív akadály.</p> : null}
      </section>
    </>
  );
}
