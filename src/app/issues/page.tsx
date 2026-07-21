import { listIssues, listProjects } from "@/lib/repository";
import { HeaderLink, PageHeader } from "@/components/PageHeader";
import { IssueFilters } from "@/components/IssueFilters";

export const dynamic = "force-dynamic";

export default async function AllIssuesPage() {
  const [issues, projects] = await Promise.all([listIssues(), listProjects()]);

  return (
    <>
      <PageHeader title="Összes hiba" subtitle="Minden projekt hibalistája egy helyen, projektenkénti szűréssel a keresőben.">
        <HeaderLink href="/workflow" variant="ghost">Workflow tábla</HeaderLink>
      </PageHeader>

      <section className="card panel-large">
        <div className="section-title">
          <h2>Aktív hibák</h2>
          <span className="pill">összes projekt</span>
        </div>
        <IssueFilters issues={issues} showProject projects={projects} />
      </section>
    </>
  );
}
