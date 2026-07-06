import Link from "next/link";
import { listIssues } from "@/lib/repository";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";

export const dynamic = "force-dynamic";

export default async function MobilePage() {
  const issues = await listIssues();

  return (
    <>
      <PageHeader title="Mobil/PWA terepi nézet" subtitle="Ez lenne a művezető és alvállalkozó egyszerű, telefonos munkafelülete." />

      <section className="mobile-grid">
        <article className="card panel-large mobile-explainer">
          <h2>Miért fontos?</h2>
          <p>
            A terepen nem fognak komplex vállalatirányítási rendszert használni. Itt a cél: 3 érintésből hiba, 1 érintésből fotó, egyértelmű státusz.
          </p>
          <ul>
            <li>nagy gombok kesztyűs / terepi használathoz</li>
            <li>gyors fotós bizonyítás</li>
            <li>alvállalkozói egyszerű visszajelzés</li>
            <li>később offline queue</li>
          </ul>
        </article>

        <aside className="phone-frame">
          <div className="phone-notch" />
          <div className="phone-top">
            <span>Kivitely</span>
            <b>09:41</b>
          </div>
          <h2>Mai feladataim</h2>
          <p>Alvállalkozói mobilnézet</p>
          <Link href="/issues/new" className="mobile-action">+ Új hiba fotóval</Link>
          <div className="phone-list">
            {issues.slice(0, 4).map((issue) => (
              <Link href={`/issues/${issue.id}`} className="phone-card" key={issue.id}>
                <strong>{issue.title}</strong>
                <small>{issue.location}</small>
                <StatusBadge status={issue.status} />
              </Link>
            ))}
          </div>
        </aside>
      </section>
    </>
  );
}
