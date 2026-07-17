import { PageHeader } from "@/components/PageHeader";
import { ProjectDocumentUploadForm } from "@/components/ProjectDocumentUploadForm";
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

function formatScope(trade?: string, area?: string) {
  return [trade, area].filter(Boolean).join(" / ") || "Nincs megadva";
}

export default async function DocumentsPage() {
  const documents = await listProjectDocuments();

  return (
    <>
      <PageHeader
        title="Dokumentumok"
        subtitle="Projekt szintű tervek és dokumentumok feltöltése, megnyitása és áttekintése."
      />

      <ProjectDocumentUploadForm />

      <section className="document-list" aria-label="Projekt dokumentumok és tervek">
        {documents.map((document) => {
          const documentScope = formatScope(document.trade, document.area);
          const fileName = document.fileName || "Nincs megadva";

          return (
            <article className="card document-card" key={document.id}>
              <div className="document-card-head">
                <div className="document-title-block">
                  <span>{document.projectName}</span>
                  <h2>{document.title}</h2>
                </div>
                <div className="document-badges" aria-label="Dokumentum állapot">
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
                  <dd>{documentScope}</dd>
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
                  <dt>Frissítve</dt>
                  <dd>{formatDate(document.updatedAt)}</dd>
                </div>
              </dl>

              <div className="document-file" aria-label="Fájl metadata">
                <div>
                  <span>Fájlnév</span>
                  <strong title={fileName}>{fileName}</strong>
                </div>
                <div>
                  <span>Fájlméret</span>
                  <strong>{formatFileSize(document.fileSizeBytes)}</strong>
                </div>
                <div className="document-open-action">
                  <span>Megnyitás</span>
                  {document.url ? (
                    <a className="button ghost" href={document.url} target="_blank" rel="noreferrer">
                      Fájl megnyitása
                    </a>
                  ) : document.storagePath ? (
                    <strong>Nincs Storage URL</strong>
                  ) : (
                    <strong>Nincs feltöltött fájl</strong>
                  )}
                </div>
              </div>
            </article>
          );
        })}

        {!documents.length ? (
          <div className="card empty-list document-empty">
            <strong>Nincs megjeleníthető dokumentum.</strong>
            <span>
              Ha Supabase nincs elérhető vagy még nincs project_documents seed, az oldal read-only módban üres állapotot
              mutat.
            </span>
          </div>
        ) : null}
      </section>
    </>
  );
}
