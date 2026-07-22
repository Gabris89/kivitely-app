import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { getProjectByPublicId } from "@/lib/repository";

export default async function ProjectLayout({
  children,
  params
}: {
  children: ReactNode;
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const project = await getProjectByPublicId(projectId);

  if (!project) notFound();

  // A projekt azonosítója/neve mostantól a fejléc projektváltóban jelenik meg
  // (ProjectSwitcher), ezért az oldalankénti projekt-banner megszűnt – így nincs
  // dupla projekt-chip a képernyő tetején.
  return <>{children}</>;
}
