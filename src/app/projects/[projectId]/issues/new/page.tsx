import { getProjectByPublicId, listSubcontractors } from "@/lib/repository";
import { NewIssueForm } from "@/components/NewIssueForm";
import { PageHeader } from "@/components/PageHeader";
import { AccessDenied } from "@/components/AccessDenied";
import { hasPermission } from "@/lib/permissions.server";

export const dynamic = "force-dynamic";

export default async function NewIssuePage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const [project, subcontractors] = await Promise.all([getProjectByPublicId(projectId), listSubcontractors()]);

  if (!project) return null;

  if (!(await hasPermission("issue.create"))) {
    return (
      <>
        <PageHeader title="Új hiba" />
        <AccessDenied message="Új hibát az építésvezető, a projektvezető és az adminisztrátor rögzíthet." />
      </>
    );
  }

  return (
    <>
      <PageHeader title="Új hiba" />
      <NewIssueForm projectId={projectId} projectName={project.name} subcontractors={subcontractors} />
    </>
  );
}
