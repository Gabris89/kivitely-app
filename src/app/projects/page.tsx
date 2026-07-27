import Link from "next/link";
import { listProjects } from "@/lib/repository";
import { HeaderLink, PageHeader } from "@/components/PageHeader";
import { ChevronRightIcon } from "@/components/ActionIcons";
import { hasPermission } from "@/lib/permissions.server";

export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  const [projects, canCreate] = await Promise.all([listProjects(), hasPermission("project.create")]);

  return (
    <>
      <PageHeader title="Projektek" subtitle="Válassz egy projektet, vagy hozz létre újat.">
        {canCreate ? <HeaderLink href="/projects/new" variant="primary">+ Új projekt</HeaderLink> : null}
      </PageHeader>

      {projects.length ? (
        <div className="entity-list" aria-label="Projektek">
          {projects.map((project) => (
            <Link key={project.id} href={`/projects/${project.publicId}`} className="entity-row">
              <div className="entity-row-main">
                <strong>{project.publicId} · {project.name}</strong>
                <span>{[project.phase, project.address].filter(Boolean).join(" · ") || "Nincs megadva"}</span>
              </div>
              <span className="entity-row-chevron"><ChevronRightIcon /></span>
            </Link>
          ))}
        </div>
      ) : (
        <p className="card empty-list">Még nincs projekt.</p>
      )}
    </>
  );
}
