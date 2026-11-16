"use client";

import type { Alert, Severity } from "@/lib/alerts";
import type { ReconcileResponse } from "@/lib/reconcile";

const SEVERITY: Record<Severity, { label: string; badge: string; edge: string }> = {
  high: { label: "High", badge: "bg-red-500 text-white", edge: "border-l-red-500" },
  moderate: { label: "Moderate", badge: "bg-orange-400 text-orange-950", edge: "border-l-orange-400" },
  low: { label: "Low", badge: "bg-yellow-300 text-yellow-950", edge: "border-l-yellow-300" },
  info: { label: "Info", badge: "bg-slate-400 text-slate-950", edge: "border-l-slate-400" },
};

const KIND_LABEL: Record<Alert["kind"], string> = {
  duplicate_ingredient: "Duplicate ingredient",
  duplicate_class: "Same-class duplication",
  interaction: "Interaction",
  flag: "Flag",
  unresolved: "Not identified",
};

function AlertCard({ alert, onShow }: { alert: Alert; onShow: (productId: string, printedName: string | null) => void }) {
  const s = SEVERITY[alert.severity];
  return (
    <li className={`rounded-xl border border-l-4 border-[var(--line)] ${s.edge} bg-[var(--panel-2)] p-4`}>
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className={`rounded-full px-2.5 py-0.5 font-bold ${s.badge}`}>{s.label}</span>
        <span className="font-medium text-slate-300">{KIND_LABEL[alert.kind]}</span>
        {alert.curated ? (
          alert.verified_by ? (
            <span className="rounded-full border border-emerald-400/50 px-2 py-0.5 text-emerald-300">Reviewed by {alert.verified_by}</span>
          ) : (
            <span className="rounded-full border border-amber-400/50 px-2 py-0.5 text-amber-200">Rule pending pharmacist review</span>
          )
        ) : (
          alert.kind === "duplicate_ingredient" && (
            <span className="rounded-full border border-slate-400/50 px-2 py-0.5 text-slate-300">Automatic: same RxNorm ingredient</span>
          )
        )}
        <span className="rounded-full border border-teal-400/40 px-2 py-0.5 text-teal-200">Rule engine, not AI</span>
      </div>
      <h3 className="mt-2 text-base font-bold text-white">{alert.title}</h3>

      {alert.involved.length > 0 && (
        <ul className="mt-2 flex flex-col gap-1.5 text-sm">
          {alert.involved.map((item) => (
            <li key={`${item.source_id}:${item.rxcui}`} className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="rounded bg-white/10 px-1.5 text-xs text-slate-300">
                {item.source_kind === "photo" ? "Scanned label" : "US medicine"}
              </span>
              <span className="font-semibold text-white">{item.source_label}</span>
              <span className="text-slate-300">
                {item.printed_name && item.printed_name.toLowerCase() !== item.ingredient.toLowerCase() && `${item.printed_name} → `}
                <span className="text-slate-100">{item.ingredient}</span>
                {item.strength && ` ${item.strength} per unit`}
              </span>
              {item.source_kind === "photo" && (
                <button
                  type="button"
                  onClick={() => onShow(item.source_id, item.printed_name)}
                  className="min-h-8 rounded-md px-2 text-xs font-semibold text-sky-300 underline hover:bg-white/10"
                >
                  Show on label
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      {alert.unresolved.length > 0 && (
        <ul className="mt-2 flex flex-col gap-1 text-sm text-slate-200">
          {alert.unresolved.map((u, i) => (
            <li key={i}>
              <span className="font-semibold text-white">{u.source_label}</span>: {u.detail}
            </li>
          ))}
        </ul>
      )}

      <p className="mt-2 text-sm text-slate-200">{alert.rationale}</p>
      {alert.low_confidence && (
        <p className="mt-1 text-sm font-medium text-orange-300">
          Based on a low-confidence ingredient match. Check the ingredient against the box first.
        </p>
      )}

      <details className="mt-2 text-sm">
        <summary className="min-h-8 cursor-pointer py-1 text-slate-300">Evidence and mechanism</summary>
        <div className="mt-1 flex flex-col gap-2 text-slate-300">
          {alert.mechanism && (
            <p>
              <span className="font-semibold text-slate-100">Mechanism:</span> {alert.mechanism}
            </p>
          )}
          {alert.source && (
            <p>
              <span className="font-semibold text-slate-100">Source:</span>{" "}
              <a href={alert.evidence?.link ?? alert.source.url} target="_blank" rel="noreferrer" className="text-sky-300 underline">
                {alert.source.label}
              </a>
            </p>
          )}
          {alert.evidence ? (
            <>
              <blockquote className="border-l-2 border-slate-500 pl-3 text-slate-200">“{alert.evidence.quote}”</blockquote>
              <p className="text-xs text-slate-400">
                {alert.evidence.document}
                {alert.evidence.section ? ` · section: ${alert.evidence.section.replace(/_/g, " ")}` : ""} · retrieved{" "}
                {alert.evidence.checked_on}
              </p>
            </>
          ) : (
            alert.curated && <p className="text-xs text-slate-400">Source wording not auto-confirmed.</p>
          )}
        </div>
      </details>
    </li>
  );
}

export function Findings({
  recon,
  busy,
  onShow,
}: {
  recon: ReconcileResponse | null;
  busy: boolean;
  onShow: (productId: string, printedName: string | null) => void;
}) {
  const alerts = recon?.alerts ?? [];
  return (
    <section aria-labelledby="findings-heading" className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-4 sm:p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="findings-heading" className="text-lg font-bold text-white">
          Findings{alerts.length > 0 ? ` (${alerts.length})` : ""}
        </h2>
        {recon && (
          <p className="text-xs text-slate-400">
            {recon.rules_checked} curated rules · {recon.rules_verified} pharmacist-reviewed · plus same-ingredient matching
          </p>
        )}
      </div>
      {!recon ? (
        <p className="mt-2 text-sm text-slate-300" role="status">
          {busy ? "Checking for duplicates and interactions…" : "Scan a label or add a US medicine to start."}
        </p>
      ) : alerts.length === 0 ? (
        <p className="mt-2 text-sm text-slate-200">No curated rule matched the identified ingredients.</p>
      ) : (
        <ul className="mt-3 grid gap-3 xl:grid-cols-2">
          {alerts.map((a) => (
            <AlertCard key={a.id} alert={a} onShow={onShow} />
          ))}
        </ul>
      )}
      {recon && (
        <p className="mt-3 text-xs text-slate-400">
          This is not a complete interaction screen. No alert does not mean the combination is safe.
        </p>
      )}
    </section>
  );
}
