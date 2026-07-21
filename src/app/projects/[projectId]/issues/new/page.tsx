import { getProjectByPublicId, listSubcontractors } from "@/lib/repository";
import { NewIssueForm } from "@/components/NewIssueForm";
import { PageHeader } from "@/components/PageHeader";

export const dynamic = "force-dynamic";

export default async function NewIssuePage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const [project, subcontractors] = await Promise.all([getProjectByPublicId(projectId), listSubcontractors()]);

  if (!project) return null;

  return (
    <>
      <PageHeader title="Új hiba" />
      <NewIssueForm projectId={projectId} projectName={project.name} subcontractors={subcontractors} />
    </>
  );
}
