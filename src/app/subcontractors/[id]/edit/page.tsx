import { notFound } from "next/navigation";
import { getSubcontractorByPublicId } from "@/lib/repository";
import { PageHeader } from "@/components/PageHeader";
import { SubcontractorForm } from "@/components/SubcontractorForm";
import { AccessDenied } from "@/components/AccessDenied";
import { hasPermission } from "@/lib/permissions.server";
import { permissionDeniedMessage } from "@/lib/permissions";
import { getCurrentWorkflowRole } from "@/lib/currentUser";

export const dynamic = "force-dynamic";

export default async function EditSubcontractorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [subcontractor, canUpdate, canDelete, role] = await Promise.all([
    getSubcontractorByPublicId(id),
    hasPermission("subcontractor.update"),
    hasPermission("subcontractor.delete"),
    getCurrentWorkflowRole()
  ]);

  if (!subcontractor) notFound();

  if (!canUpdate) {
    return (
      <>
        <PageHeader title={`${subcontractor.publicId} · ${subcontractor.name}`} />
        <AccessDenied message={permissionDeniedMessage("subcontractor.update", role)} />
      </>
    );
  }

  return (
    <>
      <PageHeader title={`${subcontractor.publicId} · ${subcontractor.name} szerkesztése`} />
      <SubcontractorForm
        mode="edit"
        publicId={subcontractor.publicId}
        initial={{
          name: subcontractor.name,
          trade: subcontractor.trade,
          contactName: subcontractor.contact,
          phone: subcontractor.phone
        }}
        canDelete={canDelete}
      />
    </>
  );
}
