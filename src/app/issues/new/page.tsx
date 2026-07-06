import { NewIssueForm } from "@/components/NewIssueForm";
import { PageHeader } from "@/components/PageHeader";

export default function NewIssuePage() {
  return (
    <>
      <PageHeader title="Új hiba rögzítése" subtitle="Mobilos logika: helyszín, fotó, felelős, határidő, bizonyítási elvárás." />
      <NewIssueForm />
    </>
  );
}
