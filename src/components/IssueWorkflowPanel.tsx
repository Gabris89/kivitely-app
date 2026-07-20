"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Issue, IssueStatus } from "@/types";
import { getNextStatuses, getWorkflowHint, issueStatusLabels } from "@/lib/workflow";
import { StatusBadge } from "@/components/StatusBadge";

const issueStatusActionLabels: Partial<Record<IssueStatus, string>> = {
  assigned: "Kiosztás",
  in_progress: "Folyamatban",
  ready_for_review: "Ellenőrzésre küldés",
  accepted: "Elfogadás",
  rejected: "Visszadobás",
  tig_ready: "TIG-ready jelölés",
  closed: "Lezárás"
};

export function IssueWorkflowPanel({ issue }: { issue: Issue }) {
  const router = useRouter();
  const [currentStatus, setCurrentStatus] = useState<IssueStatus>(issue.status);
  const [message, setMessage] = useState<string>("");
  const optimisticIssue = useMemo(() => ({ ...issue, status: currentStatus }), [currentStatus, issue]);
  const nextStatuses = getNextStatuses(optimisticIssue, "project_manager");

  async function changeStatus(target: IssueStatus) {
    setCurrentStatus(target);
    setMessage("Státuszváltás mentése...");

    const response = await fetch(`/api/issues/${issue.id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: target })
    }).catch(() => undefined);

    if (!response?.ok) {
      setCurrentStatus(issue.status);
      setMessage("A státuszváltás nem sikerült. Próbáld újra.");
      return;
    }

    setMessage(`Státuszváltás mentve: ${issue.id} → ${issueStatusLabels[target]}.`);
    router.refresh();
  }

  return (
    <article className="card panel workflow-panel">
      <div className="section-title">
        <h2>Állapot</h2>
        <StatusBadge status={currentStatus} />
      </div>
      <p>{getWorkflowHint(optimisticIssue)}</p>

      <div className="workflow-actions">
        {nextStatuses.length > 0 ? (
          nextStatuses.map((status) => (
            <button key={status} className="button ghost" type="button" onClick={() => changeStatus(status)}>
              {issueStatusActionLabels[status] ?? issueStatusLabels[status]}
            </button>
          ))
        ) : (
          <span className="success-message">Nincs további státuszlépés ebben az állapotban.</span>
        )}
      </div>

      {message ? <div className="inline-note">{message}</div> : null}
    </article>
  );
}
