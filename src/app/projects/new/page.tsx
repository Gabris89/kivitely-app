import { NewProjectForm } from "@/components/NewProjectForm";
import { PageHeader } from "@/components/PageHeader";

export default function NewProjectPage() {
  return (
    <>
      <PageHeader title="Új projekt" />
      <NewProjectForm />
    </>
  );
}
