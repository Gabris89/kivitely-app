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

  return (
    <>
      <div className="project-banner">
        <span className="project-banner-id">{project.publicId}</span>
        <span className="project-banner-name">{project.name}</span>
      </div>
      {children}
    </>
  );
}
