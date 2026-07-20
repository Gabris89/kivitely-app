import Link from "next/link";
import { getProject } from "@/lib/repository";
import { HeaderLink, PageHeader } from "@/components/PageHeader";

export const dynamic = "force-dynamic";

const modules = [
  { href: "/issues", title: "Hibalista", description: "Hibák rögzítése, státuszkövetés, fotós bizonyítás." },
  { href: "/blockers", title: "Akadálylista", description: "Munkát lassító akadályok áttekintése." },
  { href: "/documents", title: "Dokumentumok", description: "Tervek és projektdokumentumok." },
  { href: "/work-logs", title: "Teljesítménynapló", description: "Terepi munkarögzítés naplója." },
  { href: "/tig", title: "TIG csomag", description: "Teljesítésigazolási csomagok összeállítása." },
  { href: "/workflow", title: "Workflow tábla", description: "Hibák állapot szerinti áttekintése." },
  { href: "/subcontractors", title: "Alvállalkozók", description: "Alvállalkozói teljesítmény és terhelés." }
];

export default async function DashboardPage() {
  const project = await getProject();

  return (
    <>
      <PageHeader title={project.name} subtitle={`${project.phase} · ${project.address}`}>
        <HeaderLink href="/issues/new" variant="primary">+ Új hiba</HeaderLink>
      </PageHeader>

      <section className="module-menu" aria-label="Modulok">
        {modules.map((mod) => (
          <Link key={mod.href} href={mod.href} className="card module-tile">
            <h2>{mod.title}</h2>
            <p>{mod.description}</p>
          </Link>
        ))}
      </section>
    </>
  );
}
