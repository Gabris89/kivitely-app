"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatHuf } from "@/lib/format";
import type { TigItem, TigPackage, TigPackageStatus } from "@/types";

type SubOption = { publicId: string; name: string; trade: string };

const statusLabels: Record<TigPackageStatus, string> = {
  draft: "Piszkozat",
  ready_for_review: "Ellenőrzésre vár",
  approved: "Elfogadva",
  sent: "Kiküldve"
};

// Megengedett állapotátmenetek (a szerveroldali validációval összhangban).
const nextActions: Record<TigPackageStatus, { label: string; to: TigPackageStatus; primary?: boolean }[]> = {
  draft: [{ label: "Ellenőrzésre beküld", to: "ready_for_review", primary: true }],
  ready_for_review: [
    { label: "Elfogad", to: "approved", primary: true },
    { label: "Vissza piszkozatra", to: "draft" }
  ],
  approved: [
    { label: "Kiküldve", to: "sent", primary: true },
    { label: "Vissza ellenőrzésre", to: "ready_for_review" }
  ],
  sent: []
};

export function TigWorkspace({
  projectId,
  subcontractors,
  packages
}: {
  projectId: string;
  subcontractors: SubOption[];
  packages: TigPackage[];
}) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [error, setError] = useState("");

  // Create form state
  const [sub, setSub] = useState("");
  const [candidates, setCandidates] = useState<TigItem[]>([]);
  const [loadingCandidates, setLoadingCandidates] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [meta, setMeta] = useState({ performanceDate: "", periodStart: "", periodEnd: "", note: "" });
  const [saving, setSaving] = useState(false);

  async function loadCandidates(subPublicId: string) {
    setSub(subPublicId);
    setSelected(new Set());
    setCandidates([]);
    setError("");
    if (!subPublicId) return;

    setLoadingCandidates(true);
    const res = await fetch(
      `/api/projects/${projectId}/tig/candidates?subcontractor=${encodeURIComponent(subPublicId)}`
    ).catch(() => null);
    setLoadingCandidates(false);

    if (!res?.ok) {
      setError("A jelölt hibák betöltése nem sikerült.");
      return;
    }
    const json = await res.json().catch(() => null);
    setCandidates(Array.isArray(json?.data) ? json.data : []);
  }

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function resetCreate() {
    setCreating(false);
    setSub("");
    setCandidates([]);
    setSelected(new Set());
    setMeta({ performanceDate: "", periodStart: "", periodEnd: "", note: "" });
  }

  const selectedValue = candidates
    .filter((item) => selected.has(item.id))
    .reduce((sum, item) => sum + item.valueHuf, 0);

  async function submitCreate() {
    setError("");
    if (!sub) return setError("Válassz alvállalkozót.");
    if (selected.size === 0) return setError("Válassz legalább egy tételt.");

    setSaving(true);
    const res = await fetch(`/api/projects/${projectId}/tig`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subcontractorId: sub,
        issueIds: Array.from(selected),
        performanceDate: meta.performanceDate || null,
        periodStart: meta.periodStart || null,
        periodEnd: meta.periodEnd || null,
        note: meta.note || null
      })
    }).catch(() => null);
    setSaving(false);

    if (!res?.ok) {
      const json = await res?.json().catch(() => null);
      return setError(json?.error || "A csomag létrehozása nem sikerült.");
    }
    resetCreate();
    router.refresh();
  }

  async function changeStatus(pkgId: string, to: TigPackageStatus) {
    setBusyId(pkgId);
    setError("");
    const res = await fetch(`/api/tig/${encodeURIComponent(pkgId)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: to })
    }).catch(() => null);
    setBusyId(null);

    if (!res?.ok) {
      const json = await res?.json().catch(() => null);
      return setError(json?.error || "Állapotváltás sikertelen.");
    }
    router.refresh();
  }

  async function remove(pkgId: string) {
    setBusyId(pkgId);
    setError("");
    const res = await fetch(`/api/tig/${encodeURIComponent(pkgId)}`, { method: "DELETE" }).catch(() => null);
    setBusyId(null);
    setConfirmDelete(null);

    if (!res?.ok) {
      const json = await res?.json().catch(() => null);
      return setError(json?.error || "Törlés sikertelen.");
    }
    router.refresh();
  }

  return (
    <div className="tig-workspace">
      <div className="section-title">
        <h2>TIG csomagok</h2>
        {!creating ? (
          <button type="button" className="button primary" onClick={() => setCreating(true)}>
            + Új TIG csomag
          </button>
        ) : null}
      </div>

      {error ? <p className="error-message tig-error">{error}</p> : null}

      {creating ? (
        <div className="card form-card tig-create">
          <div className="form-grid">
            <label className="full">
              Alvállalkozó
              <select value={sub} onChange={(event) => loadCandidates(event.target.value)}>
                <option value="">Válassz alvállalkozót…</option>
                {subcontractors.map((option) => (
                  <option key={option.publicId} value={option.publicId}>
                    {option.name}
                    {option.trade ? ` · ${option.trade}` : ""}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {sub ? (
            <div className="tig-candidates">
              <div className="section-title">
                <h2>Jelölt tételek (tig-ready hibák)</h2>
                <span className="pill">{selected.size} kiválasztva</span>
              </div>

              {loadingCandidates ? (
                <p className="tig-candidate-empty">Betöltés…</p>
              ) : candidates.length === 0 ? (
                <p className="tig-candidate-empty">
                  Ehhez az alvállalkozóhoz nincs TIG-ready hiba ebben a projektben.
                </p>
              ) : (
                <div className="tig-list">
                  {candidates.map((item) => (
                    <label className="tig-item tig-item-selectable" key={item.id}>
                      <input type="checkbox" checked={selected.has(item.id)} onChange={() => toggle(item.id)} />
                      <div>
                        <strong>{item.id} · {item.title}</strong>
                        <span>{item.proofCount} db bizonyíték</span>
                      </div>
                      <b>{formatHuf(item.valueHuf)}</b>
                    </label>
                  ))}
                </div>
              )}
            </div>
          ) : null}

          <div className="form-grid tig-meta">
            <label>
              Teljesítési dátum
              <input
                type="date"
                value={meta.performanceDate}
                onChange={(event) => setMeta({ ...meta, performanceDate: event.target.value })}
              />
            </label>
            <div className="tig-period">
              <span className="tig-field-label">Elszámolási időszak</span>
              <div className="tig-period-grid">
                <label>
                  Kezdete
                  <input
                    type="date"
                    value={meta.periodStart}
                    onChange={(event) => setMeta({ ...meta, periodStart: event.target.value })}
                  />
                </label>
                <label>
                  Vége
                  <input
                    type="date"
                    value={meta.periodEnd}
                    onChange={(event) => setMeta({ ...meta, periodEnd: event.target.value })}
                  />
                </label>
              </div>
            </div>
            <label>
              Megjegyzés (szerződés / mérföldkő)
              <textarea
                value={meta.note}
                onChange={(event) => setMeta({ ...meta, note: event.target.value })}
                placeholder="Pl. hivatkozás a szerződésre vagy az elszámolási mérföldkőre."
              />
            </label>
          </div>

          <div className="tig-create-footer">
            <span className="tig-selected-summary">
              {selected.size} tétel · {formatHuf(selectedValue)}
            </span>
            <div className="tig-create-buttons">
              <button type="button" className="button ghost" onClick={resetCreate}>
                Mégse
              </button>
              <button type="button" className="button primary" onClick={submitCreate} disabled={saving}>
                {saving ? "Létrehozás…" : "Csomag létrehozása"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {packages.length === 0 && !creating ? (
        <p className="card empty-list">Még nincs TIG csomag. Hozz létre egyet az „Új TIG csomag" gombbal.</p>
      ) : (
        <div className="package-list">
          {packages.map((pkg) => {
            const value = pkg.netValueHuf ?? pkg.grossValueHuf;
            const actions = nextActions[pkg.status];
            const isBusy = busyId === pkg.id;
            return (
              <div className="card tig-package" key={pkg.id}>
                <div className="tig-package-top">
                  <div className="tig-package-title">
                    <strong>{pkg.id} · {pkg.subcontractor}</strong>
                    <span>
                      {pkg.issueIds.length} tétel · {pkg.proofCount} bizonyíték
                      {pkg.performanceDate ? ` · teljesítés: ${pkg.performanceDate}` : ""}
                    </span>
                  </div>
                  <span className={`pill tig-status tig-status-${pkg.status}`}>{statusLabels[pkg.status]}</span>
                </div>

                <div className="tig-package-bottom">
                  <b className="tig-package-amount">{formatHuf(value)}</b>

                  {confirmDelete === pkg.id ? (
                    <div className="tig-actions">
                      <span className="tig-confirm-text">Biztosan törlöd?</span>
                      <button type="button" className="button danger" onClick={() => remove(pkg.id)} disabled={isBusy}>
                        Igen, törlöm
                      </button>
                      <button type="button" className="button ghost" onClick={() => setConfirmDelete(null)}>
                        Mégse
                      </button>
                    </div>
                  ) : (
                    <div className="tig-actions">
                      {actions.map((action) => (
                        <button
                          key={action.to}
                          type="button"
                          className={`button ${action.primary ? "primary" : "ghost"}`}
                          onClick={() => changeStatus(pkg.id, action.to)}
                          disabled={isBusy}
                        >
                          {action.label}
                        </button>
                      ))}
                      {pkg.status === "draft" ? (
                        <button type="button" className="button ghost" onClick={() => setConfirmDelete(pkg.id)} disabled={isBusy}>
                          Törlés
                        </button>
                      ) : null}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
