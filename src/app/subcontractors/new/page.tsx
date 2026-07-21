import { HeaderLink, PageHeader } from "@/components/PageHeader";
import { SubcontractorForm } from "@/components/SubcontractorForm";

export default function NewSubcontractorPage() {
  return (
    <>
      <PageHeader title="Új alvállalkozó">
        <HeaderLink href="/subcontractors" variant="ghost">Vissza az alvállalkozókhoz</HeaderLink>
      </PageHeader>
      <SubcontractorForm mode="create" />
    </>
  );
}
