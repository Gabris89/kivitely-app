import Link from "next/link";
import { listIssues, listProjects } from "@/lib/repository";
import { PageHeader } from "@/components/PageHeader";
import { WorkflowBoard } from "@/components/WorkflowBoard";

export const dynamic = "force-dynamic";

export default async function AllProjectsWorkflowPage() {
  const [issues, projects] = await Promise.all([listIssues(), listProjects()]);

  return (
    <>
      <PageHeader title="Workflow tábla" subtitle="Minden projekt hibája egy Kanban nézetben, státusz szerint csoportosítva.">
        <Link href="/issues" className="button ghost">Lista nézet</Link>
      </PageHeader>

      <WorkflowBoard issues={issues} projects={projects} />
    </>
  );
}
