import type { EvidencePhoto, Issue } from "@/types";
import { getEvidenceChecklistStatus, getIssueTigReadiness } from "@/lib/issueMetrics";

function CheckItem({ done, label, detail }: { done: boolean; label: string; detail: string }) {
  return (
    <div className={done ? "check-item done" : "check-item missing"}>
      <span aria-hidden="true">{done ? "✓" : "!"}</span>
      <div>
        <strong>{label}</strong>
        <small>{detail}</small>
      </div>
    </div>
  );
}

export function EvidenceChecklist({ issue, photos }: { issue: Issue; photos: EvidencePhoto[] }) {
  const beforeCount = photos.filter((photo) => photo.type === "before_photo").length;
  const afterCount = photos.filter((photo) => photo.type === "after_photo").length;
  const checklist = getEvidenceChecklistStatus(issue, photos);
  const tigReadiness = getIssueTigReadiness(issue, photos);
  const completedChecks = [
    checklist.beforePhoto,
    checklist.afterPhoto,
    checklist.description,
    checklist.accepted
  ].filter(Boolean).length;
  const checklistScore = Math.round((completedChecks / 4) * 100);

  return (
    <article className="card panel evidence-panel">
      <div className="section-title">
        <h2>TIG feltételek</h2>
        <span className="pill">{checklistScore}%</span>
      </div>

      <div className="check-list">
        <CheckItem done={checklist.beforePhoto} label="Előtte fotó" detail={`${beforeCount} db rögzítve`} />
        <CheckItem done={checklist.afterPhoto} label="Utána fotó" detail={`${afterCount} db rögzítve`} />
        <CheckItem
          done={checklist.description}
          label="Műszaki leírás"
          detail={checklist.description ? "Van rövid, javítható leírás" : "A hiba leírása túl rövid vagy hiányzik"}
        />
        <CheckItem done={checklist.accepted} label="Elfogadott státusz" detail="Accepted vagy TIG-ready állapot szükséges" />
        <CheckItem
          done={tigReadiness.ready}
          label="TIG-ready"
          detail={tigReadiness.ready ? "Mehet bizonyítékcsomagba" : `Hiányzik: ${tigReadiness.missing.join(", ")}`}
        />
      </div>
    </article>
  );
}
