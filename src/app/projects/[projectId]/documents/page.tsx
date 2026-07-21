import { PageHeader } from "@/components/PageHeader";
import { ProjectDocumentUploadForm } from "@/components/ProjectDocumentUploadForm";
import { DocumentFilters } from "@/components/DocumentFilters";
import { listProjectDocuments } from "@/lib/repository";

export const dynamic = "force-dynamic";

export default async function DocumentsPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const documents = await listProjectDocuments(projectId);

  return (
    <>
      <PageHeader
        title="Dokumentumok"
        subtitle="Projekt szintű tervek és dokumentumok feltöltése, megnyitása és áttekintése."
      />

      <ProjectDocumentUploadForm projectId={projectId} />

      <DocumentFilters documents={documents} />
    </>
  );
}
