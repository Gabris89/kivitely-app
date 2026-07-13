import { PageHeader } from "@/components/PageHeader";
import { formatDate } from "@/lib/format";
import { listProjectDocuments } from "@/lib/repository";
import type { ProjectDocumentType, ProjectDocumentVisibility } from "@/types";

export const dynamic = "force-dynamic";

const documentTypeLabels: Record<ProjectDocumentType, string> = {
  architectural_plan: "Építész terv",
  technical_plan: "Műszaki terv",
  material_spec: "Anyagspecifikáció",
  photo_document: "Fotódokumentum",
  contract_document: "Szerződéses dokumentum",
  other: "Egyéb"
};

const visibilityLabels: Record<ProjectDocumentVisibility, string> = {
  internal: "Belső",
  project_team: "Projektcsapat",
  workers: "Munkavállalók",
  subcontractors: "Alvállalkozók",
  viewer_shared: "Megosztott néző"
};

function formatFileSize(value?: number) {
  if (!value) return "Nincs megadva";

  if (value >= 1024 * 1024) {
    return `${new Intl.NumberFormat("hu-HU", { maximumFractionDigits: 1 }).format(value / 1024 / 1024)} MB`;
  }

  return `${new Intl.NumberFormat("hu-HU", { maximumFractionDigits: 0 }).format(value / 1024)} KB`;
}

export default async function DocumentsPage() {
  const documents = await listProjectDocuments();

  return (
    <>
      <PageHeader
        title="Dokumentumok"
        subtitle="Read-only áttekintés projekt szintű tervekről és dokumentum metadata rekordokról."
      />

      <section className="document-list" aria-label="Projekt dokumentumok és tervek">
        {documents.map((document) => (
          <article className="card document-card" key={document.id}>
            <div className="document-card-head">
              <div>
                <span>{document.projectName}</span>
                <h2>{document.title}</h2>
              </div>
              <div className="document-badges">
                <span className={`status document-type document-type-${document.documentType}`}>
                  {documentTypeLabels[document.documentType]}
                </span>
                <span className={document.isCurrent ? "status document-current" : "status document-archived"}>
                  {document.isCurrent ? "Aktuális" : "Archivált"}
                </span>
              </div>
            </div>

            {document.description ? <p>{document.description}</p> : null}

            <dl className="document-meta">
              <div>
                <dt>Szakma / terület</dt>
                <dd>{[document.trade, document.area].filter(Boolean).join(" · ") || "Nincs megadva"}</dd>
              </div>
              <div>
                <dt>Revision</dt>
                <dd>{document.revision || "Nincs megadva"}</dd>
              </div>
              <div>
                <dt>Visibility</dt>
                <dd>{visibilityLabels[document.visibility]}</dd>
              </div>
              <div>
                <dt>Fájlnév</dt>
                <dd>{document.fileName || "Nincs megadva"}</dd>
              </div>
              <div>
                <dt>Fájlméret</dt>
                <dd>{formatFileSize(document.fileSizeBytes)}</dd>
              </div>
              <div>
                <dt>Frissítve</dt>
                <dd>{formatDate(document.updatedAt)}</dd>
              </div>
            </dl>
          </article>
        ))}

        {!documents.length ? <p className="card empty-list">Nincs rögzített dokumentum metadata.</p> : null}
      </section>
    </>
  );
}
