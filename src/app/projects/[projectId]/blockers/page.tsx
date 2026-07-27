import { HeaderLink, PageHeader } from "@/components/PageHeader";
import { listBlockers } from "@/lib/repository";
import { BlockerFilters } from "@/components/BlockerFilters";
import { hasPermission } from "@/lib/permissions.server";

export const dynamic = "force-dynamic";

export default async function BlockersPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const [blockers, canCreate] = await Promise.all([listBlockers(projectId), hasPermission("blocker.create")]);

  return (
    <>
      <PageHeader
        title="Akadálylista"
        subtitle="Munkát lassító akadályok, kereséssel és státusz szerinti szűréssel."
      >
        {canCreate ? (
          <HeaderLink href={`/projects/${projectId}/blockers/new`} variant="primary">+ Új akadály</HeaderLink>
        ) : null}
      </PageHeader>

      <section className="card panel-large">
        <div className="section-title">
          <h2>Akadályok</h2>
        </div>
        <BlockerFilters blockers={blockers} />
      </section>
    </>
  );
}
