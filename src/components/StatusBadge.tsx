import type { IssueStatus, Priority } from "@/types";
import { issueStatusLabels } from "@/lib/workflow";

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
