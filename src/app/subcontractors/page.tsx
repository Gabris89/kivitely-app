import { listSubcontractors } from "@/lib/repository";
import { HeaderLink, PageHeader } from "@/components/PageHeader";
import { SubcontractorList } from "@/components/SubcontractorList";
import { hasPermission } from "@/lib/permissions.server";

export const dynamic = "force-dynamic";

export default async function SubcontractorsPage() {
  const [subcontractors, canCreate] = await Promise.all([
    listSubcontractors(),
    hasPermission("subcontractor.create")
  ]);

  return (
    <>
      <PageHeader title="Alvállalkozók" subtitle="Egyszerű teljesítmény- és terhelésnézet projektvezetőknek.">
        {canCreate ? (
          <HeaderLink href="/subcontractors/new" variant="primary">+ Új alvállalkozó</HeaderLink>
        ) : null}
      </PageHeader>

      <SubcontractorList subcontractors={subcontractors} />
    </>
  );
}
