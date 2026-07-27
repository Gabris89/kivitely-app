import { getProjectByPublicId, listSubcontractors, listTigPackages } from "@/lib/repository";
import { PageHeader } from "@/components/PageHeader";
import { TigWorkspace } from "@/components/TigWorkspace";
import { AccessDenied } from "@/components/AccessDenied";
import { hasPermission } from "@/lib/permissions.server";

export const dynamic = "force-dynamic";

export default async function TigPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const [project, tigPackages, subcontractors] = await Promise.all([
    getProjectByPublicId(projectId),
    listTigPackages(projectId),
    listSubcontractors()
  ]);

  if (!project) return null;

  // A TIG modul vegig penzugyi adatot mutat, ezert egyben zarjuk le.
  if (!(await hasPermission("money.view"))) {
    return (
      <>
        <PageHeader title="TIG csomag" />
        <AccessDenied message="A teljesítésigazolási csomagok pénzügyi adatot tartalmaznak, ezért csak adminisztrátor és projektvezető látja." />
      </>
    );
  }

  const subOptions = subcontractors.map((item) => ({
    publicId: item.publicId,
    name: item.name,
    trade: item.trade === "Nincs megadva" ? "" : item.trade
  }));

  return (
    <>
      <PageHeader
        title="TIG csomag"
        subtitle="Teljesítésigazolás előkészítése: alvállalkozónként, tig-ready hibákból, fotós bizonyítékkal."
      />
      <TigWorkspace projectId={projectId} subcontractors={subOptions} packages={tigPackages} />
    </>
  );
}
