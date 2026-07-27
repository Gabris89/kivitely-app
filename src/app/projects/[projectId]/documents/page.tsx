import { PageHeader } from "@/components/PageHeader";
import { ProjectDocumentUploadForm } from "@/components/ProjectDocumentUploadForm";
import { DocumentFilters } from "@/components/DocumentFilters";
import { listProjectDocuments } from "@/lib/repository";
import { hasPermission } from "@/lib/permissions.server";

export const dynamic = "force-dynamic";

export default async function DocumentsPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const [documents, canUpload, canDelete, canMeasure, canDeleteMeasurement] = await Promise.all([
    listProjectDocuments(projectId),
    hasPermission("document.create"),
    hasPermission("document.delete"),
    hasPermission("measurement.create"),
    hasPermission("measurement.delete")
  ]);

  return (
    <>
      <PageHeader
        title="Dokumentumok"
        subtitle={
          canUpload
            ? "Projekt szintű tervek és dokumentumok feltöltése, megnyitása és áttekintése."
            : "Projekt szintű tervek és dokumentumok megnyitása és áttekintése."
        }
      />

      {canUpload ? <ProjectDocumentUploadForm projectId={projectId} /> : null}

      <DocumentFilters
        documents={documents}
        canDelete={canDelete}
        canMeasure={canMeasure}
        canDeleteMeasurement={canDeleteMeasurement}
      />
    </>
  );
}
