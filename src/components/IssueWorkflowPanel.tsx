"use client";

import { useMemo, useState } from "react";
import type { Issue, IssueStatus } from "@/types";
import { getNextStatuses, getWorkflowHint, issueStatusLabels } from "@/lib/workflow";
import { StatusBadge } from "@/components/StatusBadge";

export function IssueWorkflowPanel({ issue }: { issue: Issue }) {
  const [currentStatus, setCurrentStatus] = useState<IssueStatus>(issue.status);
  const [message, setMessage] = useState<string>("");
  const optimisticIssue = useMemo(() => ({ ...issue, status: currentStatus }), [currentStatus, issue]);
  const nextStatuses = getNextStatuses(optimisticIssue, "project_manager");

  async function changeStatus(target: IssueStatus) {
    setCurrentStatus(target);
    setMessage(`Mock státuszváltás: ${issue.id} → ${issueStatusLabels[target]}. Ez még nem ment adatbázisba.`);

    await fetch(`/api/issues/${issue.id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: target })
    }).catch(() => undefined);
  }

  return (
    <article className="card panel workflow-panel">
      <div className="section-title">
        <h2>Workflow vezérlés</h2>
        <StatusBadge status={currentStatus} />
      </div>
      <p>{getWorkflowHint(optimisticIssue)}</p>

      <div className="workflow-actions">
        {nextStatuses.length > 0 ? (
          nextStatuses.map((status) => (
            <button key={status} className="button ghost" type="button" onClick={() => changeStatus(status)}>
              {issueStatusLabels[status]}
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
