import { NewBlockerForm } from "@/components/NewBlockerForm";
import { HeaderLink, PageHeader } from "@/components/PageHeader";

export default async function NewBlockerPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;

  return (
    <>
      <PageHeader
        title="Új akadály rögzítése"
        subtitle="Kontrollált Supabase insert csak a blocker_list táblába, mock fallbackkel."
      >
        <HeaderLink href={`/projects/${projectId}/blockers`} variant="ghost">Vissza az akadálylistához</HeaderLink>
      </PageHeader>
      <NewBlockerForm projectId={projectId} />
    </>
  );
}
