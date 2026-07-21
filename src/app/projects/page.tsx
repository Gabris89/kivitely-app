import Link from "next/link";
import { listProjects } from "@/lib/repository";
import { HeaderLink, PageHeader } from "@/components/PageHeader";

export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  const projects = await listProjects();

  return (
    <>
      <PageHeader title="Projektek" subtitle="Válassz egy projektet, vagy hozz létre újat.">
        <HeaderLink href="/projects/new" variant="primary">+ Új projekt</HeaderLink>
      </PageHeader>

      <section className="module-menu" aria-label="Projektek">
        {projects.map((project) => (
          <Link key={project.id} href={`/projects/${project.publicId}`} className="card module-tile">
            <h2>{project.publicId} · {project.name}</h2>
            <p>{[project.phase, project.address].filter(Boolean).join(" · ") || "Nincs megadva"}</p>
          </Link>
        ))}

        {!projects.length ? <p className="card empty-list">Még nincs projekt.</p> : null}
      </section>
    </>
  );
}
