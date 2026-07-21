import type { BlockerStatus, IssueStatus, Priority } from "@/types";
import { issueStatusLabels } from "@/lib/workflow";
import { blockerStatusLabels } from "@/lib/blockerWorkflow";

const priorityLabels: Record<Priority, string> = {
  low: "Alacsony",
  normal: "Normál",
  high: "Magas",
  critical: "Kritikus"
};

export function StatusBadge({ status }: { status: IssueStatus }) {
  return <span className={`status status-${status}`}>{issueStatusLabels[status]}</span>;
}

export function PriorityBadge({ priority }: { priority: Priority }) {
  return <span className={`priority priority-${priority}`}>{priorityLabels[priority]}</span>;
}

export function BlockerStatusBadge({ status }: { status: BlockerStatus }) {
  return <span className={`status status-${status}`}>{blockerStatusLabels[status]}</span>;
}
