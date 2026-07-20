import { PageHeader } from "@/components/PageHeader";
import { ProjectDocumentUploadForm } from "@/components/ProjectDocumentUploadForm";
import { DocumentFilters } from "@/components/DocumentFilters";
import { listProjectDocuments } from "@/lib/repository";

export const dynamic = "force-dynamic";

export default async function DocumentsPage() {
  const documents = await listProjectDocuments();

  return (
    <>
      <PageHeader
        title="Dokumentumok"
        subtitle="Projekt szintű tervek és dokumentumok feltöltése, megnyitása és áttekintése."
      />

      <ProjectDocumentUploadForm />

      <DocumentFilters documents={documents} />
    </>
  );
}
