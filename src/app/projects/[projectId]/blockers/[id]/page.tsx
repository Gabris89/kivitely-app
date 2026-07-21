import Link from "next/link";
import { notFound } from "next/navigation";
import { getBlockerByPublicId } from "@/lib/repository";
import { PageHeader } from "@/components/PageHeader";
import { BlockerDetailPanel } from "@/components/BlockerDetailPanel";

export const dynamic = "force-dynamic";

export default async function BlockerDetailPage({ params }: { params: Promise<{ projectId: string; id: string }> }) {
  const { projectId, id } = await params;
  const blocker = await getBlockerByPublicId(id);

  if (!blocker) notFound();

  return (
    <>
      <PageHeader title={`${blocker.publicId} · ${blocker.title}`}>
        <Link className="button ghost" href={`/projects/${projectId}/blockers`}>Vissza</Link>
      </PageHeader>

      <BlockerDetailPanel projectId={projectId} blocker={blocker} />
    </>
  );
}
