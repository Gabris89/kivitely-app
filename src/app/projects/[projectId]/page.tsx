import Link from "next/link";
import { getProjectByPublicId } from "@/lib/repository";
import { HeaderLink, PageHeader } from "@/components/PageHeader";
import { ProjectDetailPanel } from "@/components/ProjectDetailPanel";
import { ChevronRightIcon } from "@/components/ActionIcons";

export const dynamic = "force-dynamic";

export default async function ProjectDashboardPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const project = await getProjectByPublicId(projectId);

  if (!project) return null;

  const modules = [
    { href: `/projects/${projectId}/issues`, title: "Hibalista", description: "Hibák rögzítése, státuszkövetés, fotós bizonyítás." },
    { href: `/projects/${projectId}/blockers`, title: "Akadálylista", description: "Munkát lassító akadályok áttekintése." },
    { href: `/projects/${projectId}/documents`, title: "Dokumentumok", description: "Tervek és projektdokumentumok." },
    { href: `/projects/${projectId}/work-logs`, title: "Teljesítménynapló", description: "Terepi munkarögzítés naplója." },
    { href: `/projects/${projectId}/tig`, title: "TIG csomag", description: "Teljesítésigazolási csomagok összeállítása." },
    { href: `/projects/${projectId}/workflow`, title: "Workflow tábla", description: "Hibák állapot szerinti áttekintése." },
    { href: "/subcontractors", title: "Alvállalkozók", description: "Alvállalkozói teljesítmény és terhelés." }
  ];

  return (
    <>
      <PageHeader title={project.name} subtitle={`${project.phase} · ${project.address}`}>
        <HeaderLink href={`/projects/${projectId}/issues/new`} variant="primary">+ Új hiba</HeaderLink>
      </PageHeader>

      <div className="entity-list" aria-label="Modulok">
        {modules.map((mod) => (
          <Link key={mod.href} href={mod.href} className="entity-row">
            <div className="entity-row-main">
              <strong>{mod.title}</strong>
              <span>{mod.description}</span>
            </div>
            <span className="entity-row-chevron"><ChevronRightIcon /></span>
          </Link>
        ))}
      </div>

      <ProjectDetailPanel project={project} />
    </>
  );
}
