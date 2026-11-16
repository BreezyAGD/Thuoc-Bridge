"use client";

import Link from "next/link";
import { useVisit } from "@/lib/visit-store";

export default function SummaryPage() {
  const visit = useVisit();
  const recon = visit.recon;
  const busy = visit.reconState === "loading" || visit.products.some((p) => p.state === "reading");
  const ready = !!recon && !busy && visit.reconState !== "error";
  return (
    <main lang="en" className="summary mx-auto w-full max-w-4xl p-4 sm:p-8">
      <nav className="mb-5 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href="/" className="min-h-11 py-2 text-teal-800 underline">Back to workspace</Link>
        <button type="button" disabled={!ready} onClick={() => window.print()} className="min-h-11 rounded-lg bg-teal-700 px-4 font-semibold text-white disabled:bg-slate-400">Print / Save PDF</button>
      </nav>
      <h1 className="text-2xl font-bold">Thuốc Bridge · Medication summary</h1>
      <p className="mt-1 text-sm">For pharmacist / clinician review · {visit.demoMode ? "DEMO — sample labels, not live AI reads" : "Current visit"}</p>
      <p className="my-3 rounded border border-slate-400 p-2 text-sm">Prototype. Verify against the original boxes and medication history. This is not a prescription or a complete interaction screen. Do not change medicines based on this summary alone.</p>
      {!ready ? <p role="status">{busy ? "Reading labels and matching ingredients. Please wait before printing." : "No current summary available. Return to the clinician view to add medicines or retry reconciliation."}</p> : <>
        <section>
          <h2 className="text-lg font-bold">Photographed products</h2>
          {recon.products.length === 0 && <p>No products photographed.</p>}
          <table className="mt-2 w-full border-collapse text-sm">
            <thead><tr><th>Product</th><th>Guard-checked label / per-unit strength</th><th>US ingredient · RxCUI · confidence</th></tr></thead>
            <tbody>{recon.products.map((p) => <tr key={p.id}>
              <td>{p.brand ?? "Name not read"}</td>
              <td>{p.ingredients.length ? p.ingredients.map((i, n) => <div key={n}>{i.name_verified ? i.printed_name : "Unverified ingredient"}{i.strength !== null ? ` · ${i.strength} ${i.unit ?? ""}` : " · strength not read"}</div>) : "Unverified – ask pharmacist / bring the box"}</td>
              <td>{p.ingredients.map((i, n) => <div key={n}>{i.confidence === "unverified" ? "Unverified – ask pharmacist / bring the box" : i.resolution.concepts.map((c) => `${c.name} (${c.rxcui})`).join(" + ")} · {i.confidence}</div>)}{p.unverified_reason && <div>{p.unverified_reason}</div>}</td>
            </tr>)}</tbody>
          </table>
        </section>
        <section className="mt-4">
          <h2 className="text-lg font-bold">Current US medicines (as entered)</h2>
          {recon.usMeds.length === 0 ? <p>None entered; medication history may be incomplete.</p> : <ul className="list-disc pl-5 text-sm">{recon.usMeds.map((m) => <li key={m.id}><strong>{m.text}</strong>: {m.confidence === "unverified" ? "Unverified – confirm with bottle / pharmacist" : m.resolution.concepts.map((c) => `${c.name} (${c.rxcui})`).join(" + ")} · {m.confidence}</li>)}</ul>}
        </section>
        <section className="mt-4">
          <h2 className="text-lg font-bold">Alerts requiring review ({recon.alerts.length})</h2>
          {recon.alerts.length === 0 && <p>No curated rule matched. Absence of an alert is not evidence of safety.</p>}
          <ol className="mt-1 list-decimal space-y-2 pl-5 text-sm">{recon.alerts.map((a) => <li key={a.id} className="break-inside-avoid"><strong>{a.severity.toUpperCase()} · {a.title}</strong>
            <p>{a.involved.map((i) => `${i.source_label}: ${i.ingredient}${i.strength ? ` ${i.strength} per unit` : ""}`).join("; ")}</p>
            {a.unresolved.map((u, n) => <p key={n}>{u.source_label}: {u.detail}</p>)}
            <p>{a.rationale}</p>
            {a.low_confidence && <p>Low-confidence match: confirm against the box first.</p>}
            {a.curated && <p>{a.verified_by ? `Reviewed by ${a.verified_by}` : "Pending pharmacist review"}</p>}
            {a.source && <p>Source: <a href={a.evidence?.link ?? a.source.url} className="underline">{a.source.label}</a></p>}
          </li>)}</ol>
        </section>
        <footer className="mt-4 border-t border-slate-400 pt-2 text-xs">
          <p>{recon.rules_checked} curated rules checked; {recon.rules_verified} pharmacist-reviewed. Unverified items require the original box and pharmacist confirmation.</p>
          {recon.rxnav_unavailable && <p>Some RxNorm lookups were unavailable. Confirm unresolved ingredients manually.</p>}
          <p className="mt-2">Pharmacist / clinician review: ____________________ Date: __________</p>
          <p className="print:hidden">Designed for one page for a typical demo visit. Longer visits continue onto additional pages so all findings remain visible. Select Letter or A4, portrait, and disable browser headers and footers.</p>
        </footer>
      </>}
    </main>
  );
}
