import { listIssues } from "@/lib/repository";
import { HeaderLink, PageHeader } from "@/components/PageHeader";
import { IssueFilters } from "@/components/IssueFilters";
import { hasPermission } from "@/lib/permissions.server";

export const dynamic = "force-dynamic";

export default async function IssuesPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const [issues, canCreate] = await Promise.all([listIssues(projectId), hasPermission("issue.create")]);

  return (
    <>
      <PageHeader title="Hibalista" subtitle="Excel helyett kereshető, státuszos, fotóval bizonyítható lista.">
        <HeaderLink href={`/projects/${projectId}/workflow`} variant="ghost">Workflow tábla</HeaderLink>
        {canCreate ? (
          <HeaderLink href={`/projects/${projectId}/issues/new`} variant="primary">+ Új hiba</HeaderLink>
        ) : null}
      </PageHeader>

      <section className="card panel-large">
        <div className="section-title">
          <h2>Aktív hibák</h2>
        </div>
        <IssueFilters issues={issues} />
      </section>
    </>
  );
}
