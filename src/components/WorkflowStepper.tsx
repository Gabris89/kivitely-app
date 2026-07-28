import type { IssueStatus } from "@/types";
import { isBackwardTransition, issueStatusLabels } from "@/lib/workflow";

/** A fo utvonal, ahogy egy hiba normalis esetben vegigmegy a folyamaton.
    A "rejected" szandekosan nincs benne: az nem egy kesobbi lepes, hanem
    mellekag - kulon sorban jelenik meg, hogy a sin ne hazudjon. */
const mainPath: IssueStatus[] = [
  "draft",
  "open",
  "assigned",
  "in_progress",
  "ready_for_review",
  "accepted",
  "tig_ready",
  "closed"
];

const branchStatus: IssueStatus = "rejected";

/**
 * Allapot-utvonal a hiba reszletek oldalan. Csak megjelenit: megmutatja, hol
 * tart a hiba es mi jon utana - a leptetes tovabbra is a szerkesztes alatti
 * allapot-legordulon at tortenik, hogy egy felrenyulas ne valtson statuszt.
 */
export function WorkflowStepper({
  status,
  nextStatuses = []
}: {
  status: IssueStatus;
  /** A jelenlegi szereppel elerheto kovetkezo allapotok (getNextStatuses).
      Ebben mar a visszalepesek is benne vannak, ezert kulon jeloljuk azokat,
      amelyek a sinen visszafele mutatnak. */
  nextStatuses?: IssueStatus[];
}) {
  const currentIndex = mainPath.indexOf(status);
  // Ha a hiba a mellekagon all, a fo sinen semmit nem jelolunk kesznek -
  // ilyenkor nem igaz, hogy a korabbi lepesek le vannak zarva.
  const onBranch = currentIndex === -1;
  const branchVisible = onBranch || nextStatuses.includes(branchStatus);
  const nextSet = new Set(nextStatuses);
  // Ugyanaz a forras dont, mint a szerveren: ami visszalepes, ahhoz indok kell.
  const backwardTargets = nextStatuses.filter((next) => isBackwardTransition(status, next));
  const backwardSet = new Set(backwardTargets);
  const forwardTargets = nextStatuses.filter((next) => !backwardSet.has(next));

  return (
    <div className="wf-track">
      <ol className="wf-rail" aria-label="A hiba állapotának útvonala">
        {mainPath.map((step, index) => {
          const isCurrent = !onBranch && index === currentIndex;
          const isDone = !onBranch && index < currentIndex;
          const isTarget = !isCurrent && nextSet.has(step);
          const className = [
            "wf-step",
            isDone ? "done" : "",
            isCurrent ? "current" : "",
            isTarget && backwardSet.has(step) ? "back" : "",
            isTarget && !backwardSet.has(step) ? "next" : ""
          ]
            .filter(Boolean)
            .join(" ");

          return (
            <li key={step} className={className} aria-current={isCurrent ? "step" : undefined}>
              <span className="wf-node" aria-hidden="true">{isDone ? "✓" : index + 1}</span>
              <span className="wf-label">{issueStatusLabels[step]}</span>
              {isCurrent ? <span className="visually-hidden">(jelenlegi állapot)</span> : null}
            </li>
          );
        })}
      </ol>

      {branchVisible ? (
        <p className={`wf-branch${onBranch ? " active" : ""}`}>
          <span className="wf-node" aria-hidden="true">!</span>
          <span>
            Mellékág: <strong>{issueStatusLabels[branchStatus]}</strong>
            {onBranch
              ? " – a hiba most itt áll. Javítási indok és új határidő után kiosztásra vagy folyamatba léphet vissza."
              : " – ha az ellenőrzés elutasítja, a hiba ide kerül, és javítás után tér vissza a sínre."}
          </span>
        </p>
      ) : null}

      {forwardTargets.length > 0 ? (
        <p className="wf-next-note">
          Innen léphet tovább: <strong>{forwardTargets.map((next) => issueStatusLabels[next]).join(", ")}</strong>
        </p>
      ) : null}

      {backwardTargets.length > 0 ? (
        <p className="wf-next-note back">
          Visszaléptethető: <strong>{backwardTargets.map((next) => issueStatusLabels[next]).join(", ")}</strong> – ehhez
          indokot kell írni, és bekerül az idővonalba.
        </p>
      ) : null}

      {nextStatuses.length === 0 ? (
        <p className="wf-next-note">
          {status === "closed"
            ? "Lezárva – nincs további terepi lépés ezen a hibán."
            : "Ebből az állapotból a jelenlegi szereped nem tud tovább léptetni."}
        </p>
      ) : null}
    </div>
  );
}
