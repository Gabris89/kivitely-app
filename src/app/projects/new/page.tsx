import { NewProjectForm } from "@/components/NewProjectForm";
import { PageHeader } from "@/components/PageHeader";
import { AccessDenied } from "@/components/AccessDenied";
import { hasPermission } from "@/lib/permissions.server";

export const dynamic = "force-dynamic";

export default async function NewProjectPage() {
  if (!(await hasPermission("project.create"))) {
    return (
      <>
        <PageHeader title="Új projekt" />
        <AccessDenied message="Új projektet csak adminisztrátor vagy projektvezető hozhat létre." />
      </>
    );
  }

  return (
    <>
      <PageHeader title="Új projekt" />
      <NewProjectForm />
    </>
  );
}
