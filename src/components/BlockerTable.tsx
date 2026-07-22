import Link from "next/link";
import { blockerStatusLabels } from "@/lib/blockerWorkflow";
import type { BlockerItem } from "@/types";
import { ChevronRightIcon } from "@/components/ActionIcons";

function scopeLabel(blocker: BlockerItem) {
  return [blocker.trade, blocker.area].filter(Boolean).join(" · ") || "Nincs megadva";
}

export function BlockerTable({ blockers, showProject = false }: { blockers: BlockerItem[]; showProject?: boolean }) {
  if (!blockers.length) {
    return <p className="card empty-list">Nincs megjeleníthető akadály.</p>;
  }

  return (
    <div className="entity-list" aria-label="Akadályok">
      {blockers.map((blocker) => (
        <Link key={blocker.id} className="entity-row" href={`/projects/${blocker.projectId}/blockers/${blocker.publicId}`}>
          <div className="entity-row-main">
            <strong>{blocker.publicId} · {blocker.title}</strong>
            <span>
              {blockerStatusLabels[blocker.status]}
              {showProject ? ` · ${blocker.projectId} · ${blocker.projectName}` : ""}
              {` · ${scopeLabel(blocker)} · ${blocker.responsibleName}`}
            </span>
          </div>
          <span className="entity-row-chevron"><ChevronRightIcon /></span>
        </Link>
      ))}
    </div>
  );
}
