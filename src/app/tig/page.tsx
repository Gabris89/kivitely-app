import { formatHuf } from "@/lib/format";
import { getProject, listTigItems, listTigPackages } from "@/lib/repository";
import { PageHeader } from "@/components/PageHeader";

const packageStatusLabels = {
  draft: "Piszkozat",
  ready_for_review: "Ellenőrzésre vár",
  approved: "Elfogadva",
  sent: "Kiküldve"
};

export const dynamic = "force-dynamic";

export default async function TigPage() {
  const [project, tigPackages] = await Promise.all([getProject(), listTigPackages()]);
  const tigItems = listTigItems();
  const included = tigItems.filter((item) => item.included);
  const total = included.reduce((sum, item) => sum + item.valueHuf, 0);
  const proofCount = included.reduce((sum, item) => sum + item.proofCount, 0);

  return (
    <>
      <PageHeader title="TIG csomag" subtitle="Teljesítésigazolás előkészítés fotós és státuszos bizonyítékokból." />

      <section className="tig-grid">
        <article className="card panel-large">
          <div className="section-title">
            <h2>TIG-be kerülő tételek</h2>
            <span className="pill">{included.length} kiválasztva</span>
          </div>
          <div className="tig-list">
            {tigItems.map((item) => (
              <div className="tig-item" key={item.id}>
                <input type="checkbox" checked={item.included} readOnly aria-label={`${item.title} kiválasztása`} />
                <div>
                  <strong>{item.title}</strong>
                  <span>{item.subcontractor} · {item.proofCount} db bizonyíték</span>
                </div>
                <b>{formatHuf(item.valueHuf)}</b>
              </div>
            ))}
          </div>

          <div className="section-title tig-package-title">
            <h2>TIG csomagok</h2>
            <span className="pill">mock API: /api/tig</span>
          </div>
          <div className="package-list">
            {tigPackages.map((pkg) => (
              <div className="package-card" key={pkg.id}>
                <div>
                  <strong>{pkg.id}</strong>
                  <span>{pkg.subcontractor} · {pkg.issueIds.length} kapcsolt hiba · {pkg.proofCount} proof</span>
                </div>
                <div>
                  <b>{formatHuf(pkg.grossValueHuf)}</b>
                  <small>{packageStatusLabels[pkg.status]}</small>
                </div>
              </div>
            ))}
          </div>
        </article>

        <aside className="pdf-preview">
          <span className="pdf-label">PDF előnézet</span>
          <h2>Teljesítésigazolási csomag</h2>
          <p>{project.name}</p>
          <div className="pdf-box">
            <strong>Összesített érték</strong>
            <span>{formatHuf(total)}</span>
          </div>
          <div className="pdf-box">
            <strong>Kapcsolt bizonyítékok</strong>
            <span>{proofCount} db fotó / dokumentum</span>
          </div>
          <div className="pdf-box">
            <strong>Következő MVP-lépés</strong>
            <span>Valódi PDF export + Supabase Storage</span>
          </div>
          <div className="pdf-lines">
            <i /><i /><i /><i />
          </div>
          <button className="button primary full-width">PDF generálás később</button>
        </aside>
      </section>
    </>
  );
}
