import { PageHeader } from "@/components/PageHeader";
import { SubcontractorForm } from "@/components/SubcontractorForm";
import { AccessDenied } from "@/components/AccessDenied";
import { hasPermission } from "@/lib/permissions.server";

export const dynamic = "force-dynamic";

export default async function NewSubcontractorPage() {
  if (!(await hasPermission("subcontractor.create"))) {
    return (
      <>
        <PageHeader title="Új alvállalkozó" />
        <AccessDenied message="Alvállalkozót csak adminisztrátor vagy projektvezető vehet fel." />
      </>
    );
  }

  return (
    <>
      <PageHeader title="Új alvállalkozó" />
      <SubcontractorForm mode="create" />
    </>
  );
}
