"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { formatDate } from "@/lib/format";
import type { ProjectDocument, ProjectDocumentType } from "@/types";
import { ProjectDocumentViewer } from "@/components/ProjectDocumentViewer";
import { SearchBox } from "@/components/SearchBox";
import { TrashIcon } from "@/components/ActionIcons";

const documentTypeLabels: Record<ProjectDocumentType, string> = {
  architectural_plan: "Építész terv",
  technical_plan: "Műszaki terv",
  material_spec: "Anyagspecifikáció",
  photo_document: "Fotódokumentum",
  contract_document: "Szerződéses dokumentum",
  other: "Egyéb"
};

const documentTypeOrder: ProjectDocumentType[] = [
  "architectural_plan",
  "technical_plan",
  "material_spec",
  "photo_document",
  "contract_document",
  "other"
];

type Filter = "all" | ProjectDocumentType;

function formatScope(trade?: string, area?: string) {
  return [trade, area].filter(Boolean).join(" / ") || "Nincs megadva";
}

function formatFileSize(value?: number) {
  if (!value) return null;

  if (value >= 1024 * 1024) {
    return `${new Intl.NumberFormat("hu-HU", { maximumFractionDigits: 1 }).format(value / 1024 / 1024)} MB`;
  }

  return `${new Intl.NumberFormat("hu-HU", { maximumFractionDigits: 0 }).format(value / 1024)} KB`;
}

function getFileExtension(fileName?: string) {
  if (!fileName) return null;
  const extension = fileName.split(".").pop();
  return extension && extension !== fileName ? extension.toUpperCase() : null;
}

export function DocumentFilters({ documents }: { documents: ProjectDocument[] }) {
  const router = useRouter();
  const [typeFilter, setTypeFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function deleteDocument(document: ProjectDocument) {
    if (!window.confirm(`Biztosan törlöd ezt a dokumentumot: "${document.title}"?`)) return;

    setDeletingId(document.id);

    const response = await fetch(`/api/documents/${document.id}`, { method: "DELETE" }).catch(() => undefined);

    setDeletingId(null);

    if (!response?.ok) return;

    router.refresh();
  }

  const filteredDocuments = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return documents.filter((document) => {
      const matchesType = typeFilter === "all" || document.documentType === typeFilter;
      const matchesSearch =
        !normalizedSearch ||
        [document.title, document.description, document.trade, document.area]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(normalizedSearch);

      return matchesType && matchesSearch;
    });
  }, [documents, search, typeFilter]);

  return (
    <div className="issue-filter-stack">
      <SearchBox
        value={search}
        onChange={setSearch}
        placeholder="Cím, szakma, terület, leírás..."
        resultCount={filteredDocuments.length}
      />

      <div className="status-filter-row" aria-label="Típus szűrők">
        <button className={typeFilter === "all" ? "active" : ""} type="button" onClick={() => setTypeFilter("all")}>
          Összes <strong>{documents.length}</strong>
        </button>
        {documentTypeOrder.map((type) => {
          const count = documents.filter((document) => document.documentType === type).length;
          if (count === 0) return null;

          return (
            <button key={type} className={typeFilter === type ? "active" : ""} type="button" onClick={() => setTypeFilter(type)}>
              {documentTypeLabels[type]} <strong>{count}</strong>
            </button>
          );
        })}
      </div>

      <div className="document-list card" aria-label="Projekt dokumentumok és tervek">
        {filteredDocuments.map((document) => {
          const documentScope = formatScope(document.trade, document.area);
          const extension = getFileExtension(document.fileName);
          const fileSize = formatFileSize(document.fileSizeBytes);
          const fileMeta = [extension, fileSize].filter(Boolean).join(" · ");

          return (
            <div className="document-row" key={document.id}>
              <span className={`status document-type document-type-${document.documentType}`}>
                {documentTypeLabels[document.documentType]}
              </span>

              <div className="document-row-body">
                <strong>{document.title}</strong>
                {document.description ? <p className="document-row-desc">{document.description}</p> : null}
                <small>
                  {documentScope} · {document.revision || "nincs revízió"}
                  {fileMeta ? ` · ${fileMeta}` : ""} · {formatDate(document.updatedAt)}
                  {!document.isCurrent ? " · Archivált" : ""}
                </small>
              </div>

              <div className="document-row-action">
                {document.url ? (
                  <ProjectDocumentViewer doc={document} />
                ) : (
                  <span className="document-row-missing">{document.storagePath ? "Nincs Storage URL" : "Nincs fájl"}</span>
                )}
                <button
                  type="button"
                  className="document-row-delete"
                  disabled={deletingId === document.id}
                  onClick={() => deleteDocument(document)}
                  aria-label="Dokumentum törlése"
                  title="Dokumentum törlése"
                >
                  {deletingId === document.id ? <span aria-hidden="true">...</span> : <TrashIcon />}
                </button>
              </div>
            </div>
          );
        })}

        {!filteredDocuments.length ? (
          <div className="document-empty">
            <strong>Nincs megjeleníthető dokumentum.</strong>
            <span>
              {documents.length
                ? "Nincs találat a keresésre vagy szűrésre."
                : "Ha Supabase nincs elérhető vagy még nincs feltöltött dokumentum, az oldal read-only módban üres állapotot mutat."}
            </span>
          </div>
        ) : null}
      </div>
    </div>
  );
}
