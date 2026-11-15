"use client";

import type { Alert, Severity } from "@/lib/alerts";
import type { ReconcileResponse } from "@/lib/reconcile";

const SEVERITY: Record<Severity, { label: string; badge: string; border: string }> = {
  high: { label: "High", badge: "bg-red-700 text-white", border: "border-red-400" },
  moderate: { label: "Moderate", badge: "bg-orange-600 text-white", border: "border-orange-300" },
  low: { label: "Low", badge: "bg-yellow-300 text-yellow-950", border: "border-yellow-300" },
  info: { label: "Info", badge: "bg-slate-600 text-white", border: "border-slate-300" },
};

const KIND_LABEL: Record<Alert["kind"], string> = {
  duplicate_ingredient: "Therapeutic duplication",
  duplicate_class: "Same-class duplication",
  interaction: "Interaction",
  flag: "Flag",
  unresolved: "Not identified",
};

function AlertCard({ alert }: { alert: Alert }) {
  const s = SEVERITY[alert.severity];
  return (
    <li className={`rounded-xl border-2 ${s.border} bg-white p-4 break-inside-avoid`}>
      <div className="flex flex-wrap items-center gap-2">
        <span className={`rounded-full px-2.5 py-0.5 text-sm font-bold ${s.badge}`}>{s.label}</span>
        <span className="text-sm font-medium text-slate-600">{KIND_LABEL[alert.kind]}</span>
        {alert.curated &&
          (alert.verified_by ? (
            <span className="rounded-full border border-emerald-400 bg-emerald-50 px-2.5 py-0.5 text-sm font-medium text-emerald-900">
              Reviewed by {alert.verified_by}
            </span>
          ) : (
            <span className="rounded-full border border-amber-400 bg-amber-50 px-2.5 py-0.5 text-sm font-medium text-amber-900">
              Pending pharmacist review
            </span>
          ))}
        {!alert.curated && alert.kind === "duplicate_ingredient" && (
          <span className="rounded-full border border-slate-300 px-2.5 py-0.5 text-sm text-slate-700">
            Automatic: same RxNorm ingredient
          </span>
        )}
      </div>

      <h3 className="mt-2 text-lg font-bold">{alert.title}</h3>

      {alert.involved.length > 0 && (
        <ul className="mt-2 flex flex-col gap-1">
          {alert.involved.map((item) => (
            <li key={`${item.source_id}:${item.rxcui}`} className="text-base">
              <span className="font-semibold">{item.source_label}</span>
              <span className="text-slate-600"> ({item.source_kind === "photo" ? "photographed" : "US medicine"})</span>
              {": "}
              {item.printed_name && item.printed_name.toLowerCase() !== item.ingredient.toLowerCase() && (
                <span>{item.printed_name} → </span>
              )}
              <span className="font-semibold">{item.ingredient}</span>
              {item.strength && <span> {item.strength} per unit</span>}
            </li>
          ))}
        </ul>
      )}

      {alert.unresolved.length > 0 && (
        <ul className="mt-2 flex flex-col gap-1">
          {alert.unresolved.map((u, i) => (
            <li key={i} className="text-base">
              <span className="font-semibold">{u.source_label}</span>: {u.detail}
            </li>
          ))}
        </ul>
      )}

      <p className="mt-2 text-base">{alert.rationale}</p>
      {alert.low_confidence && (
        <p className="mt-1 text-sm font-medium text-orange-800">
          Rests on a low-confidence ingredient match. Confirm the ingredient against the box first.
        </p>
      )}
      {alert.mechanism && (
        <p className="mt-1 text-sm text-slate-700">
          <span className="font-semibold">Mechanism:</span> {alert.mechanism}
        </p>
      )}

      {alert.source && (
        <div className="mt-2 text-sm">
          <span className="font-semibold">Source:</span>{" "}
          <a href={alert.evidence?.link ?? alert.source.url} target="_blank" rel="noreferrer" className="text-teal-800 underline">
            {alert.source.label}
          </a>
          {alert.evidence?.link && alert.evidence.link !== alert.source.url && (
            <>
              {" · "}
              <a href={alert.source.url} target="_blank" rel="noreferrer" className="text-teal-800 underline print:hidden">
                openFDA query
              </a>
            </>
          )}
          {alert.evidence ? (
            <details className="mt-1 print:hidden">
              <summary className="cursor-pointer text-slate-700">Source wording</summary>
              <blockquote className="mt-1 border-l-4 border-slate-300 pl-3 text-slate-800">
                “{alert.evidence.quote}”
              </blockquote>
              <p className="mt-1 text-xs text-slate-500">
                {alert.evidence.document}
                {alert.evidence.section ? ` · section: ${alert.evidence.section.replace(/_/g, " ")}` : ""} ·
                retrieved {alert.evidence.checked_on}
              </p>
            </details>
          ) : (
            alert.curated && <span className="text-slate-600"> (source wording not auto-confirmed)</span>
          )}
        </div>
      )}
    </li>
  );
}

export function AlertsPanel({ recon, busy }: { recon: ReconcileResponse | null; busy: boolean }) {
  const alerts = recon?.alerts ?? [];
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="text-xl font-bold">
        Alerts{alerts.length > 0 ? ` (${alerts.length})` : ""}
      </h2>
      {!recon ? (
        <p className="mt-2 text-slate-600">{busy ? "Checking…" : "Nothing to check yet."}</p>
      ) : (
        <>
          {alerts.length === 0 ? (
            <p className="mt-2 text-slate-700">No curated rule matched the identified ingredients.</p>
          ) : (
            <ul className="mt-3 flex flex-col gap-3">
              {alerts.map((alert) => (
                <AlertCard key={alert.id} alert={alert} />
              ))}
            </ul>
          )}
          <p className="mt-3 text-sm text-slate-600">
            Checked against {recon.rules_checked} curated rules ({recon.rules_verified} reviewed by a
            pharmacist so far) plus same-ingredient matching. This is not a complete interaction
            screen; absence of an alert is not evidence of safety.
          </p>
        </>
      )}
    </section>
  );
}
