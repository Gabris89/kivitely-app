import { HeaderLink, PageHeader } from "@/components/PageHeader";
import { listBlockers } from "@/lib/repository";
import { BlockerFilters } from "@/components/BlockerFilters";

export const dynamic = "force-dynamic";

export default async function BlockersPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const blockers = await listBlockers(projectId);

  return (
    <>
      <PageHeader
        title="Akadálylista"
        subtitle="Munkát lassító akadályok, kereséssel és státusz szerinti szűréssel."
      >
        <HeaderLink href={`/projects/${projectId}/blockers/new`} variant="primary">+ Új akadály</HeaderLink>
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
