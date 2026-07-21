"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Subcontractor } from "@/types";

export function SubcontractorList({ subcontractors }: { subcontractors: Subcontractor[] }) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function deleteSubcontractor(subcontractor: Subcontractor) {
    if (!window.confirm(`Biztosan törlöd ezt az alvállalkozót: "${subcontractor.name}"?`)) return;

    setDeletingId(subcontractor.publicId);

    const response = await fetch(`/api/subcontractors/${subcontractor.publicId}`, { method: "DELETE" }).catch(() => undefined);

    setDeletingId(null);

    if (!response?.ok) {
      window.alert("A törlés nem sikerült.");
      return;
    }

    router.refresh();
  }

  return (
    <section className="sub-grid">
      {subcontractors.map((sub) => (
        <article className="card sub-card" key={sub.id}>
          <div className="sub-card-head">
            <div>
              <span>{sub.publicId}</span>
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
          <div className="sub-card-actions">
            <Link className="button ghost" href={`/subcontractors/${sub.publicId}/edit`}>Szerkesztés</Link>
            <button
              type="button"
              className="button ghost"
              disabled={deletingId === sub.publicId}
              onClick={() => deleteSubcontractor(sub)}
            >
              {deletingId === sub.publicId ? "Törlés..." : "Törlés"}
            </button>
          </div>
        </article>
      ))}

      {!subcontractors.length ? <p className="card empty-list">Még nincs alvállalkozó.</p> : null}
    </section>
  );
}
