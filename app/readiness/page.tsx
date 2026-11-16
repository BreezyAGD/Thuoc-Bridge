import Link from "next/link";
import results from "@/eval/results.json";
import smoke from "@/eval/live-smoke-results.json";
import evidenceJson from "@/data/release-evidence.json";
import { CURATED_RULE_COUNT, VERIFIED_RULE_COUNT } from "@/lib/alerts";
import { readinessGates, ReleaseEvidenceSchema } from "@/lib/readiness";

const evidence = ReleaseEvidenceSchema.parse(evidenceJson);
const source = "https://github.com/BreezyAGD/Thuoc-Bridge/blob/main/";
const milestones = [
  ["1–5", "Core extraction, reconciliation, alerts, demo, metrics, and print", "Implemented"],
  ["6", "Cloudflare hosting and physical rehearsal", "Adapted locally; external verification pending"],
  ["7", "Real-photo evaluation and human review", "Tools implemented; independent validation pending"],
  ["8", "Visit management and stale-result protection", "Implemented"],
  ["9", "Guided synthetic presentation", "Implemented"],
  ["10", "Evidence-based readiness and next steps", "Implemented; verification recorded separately"],
];

export default function ReadinessPage() {
  const gates = readinessGates({ photo: { ...results.photo_evaluation, generated_at: results.generated_at },
    rules: { total: CURATED_RULE_COUNT, reviewed: VERIFIED_RULE_COUNT }, evidence });
  const open = gates.filter(g => g.state !== "recorded").length;
  return <main lang="en" className="mx-auto flex w-full max-w-4xl flex-col gap-5 px-4 py-6">
    <nav aria-label="Readiness navigation" className="flex flex-wrap gap-4 text-[var(--terra)] underline"><Link href="/">Thuốc Bridge</Link><Link href="/demo-guide">Demo walkthrough</Link><Link href="/about-metrics">Metrics</Link></nav>
    <h1 className="text-3xl font-bold">Project readiness and next steps</h1>
    <p className="rounded-xl border border-[var(--terra)] bg-[var(--hover)] p-3 text-[var(--ink)]">The synthetic prototype can be demonstrated locally. Deployment and independent validation have separate evidence requirements.</p>
    <section aria-labelledby="gates-heading">
      <h2 id="gates-heading" className="text-2xl font-bold">{open} external gates open</h2>
      <p className="mt-2 text-sm text-slate-600">Read-only committed evidence, not a live audit. Records apply to their documented commits and reports; review changes before release. Nothing here reads credentials or marks approvals.</p>
      <ol aria-label="Readiness gates" className="mt-3 grid gap-4 md:grid-cols-2">
        {gates.map(g => <li key={g.id} className="rounded-xl border border-slate-300 bg-white p-4">
          <p className="text-sm font-semibold text-[var(--terra)]">{g.state === "recorded" ? "Evidence recorded" : g.state === "needs_review" ? "Measurement needs review" : "Pending evidence"}</p>
          <h3 className="mt-1 text-lg font-bold">{g.title}</h3>
          <p className="mt-2 text-sm">{g.detail}</p>
          <p className="mt-3 text-sm"><strong>Next:</strong> {g.next}</p>
        </li>)}
      </ol>
    </section>
    <section className="rounded-xl border border-slate-300 bg-white p-4">
      <h2 className="text-xl font-bold">Recorded software evidence</h2>
      <p className="mt-2">{evidence.regression.scope}: {evidence.regression.outcome === "passed" ? "passed" : "needs work"}. {evidence.regression.node_browser_cases} Node and {evidence.regression.workers_browser_cases} local Workers browser cases.</p>
      <p className="mt-1 break-words text-sm">Commit {evidence.regression.commit}; recorded {evidence.regression.checked_at}. <a href={evidence.regression.reference} className="text-[var(--terra)] underline">Recorded CI run</a></p>
      <p className="mt-3">{smoke.cases.filter(c => c.passed).length}/{smoke.cases.length} live synthetic smoke checks passed in the separate report dated {smoke.generated_at}. These were synthetic images, not a real-photo accuracy study.</p>
      <p className="mt-2 text-sm text-slate-600">These are historical records, not a claim that the currently running build has passed CI. The current branch’s CI result is recorded separately in GitHub.</p>
    </section>
    <section aria-labelledby="milestones-heading">
      <h2 id="milestones-heading" className="text-2xl font-bold">Milestone status</h2>
      <ul className="mt-3 space-y-3">{milestones.map(([number, title, state]) => <li key={number} className="rounded-lg border border-slate-300 bg-white p-3"><h3 className="font-bold">Milestone {number}: {title}</h3><p className="mt-1 text-sm">{state}</p></li>)}</ul>
    </section>
    <section className="rounded-xl border border-slate-300 bg-white p-4">
      <h2 className="text-xl font-bold">What can happen next</h2>
      <ol className="mt-3 list-decimal space-y-2 pl-5">
        <li>Now: rehearse the guided demo and the physical wifi-off local-server flow. No hosting credentials or real boxes are needed.</li>
        <li>When Cloudflare access is available: deploy and verify the actual hosted URL, APIs, and live extraction.</li>
        <li>When boxes/photos are available: independently label real images and measure extraction and matching accuracy.</li>
        <li>With reviewers: obtain pharmacist and fluent Vietnamese review, then rerun the regression and presentation checks.</li>
      </ol>
      <div className="mt-4 flex flex-wrap gap-4 text-[var(--terra)] underline"><Link href="/demo-guide">Open demo walkthrough</Link><a href={`${source}DEPLOYMENT.md`}>Deployment guide</a><a href={`${source}REVIEW.md`}>Review checklist</a><a href={`${source}DEMO-RUNBOOK.md`}>Rehearsal runbook</a></div>
    </section>
    <p className="text-sm text-slate-600">This page summarizes evidence for release planning and preserves the current visit. CI checks software behavior; clinical accuracy requires independent validation.</p>
  </main>;
}
