import { PageHeader } from "@/components/PageHeader";
import { SubcontractorForm } from "@/components/SubcontractorForm";

export default function NewSubcontractorPage() {
  return (
    <>
      <PageHeader title="Új alvállalkozó" />
      <SubcontractorForm mode="create" />
    </>
  );
}
