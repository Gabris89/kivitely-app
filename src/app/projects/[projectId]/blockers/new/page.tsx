import { NewBlockerForm } from "@/components/NewBlockerForm";
import { PageHeader } from "@/components/PageHeader";
import { AccessDenied } from "@/components/AccessDenied";
import { hasPermission } from "@/lib/permissions.server";

export const dynamic = "force-dynamic";

export default async function NewBlockerPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;

  if (!(await hasPermission("blocker.create"))) {
    return (
      <>
        <PageHeader title="Új akadály rögzítése" />
        <AccessDenied message="Akadályt csak a projekt csapata és az alvállalkozó jelenthet be." />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Új akadály rögzítése"
        subtitle="Kontrollált Supabase insert csak a blocker_list táblába, mock fallbackkel."
      />
      <NewBlockerForm projectId={projectId} />
    </>
  );
}
