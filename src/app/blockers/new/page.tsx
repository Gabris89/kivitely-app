import { NewBlockerForm } from "@/components/NewBlockerForm";
import { HeaderLink, PageHeader } from "@/components/PageHeader";

export default function NewBlockerPage() {
  return (
    <>
      <PageHeader
        title="Új akadály rögzítése"
        subtitle="Kontrollált Supabase insert csak a blocker_list táblába, mock fallbackkel."
      >
        <HeaderLink href="/blockers" variant="ghost">Vissza az akadálylistához</HeaderLink>
      </PageHeader>
      <NewBlockerForm />
    </>
  );
}
