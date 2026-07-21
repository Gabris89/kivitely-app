import { notFound } from "next/navigation";
import { getSubcontractorByPublicId } from "@/lib/repository";
import { HeaderLink, PageHeader } from "@/components/PageHeader";
import { SubcontractorForm } from "@/components/SubcontractorForm";

export const dynamic = "force-dynamic";

export default async function EditSubcontractorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const subcontractor = await getSubcontractorByPublicId(id);

  if (!subcontractor) notFound();

  return (
    <>
      <PageHeader title={`${subcontractor.publicId} · ${subcontractor.name} szerkesztése`}>
        <HeaderLink href="/subcontractors" variant="ghost">Vissza az alvállalkozókhoz</HeaderLink>
      </PageHeader>
      <SubcontractorForm
        mode="edit"
        publicId={subcontractor.publicId}
        initial={{
          name: subcontractor.name,
          trade: subcontractor.trade,
          contactName: subcontractor.contact,
          phone: subcontractor.phone
        }}
      />
    </>
  );
}
