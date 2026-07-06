import { listIssues } from "@/lib/repository";
import { HeaderLink, PageHeader } from "@/components/PageHeader";
import { IssueFilters } from "@/components/IssueFilters";

export default async function IssuesPage() {
  const issues = await listIssues();

  return (
    <>
      <PageHeader title="Hibalista" subtitle="Excel helyett kereshető, státuszos, fotóval bizonyítható lista.">
        <HeaderLink href="/workflow" variant="ghost">Workflow tábla</HeaderLink>
        <HeaderLink href="/issues/new" variant="primary">+ Új hiba</HeaderLink>
      </PageHeader>

      <section className="card panel-large">
        <div className="section-title">
          <h2>Aktív hibák</h2>
          <span className="pill">szűrés · keresés · státusz</span>
        </div>
        <IssueFilters issues={issues} />
      </section>
    </>
  );
}
