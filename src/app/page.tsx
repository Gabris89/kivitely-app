import { listProjects, listIssues, listBlockers, listTigPackages } from "@/lib/repository";
import { PageHeader } from "@/components/PageHeader";
import { DashboardView } from "@/components/DashboardView";
import { buildDashboardData } from "@/lib/dashboard";

export const dynamic = "force-dynamic";

// Globális ("Minden projekt") áttekintés. Szándékosan NEM külön /dashboard
// route: a navigációs brief pont azt jelölte problémának, hogy a "dashboard"
// szó több különböző dolgot takar az appban. Lásd docs/dashboard-plan.md.
export default async function DashboardPage() {
  const [projects, issues, blockers, tigPackages] = await Promise.all([
    listProjects(),
    listIssues(),
    listBlockers(),
    listTigPackages()
  ]);

  const data = buildDashboardData({ projects, issues, blockers, tigPackages });

  return (
    <>
      <PageHeader title="Áttekintés" subtitle="Gyors kép az összes projektről." />
      <DashboardView data={data} scope="global" />
    </>
  );
}
