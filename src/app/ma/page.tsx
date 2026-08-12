import { getCurrentUser } from "@/lib/currentUser";
import { hasPermission } from "@/lib/permissions.server";
import { listProjects } from "@/lib/repository";
import { WorkerDayLogFlow } from "@/components/WorkerDayLogFlow";

export const dynamic = "force-dynamic";

/**
 * Munkas kezdokepernyo - a legegyszerubb terepi flow: megnyit -> egy gomb ->
 * rogzit -> kesz. Szandekosan csupasz (a menut az AppShell elrejti erre az
 * utvonalra). A vezetoi feluletet ez nem valtoztatja meg.
 */
export default async function WorkerHomePage() {
  const [user, allowed, projects] = await Promise.all([
    getCurrentUser(),
    hasPermission("worklog.create"),
    listProjects()
  ]);

  return (
    <WorkerDayLogFlow
      greetingName={user?.displayName?.split(" ")[0]}
      canLog={allowed}
      projects={projects.map((project) => ({ id: project.publicId, name: project.name }))}
    />
  );
}
