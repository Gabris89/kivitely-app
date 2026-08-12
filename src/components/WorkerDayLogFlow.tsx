"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";

type WorkerProject = { id: string; name: string };

type Props = {
  greetingName?: string;
  canLog: boolean;
  projects: WorkerProject[];
};

type Step = "home" | "form" | "done";

function todayLabel() {
  return new Intl.DateTimeFormat("hu-HU", { year: "numeric", month: "long", day: "numeric", weekday: "long" }).format(new Date());
}

/**
 * A munkas EGY dolga: napi munka rogzitese. Harom lepes, semmi menu:
 *   home  - egy nagy gomb
 *   form  - rovid urlap (projekt, mit csinalt, opcionalis mennyiseg)
 *   done  - "Kesz", innen uj rogzites vagy kilepes.
 */
export function WorkerDayLogFlow({ greetingName, canLog, projects }: Props) {
  const [step, setStep] = useState<Step>("home");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [projectId, setProjectId] = useState(projects.length === 1 ? projects[0].id : "");
  const [savedSummary, setSavedSummary] = useState("");

  const projectName = projects.find((project) => project.id === projectId)?.name || "";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const form = event.currentTarget;
    const data = new FormData(form);
    const description = String(data.get("description") || "").trim();
    const chosenProject = projects.length === 1 ? projects[0].id : String(data.get("projectId") || "");
    const quantity = String(data.get("quantity") || "").trim();
    const unit = String(data.get("unit") || "").trim();

    if (!chosenProject) {
      setError("Válaszd ki, melyik munkán dolgoztál.");
      return;
    }
    if (!description) {
      setError("Írd le pár szóval, mit csináltál ma.");
      return;
    }

    setSaving(true);
    const response = await fetch(`/api/projects/${chosenProject}/work-logs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ description, quantity: quantity || undefined, unit: unit || undefined })
    }).catch(() => null);
    setSaving(false);

    if (!response?.ok) {
      setError("A mentés nem sikerült. Próbáld újra.");
      return;
    }

    setSavedSummary(quantity ? `${description} · ${quantity} ${unit}`.trim() : description);
    setStep("done");
  }

  function startNew() {
    setSavedSummary("");
    setError("");
    setProjectId(projects.length === 1 ? projects[0].id : "");
    setStep("home");
  }

  if (!canLog) {
    return (
      <div className="worker-flow">
        <div className="worker-card">
          <p className="worker-lead">Ehhez a fiókhoz nincs napló-rögzítési jog.</p>
          <Link className="worker-textlink" href="/">Tovább az alkalmazásba</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="worker-flow">
      {step === "home" ? (
        <div className="worker-card worker-home">
          <div className="worker-greeting">
            <span className="worker-hello">{greetingName ? `Szia, ${greetingName}!` : "Szia!"}</span>
            <span className="worker-date">{todayLabel()}</span>
          </div>

          <button type="button" className="worker-big-button" onClick={() => setStep("form")}>
            Mai munka<br />rögzítése
          </button>

          <Link className="worker-textlink" href="/">Teljes alkalmazás</Link>
        </div>
      ) : null}

      {step === "form" ? (
        <form className="worker-card worker-form" onSubmit={handleSubmit} suppressHydrationWarning>
          <h1 className="worker-form-title">Mai munka</h1>

          {projects.length === 1 ? (
            <p className="worker-project-fixed">{projects[0].name}</p>
          ) : (
            <label className="worker-field">
              Melyik munkán dolgoztál?
              <select name="projectId" value={projectId} onChange={(event) => setProjectId(event.target.value)} suppressHydrationWarning>
                <option value="">Válassz…</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>{project.name}</option>
                ))}
              </select>
            </label>
          )}

          <label className="worker-field">
            Mit csináltál ma?
            <textarea name="description" rows={4} placeholder="Pl. Fürdő csempézése, 2. emelet" suppressHydrationWarning />
          </label>

          <div className="worker-field-row">
            <label className="worker-field">
              Mennyiség <span className="worker-optional">(nem kötelező)</span>
              <input name="quantity" type="text" inputMode="decimal" placeholder="pl. 12" suppressHydrationWarning />
            </label>
            <label className="worker-field">
              Egység
              <input name="unit" type="text" placeholder="pl. m²" suppressHydrationWarning />
            </label>
          </div>

          {error ? <p className="worker-error">{error}</p> : null}

          <button type="submit" className="worker-big-button worker-save" disabled={saving}>
            {saving ? "Mentés…" : "Mentés"}
          </button>
          <button type="button" className="worker-textlink" onClick={() => { setError(""); setStep("home"); }}>
            Vissza
          </button>
        </form>
      ) : null}

      {step === "done" ? (
        <div className="worker-card worker-done">
          <div className="worker-check" aria-hidden="true">✓</div>
          <h1 className="worker-done-title">Kész!</h1>
          <p className="worker-done-summary">
            {projectName ? <strong>{projectName}</strong> : null}
            {savedSummary}
          </p>
          <button type="button" className="worker-big-button" onClick={startNew}>
            Új rögzítés
          </button>
          <Link className="worker-textlink" href="/">Teljes alkalmazás</Link>
        </div>
      ) : null}
    </div>
  );
}
