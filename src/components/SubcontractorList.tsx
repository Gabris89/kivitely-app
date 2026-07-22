import Link from "next/link";
import type { Subcontractor } from "@/types";
import { ChevronRightIcon } from "@/components/ActionIcons";

export function SubcontractorList({ subcontractors }: { subcontractors: Subcontractor[] }) {
  return (
    <>
      {subcontractors.length ? (
        <div className="entity-list" aria-label="Alvállalkozók">
          {subcontractors.map((sub) => (
            <Link key={sub.id} className="entity-row" href={`/subcontractors/${sub.publicId}/edit`}>
              <div className="entity-row-main">
                <strong>{sub.name}</strong>
                <span>
                  {sub.publicId} · {sub.trade || "Nincs megadva"} · {sub.phone || "Nincs telefonszám"} · {sub.openIssues} nyitott hiba
                </span>
              </div>
              <span className="entity-row-chevron"><ChevronRightIcon /></span>
            </Link>
          ))}
        </div>
      ) : (
        <p className="card empty-list">Még nincs alvállalkozó.</p>
      )}
    </>
  );
}
