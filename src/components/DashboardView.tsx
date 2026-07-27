import Link from "next/link";
import type { DashboardData } from "@/lib/dashboard";
import { formatHuf } from "@/lib/format";

type Props = {
  data: DashboardData;
  scope: "global" | "project";
  /** Projekt-scope-ban a linkek elé kerülő prefix (pl. /projects/PRJ-001). */
  basePath?: string;
};

function percent(value: number, max: number) {
  if (max <= 0) return 0;
  return Math.max(2, Math.round((value / max) * 100));
}

function formatDays(value: number | null) {
  if (value === null) return "–";
  return `${String(value).replace(".", ",")} nap`;
}

export function DashboardView({ data, scope, basePath = "" }: Props) {
  const { kpi, tig, subcontractors, issuesByStatus, blockers, projects } = data;

  const maxStatusCount = Math.max(1, ...issuesByStatus.map((row) => row.count));
  const maxTigValue = Math.max(1, ...tig.rows.map((row) => row.valueHuf || 0));
  const maxProjectOpen = Math.max(1, ...projects.map((row) => row.openIssues));

  const issuesHref = scope === "project" ? `${basePath}/issues` : "/issues";
  const blockersHref = scope === "project" ? `${basePath}/blockers` : "/blockers";
  const tigHref = scope === "project" ? `${basePath}/tig` : null;

  return (
    <>
      <section className="dashboard-stats" aria-label="Fő mutatók">
        <div className="card stat-card">
          <span>Nyitott hibák</span>
          <strong>{kpi.openIssues}</strong>
        </div>
        <div className="card stat-card">
          <span>Lejárt hibák</span>
          <strong className={kpi.overdueIssues > 0 ? "stat-danger" : undefined}>{kpi.overdueIssues}</strong>
        </div>
        <div className="card stat-card">
          <span>Aktív akadályok</span>
          <strong className={blockers.critical > 0 ? "stat-warn" : undefined}>{kpi.activeBlockers}</strong>
        </div>
        {/* Ez az a szám, ami miatt a vezető megnyitja az appot: elvégzett,
            bizonyított munka, amiért még nem járt le a pénz. */}
        <div className="card stat-card stat-card-money">
          <span>Leigazolatlan érték</span>
          <strong>{formatHuf(kpi.uncertifiedValueHuf)}</strong>
          <small>TIG-ready, még nincs jóváhagyott csomagban</small>
        </div>
      </section>

      <section className="dashboard-charts">
        <div className="card panel-large">
          <div className="section-title">
            <h2>TIG csatorna</h2>
            {tigHref ? (
              <Link className="section-link" href={tigHref}>
                Csomagok
              </Link>
            ) : null}
          </div>

          {tig.packageCount ? (
            <div className="bar-chart">
              {tig.rows.map((row) => (
                <div className="bar-row bar-row-rich" key={row.key}>
                  <span>{row.label}</span>
                  <div className="bar-track">
                    <div className="bar-fill" style={{ width: `${percent(row.valueHuf || 0, maxTigValue)}%` }} />
                  </div>
                  <strong>
                    {row.count} db
                    <em>{formatHuf(row.valueHuf || 0)}</em>
                  </strong>
                </div>
              ))}
            </div>
          ) : (
            <p className="empty-list">Még nincs TIG csomag.</p>
          )}

          <div className="metric-callout">
            <span>Csomagba nem tett, TIG-ready tétel</span>
            <strong>
              {tig.unpackagedCount} db · {formatHuf(tig.unpackagedValueHuf)}
            </strong>
          </div>
        </div>

        <div className="card panel-large">
          <div className="section-title">
            <h2>Hibák állapot szerint</h2>
            <Link className="section-link" href={issuesHref}>
              Hibalista
            </Link>
          </div>
          {issuesByStatus.length ? (
            <div className="bar-chart">
              {issuesByStatus.map((row) => (
                <div className="bar-row" key={row.key}>
                  <span>{row.label}</span>
                  <div className="bar-track">
                    <div className="bar-fill" style={{ width: `${percent(row.count, maxStatusCount)}%` }} />
                  </div>
                  <strong>{row.count}</strong>
                </div>
              ))}
            </div>
          ) : (
            <p className="empty-list">Még nincs rögzített hiba.</p>
          )}
        </div>
      </section>

      <section className="dashboard-section">
        <div className="card panel-large">
          <div className="section-title">
            <h2>Alvállalkozói teljesítmény</h2>
            <Link className="section-link" href="/subcontractors">
              Alvállalkozók
            </Link>
          </div>

          {subcontractors.length ? (
            <div className="metric-table">
              {subcontractors.map((row) => (
                <div className="metric-row" key={row.name}>
                  <div className="metric-row-main">
                    <strong>{row.name}</strong>
                    <span>Átlagos átfutás: {formatDays(row.avgClosureDays)}</span>
                  </div>
                  <div className="metric-row-stats">
                    <span className="metric-chip">
                      <em>{row.openIssues}</em>nyitott
                    </span>
                    <span className={row.overdueIssues > 0 ? "metric-chip is-danger" : "metric-chip"}>
                      <em>{row.overdueIssues}</em>lejárt
                    </span>
                    <span className="metric-chip is-money">
                      <em>{formatHuf(row.uncertifiedValueHuf)}</em>leigazolatlan
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="empty-list">Még nincs alvállalkozóhoz kötött hiba.</p>
          )}
        </div>
      </section>

      <section className="dashboard-charts">
        <div className="card panel-large">
          <div className="section-title">
            <h2>Akadályok</h2>
            <Link className="section-link" href={blockersHref}>
              Akadálylista
            </Link>
          </div>

          {blockers.active ? (
            <>
              <div className="metric-inline">
                <div>
                  <span>Aktív</span>
                  <strong>{blockers.active}</strong>
                </div>
                <div>
                  <span>Kritikus</span>
                  <strong className={blockers.critical > 0 ? "stat-danger" : undefined}>{blockers.critical}</strong>
                </div>
                <div>
                  <span>Átlagos kor</span>
                  <strong>{formatDays(blockers.avgAgeDays)}</strong>
                </div>
              </div>

              <div className="metric-table metric-table-compact">
                {blockers.oldest.map((item) => (
                  <div className="metric-row" key={item.id}>
                    <div className="metric-row-main">
                      <strong>{item.title}</strong>
                      <span>{scope === "global" ? `${item.projectName} · ${item.id}` : item.id}</span>
                    </div>
                    <div className="metric-row-stats">
                      <span className="metric-chip">
                        <em>{item.ageDays}</em>napja áll
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="empty-list">Nincs aktív akadály.</p>
          )}
        </div>

        {scope === "global" ? (
          <div className="card panel-large">
            <div className="section-title">
              <h2>Projektek</h2>
              <Link className="section-link" href="/projects">
                Összes
              </Link>
            </div>

            {projects.length ? (
              <div className="bar-chart">
                {projects.map((row) => (
                  <div className="bar-row bar-row-rich" key={row.publicId}>
                    <span>
                      <Link href={`/projects/${row.publicId}`}>{row.name}</Link>
                    </span>
                    <div className="bar-track">
                      <div className="bar-fill" style={{ width: `${percent(row.openIssues, maxProjectOpen)}%` }} />
                    </div>
                    <strong>
                      {row.openIssues} nyitott
                      <em>
                        {row.overdueIssues} lejárt · {formatHuf(row.uncertifiedValueHuf)}
                      </em>
                    </strong>
                  </div>
                ))}
              </div>
            ) : (
              <p className="empty-list">Még nincs projekt.</p>
            )}
          </div>
        ) : null}
      </section>
    </>
  );
}
