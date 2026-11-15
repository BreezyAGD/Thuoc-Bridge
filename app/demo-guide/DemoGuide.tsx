"use client";

import Link from "next/link";
import { useId, useRef, useState } from "react";
import type { DemoStep } from "@/lib/demo-walkthrough";
import { loadDemo, retryReconcile, useVisit } from "@/lib/visit-store";
import { NewVisit } from "../components/NewVisit";

export function DemoGuide({ steps }: { steps: DemoStep[] }) {
  const [index, setIndex] = useState(0);
  const visit = useVisit();
  const dialog = useRef<HTMLDialogElement>(null);
  const dialogId = useId();
  const step = steps[index];
  const selected = visit.demoMode && visit.demoScenario === step.scenarioId;
  const ready = selected && visit.reconState === "idle" && !!visit.recon;
  const actual = ready ? [...new Set(visit.recon!.alerts.map(a => a.rule_id))].sort() : [];
  const expected = step.expected.map(f => f.id).sort();
  const matched = ready && !visit.recon!.rxnav_unavailable && JSON.stringify(actual) === JSON.stringify(expected);
  const hasRealVisit = !visit.demoMode && (visit.products.length > 0 || visit.usMeds.length > 0);
  const button = "min-h-11 rounded-lg border border-teal-700 px-4 py-2 font-semibold text-teal-800 disabled:border-slate-300 disabled:text-slate-400";

  function load() {
    if (hasRealVisit) dialog.current?.showModal();
    else void loadDemo(step.scenarioId);
  }

  return <main lang="en" className="mx-auto flex w-full max-w-3xl flex-col gap-5 px-4 py-6">
    <nav aria-label="Demo navigation" className="flex flex-wrap gap-4 text-teal-800 underline">
      <Link href="/">Thuốc Bridge</Link><Link href="/patient">Patient view</Link><Link href="/clinician">Clinician view</Link><Link href="/about-metrics">Metrics</Link><Link href="/readiness">Readiness and next steps</Link>
    </nav>
    <header>
      <h1 className="text-3xl font-bold">Demo walkthrough</h1>
      <p className="mt-2 text-slate-700">Five synthetic scenarios for a presenter-led demonstration.</p>
    </header>
    <p className="rounded-xl border border-amber-400 bg-amber-50 p-3 text-sm text-amber-950">Synthetic sample images and cached ingredient lists. This walkthrough loads samples without calling the extraction service. Reproducing a fixture does not establish photo accuracy or clinical validation; rules still require pharmacist review.</p>
    <section aria-labelledby="step-heading" className="rounded-2xl border border-slate-300 bg-white p-4 shadow-sm sm:p-6">
      <p className="font-semibold text-teal-800">Step {index + 1} of {steps.length}</p>
      <h2 id="step-heading" className="mt-1 text-2xl font-bold">{step.title}</h2>
      <p className="mt-2 text-slate-700">{step.description}</p>
      <p className="mt-3 rounded-lg bg-slate-100 p-3"><strong>Show the audience:</strong> {step.presenterNote}</p>
      <h3 className="mt-4 text-lg font-bold">Expected demo findings</h3>
      <ul aria-label="Expected demo findings" className="mt-2 list-disc space-y-1 pl-5">
        {step.expected.map(f => <li key={f.id}>{f.title}{ready && actual.includes(f.id) && <span className="ml-2 font-semibold text-teal-800">· Observed</span>}</li>)}
      </ul>
      <button type="button" onClick={load} className="mt-4 min-h-12 rounded-lg bg-teal-700 px-4 py-2 font-semibold text-white">Load synthetic scenario</button>
      <div role="status" aria-live="polite" className="mt-3 text-sm">
        {!selected && <p>{hasRealVisit ? "A current visit is present. Loading this demo will ask before replacing it." : "Choose Load synthetic scenario to check this step. Changing steps does not replace the current visit."}</p>}
        {selected && visit.reconState === "loading" && <p>Checking the synthetic scenario…</p>}
        {selected && visit.reconState === "error" && <p>Could not check this demo. <button type="button" onClick={retryReconcile} className="min-h-11 px-2 font-semibold text-teal-800 underline">Retry scenario check</button></p>}
        {matched && <p className="font-bold text-teal-800">Expected demo findings reproduced.</p>}
        {ready && !matched && <p className="font-semibold text-amber-900">Demo output differs from the fixture. Review the clinician view before presenting.</p>}
      </div>
      {ready && <div className="mt-3 flex flex-wrap gap-3">
        <Link href="/clinician" className={button}>Review clinician findings</Link>
        {matched && <Link href="/summary" className={button}>Open printable summary</Link>}
      </div>}
      {ready && <p className="mt-2 text-sm text-slate-600">In the clinician view, choose View photo + transcript to compare each reading with the source image.</p>}
      {matched && index === steps.length - 1 && <p className="mt-4 rounded-lg bg-teal-50 p-3 font-semibold text-teal-950">Final step ready. Review Unverified, show the printable summary, and use Start new visit before the next participant.</p>}
    </section>
    <nav aria-label="Walkthrough steps" className="flex flex-wrap items-center justify-between gap-3">
      <button type="button" disabled={index === 0} onClick={() => setIndex(i => i - 1)} className={button}>Previous step</button>
      <button type="button" disabled={index === steps.length - 1} onClick={() => setIndex(i => i + 1)} className={button}>Next step</button>
    </nav>
    <p className="text-sm text-slate-600">For a wifi-off presentation, keep the local server running on the same laptop. A hosted site still needs internet for a cold load. Alternate demo variants remain available in the patient and clinician views.</p>
    <NewVisit english />
    <dialog ref={dialog} aria-labelledby={dialogId} className="fixed inset-0 m-auto w-[calc(100%-2rem)] max-w-lg rounded-2xl border border-slate-300 bg-white p-5 text-slate-900 shadow-xl backdrop:bg-slate-900/60">
      <h2 id={dialogId} className="text-xl font-bold">Replace the current visit?</h2>
      <p className="mt-3">This clears the current visit’s local medicines, photos, and results and loads a synthetic sample. Downloaded files remain.</p>
      <div className="mt-5 flex flex-wrap justify-end gap-3">
        <button type="button" autoFocus onClick={() => dialog.current?.close()} className={button}>Cancel</button>
        <button type="button" onClick={() => { dialog.current?.close(); void loadDemo(step.scenarioId); }} className="min-h-11 rounded-lg bg-teal-700 px-4 py-2 font-semibold text-white">Replace with synthetic demo</button>
      </div>
    </dialog>
  </main>;
}
