import { PageHeader } from "@/components/PageHeader";
import { formatDate } from "@/lib/format";
import { listWorkLogs } from "@/lib/repository";
import type { WorkLogStatus } from "@/types";

export const dynamic = "force-dynamic";

const statusLabels: Record<WorkLogStatus, string> = {
  draft: "Piszkozat",
  submitted: "Leadva",
  reviewed: "Ellenőrizve",
  accepted: "Elfogadva",
  rejected: "Visszadobva"
};

function formatQuantity(quantity?: number, unit?: string) {
  if (quantity === undefined) return "Nincs megadva";

  const formatted = new Intl.NumberFormat("hu-HU", {
    maximumFractionDigits: 2
  }).format(quantity);

  return unit ? `${formatted} ${unit}` : formatted;
}

export default async function WorkLogsPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const workLogs = await listWorkLogs(projectId);

  return (
    <>
      <PageHeader
        title="Teljesítménynapló"
        subtitle="Read-only terepi munkarögzítés projekt, szakma, dátum és felelős szerint."
      />

      <section className="work-log-list" aria-label="Teljesítménynapló bejegyzések">
        {workLogs.map((log) => (
          <article className="card work-log-card" key={log.id}>
            <div className="work-log-head">
              <div>
                <span>{formatDate(log.workDate)}</span>
                <h2>{log.projectName}</h2>
              </div>
              <span className={`status work-log-status status-${log.status}`}>{statusLabels[log.status]}</span>
            </div>

            <p>{log.description}</p>

            <dl className="work-log-meta">
              <div>
                <dt>Munkavállaló / profil</dt>
                <dd>{log.profileName}</dd>
              </div>
              <div>
                <dt>Szakma</dt>
                <dd>{log.trade}</dd>
              </div>
              <div>
                <dt>Mennyiség</dt>
                <dd>{formatQuantity(log.quantity, log.unit)}</dd>
              </div>
              <div>
                <dt>Utolsó frissítés</dt>
                <dd>{formatDate(log.updatedAt)}</dd>
              </div>
            </dl>
          </article>
        ))}
      </section>
    </>
  );
}
