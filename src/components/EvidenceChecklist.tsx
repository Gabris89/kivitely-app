import type { EvidencePhoto, Issue } from "@/types";
import { getEvidenceChecklistStatus, getIssueProofScore, getIssueTigReadiness } from "@/lib/issueMetrics";

function CheckItem({ done, label, detail }: { done: boolean; label: string; detail: string }) {
  return (
    <div className={done ? "check-item done" : "check-item missing"}>
      <span>{done ? "✓" : "!"}</span>
      <div>
        <strong>{label}</strong>
        <small>{detail}</small>
      </div>
    </div>
  );
}

export function EvidenceChecklist({ issue, photos }: { issue: Issue; photos: EvidencePhoto[] }) {
  const beforeCount = photos.filter((photo) => photo.type === "before_photo").length || issue.photosBefore;
  const afterCount = photos.filter((photo) => photo.type === "after_photo").length || issue.photosAfter;
  const proofScore = getIssueProofScore(issue);
  const checklist = getEvidenceChecklistStatus(issue);
  const tigReadiness = getIssueTigReadiness(issue);

  return (
    <article className="card panel evidence-panel">
      <div className="section-title">
        <h2>Bizonyíték checklist</h2>
        <span className="pill">{proofScore}%</span>
      </div>

      <div className="check-list">
        <CheckItem done={checklist.beforePhoto} label="Előtte fotó" detail={`${beforeCount} db rögzítve`} />
        <CheckItem done={checklist.afterPhoto} label="Utána fotó" detail={`${afterCount} db rögzítve`} />
        <CheckItem done={checklist.description} label="Műszaki leírás" detail="Van rövid, javítható leírás" />
        <CheckItem done={checklist.accepted} label="Elfogadott státusz" detail="Projektvezetői elfogadás szükséges TIG előtt" />
        <CheckItem
          done={tigReadiness.ready}
          label="TIG-ready"
          detail={tigReadiness.ready ? "Mehet bizonyítékcsomagba" : `Hiányzik: ${tigReadiness.missing.join(", ")}`}
        />
      </div>
    </article>
  );
}
