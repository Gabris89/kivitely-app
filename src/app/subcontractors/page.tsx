import { listSubcontractors } from "@/lib/repository";
import { PageHeader } from "@/components/PageHeader";

export const dynamic = "force-dynamic";

export default async function SubcontractorsPage() {
  const subcontractors = await listSubcontractors();

  return (
    <>
      <PageHeader title="Alvállalkozók" subtitle="Egyszerű teljesítmény- és terhelésnézet projektvezetőknek." />

      <section className="sub-grid">
        {subcontractors.map((sub) => (
          <article className="card sub-card" key={sub.id}>
            <div className="sub-card-head">
              <div>
                <h2>{sub.name}</h2>
                <p>{sub.trade}</p>
              </div>
              <span className={sub.overdueIssues > 0 ? "risk" : "ok"}>{sub.overdueIssues > 0 ? "Figyelni" : "Rendben"}</span>
            </div>
            <dl>
              <div><dt>Kapcsolattartó</dt><dd>{sub.contact}</dd></div>
              <div><dt>Telefon</dt><dd>{sub.phone}</dd></div>
              <div><dt>Nyitott hiba</dt><dd>{sub.openIssues}</dd></div>
              <div><dt>Lejárt</dt><dd>{sub.overdueIssues}</dd></div>
              <div><dt>Készre jelentve</dt><dd>{sub.readyIssues}</dd></div>
              <div><dt>Heti zárási arány</dt><dd>{sub.weeklyClosureRate}%</dd></div>
            </dl>
          </article>
        ))}
      </section>
    </>
  );
}
