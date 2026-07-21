import { NewProjectForm } from "@/components/NewProjectForm";
import { HeaderLink, PageHeader } from "@/components/PageHeader";

export default function NewProjectPage() {
  return (
    <>
      <PageHeader title="Új projekt">
        <HeaderLink href="/projects" variant="ghost">Vissza a projektekhez</HeaderLink>
      </PageHeader>
      <NewProjectForm />
    </>
  );
}
