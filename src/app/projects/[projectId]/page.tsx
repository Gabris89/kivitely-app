import Link from "next/link";
import { getProjectByPublicId, listBlockers, listIssues, listTigPackages } from "@/lib/repository";
import { HeaderLink, PageHeader } from "@/components/PageHeader";
import { ProjectDetailPanel } from "@/components/ProjectDetailPanel";
import { DashboardView } from "@/components/DashboardView";
import { buildDashboardData } from "@/lib/dashboard";
import { hasPermission } from "@/lib/permissions.server";
import { ChevronRightIcon } from "@/components/ActionIcons";

export const dynamic = "force-dynamic";

export default async function ProjectDashboardPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const project = await getProjectByPublicId(projectId);

  if (!project) return null;

  // A projekt "Áttekintés" oldala eddig csak modul-indító linklista volt. Most
  // ez az oldal a projekt valódi dashboardja; a modul-lista alá kerül (mobilon
  // továbbra is ez a leggyorsabb belépő). Lásd docs/dashboard-plan.md.
  const [issues, blockers, tigPackages, canViewMoney, canCreateIssue, canEditProject, canDeleteProject] =
    await Promise.all([
      listIssues(projectId),
      listBlockers(projectId),
      listTigPackages(projectId),
      hasPermission("money.view"),
      hasPermission("issue.create"),
      hasPermission("project.update"),
      hasPermission("project.delete")
    ]);

  const data = buildDashboardData({ projects: [project], issues, blockers, tigPackages });

  const modules = [
    { href: `/projects/${projectId}/issues`, title: "Hibalista", description: "Hibák rögzítése, státuszkövetés, fotós bizonyítás." },
    { href: `/projects/${projectId}/blockers`, title: "Akadálylista", description: "Munkát lassító akadályok áttekintése." },
    { href: `/projects/${projectId}/documents`, title: "Dokumentumok", description: "Tervek és projektdokumentumok." },
    { href: `/projects/${projectId}/work-logs`, title: "Teljesítménynapló", description: "Terepi munkarögzítés naplója." },
    ...(canViewMoney
      ? [{ href: `/projects/${projectId}/tig`, title: "TIG csomag", description: "Teljesítésigazolási csomagok összeállítása." }]
      : []),
    { href: `/projects/${projectId}/workflow`, title: "Workflow tábla", description: "Hibák állapot szerinti áttekintése." },
    { href: "/subcontractors", title: "Alvállalkozók", description: "Alvállalkozói teljesítmény és terhelés." }
  ];

  return (
    <>
      <PageHeader title={project.name} subtitle={`${project.phase} · ${project.address}`}>
        {canCreateIssue ? (
          <HeaderLink href={`/projects/${projectId}/issues/new`} variant="primary">+ Új hiba</HeaderLink>
        ) : null}
      </PageHeader>

      <DashboardView data={data} scope="project" basePath={`/projects/${projectId}`} canViewMoney={canViewMoney} />

      <section className="dashboard-section">
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
      </section>

      <ProjectDetailPanel project={project} canEdit={canEditProject} canDelete={canDeleteProject} />
    </>
  );
}
