import { listSubcontractors } from "@/lib/repository";
import { HeaderLink, PageHeader } from "@/components/PageHeader";
import { SubcontractorList } from "@/components/SubcontractorList";

export const dynamic = "force-dynamic";

export default async function SubcontractorsPage() {
  const subcontractors = await listSubcontractors();

  return (
    <>
      <PageHeader title="Alvállalkozók" subtitle="Egyszerű teljesítmény- és terhelésnézet projektvezetőknek.">
        <HeaderLink href="/subcontractors/new" variant="primary">+ Új alvállalkozó</HeaderLink>
      </PageHeader>

      <SubcontractorList subcontractors={subcontractors} />
    </>
  );
}
