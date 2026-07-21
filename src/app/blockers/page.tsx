import { listBlockers, listProjects } from "@/lib/repository";
import { PageHeader } from "@/components/PageHeader";
import { BlockerFilters } from "@/components/BlockerFilters";

export const dynamic = "force-dynamic";

export default async function AllBlockersPage() {
  const [blockers, projects] = await Promise.all([listBlockers(), listProjects()]);

  return (
    <>
      <PageHeader title="Összes akadály" subtitle="Minden projekt akadálylistája egy helyen, projektenkénti szűréssel a keresőben." />

      <section className="card panel-large">
        <div className="section-title">
          <h2>Akadályok</h2>
          <span className="pill">összes projekt</span>
        </div>
        <BlockerFilters blockers={blockers} showProject projects={projects} />
      </section>
    </>
  );
}
