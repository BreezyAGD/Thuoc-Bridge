"use client";

import type { Alert, Severity } from "@/lib/alerts";
import type { ReconcileResponse } from "@/lib/reconcile";

const SEVERITY: Record<Severity, { label: string; badge: string; edge: string }> = {
  high: { label: "High", badge: "bg-[var(--alert)] text-[var(--ink)]", edge: "border-l-[var(--alert)]" },
  moderate: { label: "Moderate", badge: "bg-[var(--saffron)] text-[var(--ink)]", edge: "border-l-[var(--saffron)]" },
  low: { label: "Low", badge: "bg-[var(--clay)] text-[var(--ink)]", edge: "border-l-[var(--clay)]" },
  info: { label: "Info", badge: "bg-[var(--line)] text-[var(--ink)]", edge: "border-l-[var(--line)]" },
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
        <span className="font-medium text-[var(--ink-2)]">{KIND_LABEL[alert.kind]}</span>
        {alert.curated ? (
          alert.verified_by ? (
            <span className="rounded-full border border-[var(--ok)]/50 px-2 py-0.5 text-[var(--ok)]">Reviewed by {alert.verified_by}</span>
          ) : (
            <span className="rounded-full border border-[var(--saffron)]/50 px-2 py-0.5 text-[var(--warn)]">Rule pending pharmacist review</span>
          )
        ) : (
          alert.kind === "duplicate_ingredient" && (
            <span className="rounded-full border border-[var(--line)] px-2 py-0.5 text-[var(--ink-2)]">Automatic: same RxNorm ingredient</span>
          )
        )}
        <span className="rounded-full border border-[var(--line)] px-2 py-0.5 text-[var(--terra-2)]">Rule engine, not AI</span>
      </div>
      <h3 className="mt-2 font-serif text-lg font-bold text-[var(--ink)]">{alert.title}</h3>

      {alert.involved.length > 0 && (
        <ul className="mt-2 flex flex-col gap-1.5 text-sm">
          {alert.involved.map((item) => (
            <li key={`${item.source_id}:${item.rxcui}`} className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="rounded bg-[var(--hover)] px-1.5 text-xs text-[var(--ink-2)]">
                {item.source_kind === "photo" ? "Scanned label" : "US medicine"}
              </span>
              <span className="font-semibold text-[var(--ink)]">{item.source_label}</span>
              <span className="text-[var(--ink-2)]">
                {item.printed_name && item.printed_name.toLowerCase() !== item.ingredient.toLowerCase() && `${item.printed_name} → `}
                <span className="text-[var(--ink)]">{item.ingredient}</span>
                {item.strength && ` ${item.strength} per unit`}
              </span>
              {item.source_kind === "photo" && (
                <button
                  type="button"
                  onClick={() => onShow(item.source_id, item.printed_name)}
                  className="min-h-8 rounded-md px-2 text-xs font-semibold text-[var(--terra)] underline hover:bg-[var(--hover)]"
                >
                  Show on label
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      {alert.unresolved.length > 0 && (
        <ul className="mt-2 flex flex-col gap-1 text-sm text-[var(--ink)]">
          {alert.unresolved.map((u, i) => (
            <li key={i}>
              <span className="font-semibold text-[var(--ink)]">{u.source_label}</span>: {u.detail}
            </li>
          ))}
        </ul>
      )}

      <p className="mt-2 text-sm text-[var(--ink)]">{alert.rationale}</p>
      {alert.low_confidence && (
        <p className="mt-1 text-sm font-medium text-[var(--warn)]">
          Based on a low-confidence ingredient match. Check the ingredient against the box first.
        </p>
      )}

      <details className="mt-2 text-sm">
        <summary className="min-h-8 cursor-pointer py-1 text-[var(--ink-2)]">Evidence and mechanism</summary>
        <div className="mt-1 flex flex-col gap-2 text-[var(--ink-2)]">
          {alert.mechanism && (
            <p>
              <span className="font-semibold text-[var(--ink)]">Mechanism:</span> {alert.mechanism}
            </p>
          )}
          {alert.source && (
            <p>
              <span className="font-semibold text-[var(--ink)]">Source:</span>{" "}
              <a href={alert.evidence?.link ?? alert.source.url} target="_blank" rel="noreferrer" className="text-[var(--terra)] underline">
                {alert.source.label}
              </a>
            </p>
          )}
          {alert.evidence ? (
            <>
              <blockquote className="border-l-2 border-[var(--muted)] pl-3 text-[var(--ink)]">“{alert.evidence.quote}”</blockquote>
              <p className="text-xs text-[var(--muted)]">
                {alert.evidence.document}
                {alert.evidence.section ? ` · section: ${alert.evidence.section.replace(/_/g, " ")}` : ""} · retrieved{" "}
                {alert.evidence.checked_on}
              </p>
            </>
          ) : (
            alert.curated && <p className="text-xs text-[var(--muted)]">Source wording not auto-confirmed.</p>
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
  // Most severe first, so a nurse in a hurry reads the high findings before anything else.
  const rank: Record<Severity, number> = { high: 0, moderate: 1, low: 2, info: 3 };
  const alerts = [...(recon?.alerts ?? [])].sort((x, y) => rank[x.severity] - rank[y.severity]);
  return (
    <section aria-labelledby="findings-heading" className="rounded-[20px] border border-[var(--line)] bg-[var(--panel)] p-4 sm:p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 id="findings-heading" className="scroll-mt-20 font-serif text-xl font-bold text-[var(--ink)]">
          Findings{alerts.length > 0 ? ` (${alerts.length})` : ""}
        </h3>
        {recon && (
          <p className="text-xs text-[var(--muted)]">
            {recon.rules_checked} curated rules · {recon.rules_verified} pharmacist-reviewed · plus same-ingredient matching
          </p>
        )}
      </div>
      {!recon ? (
        <p className="mt-2 text-sm text-[var(--ink-2)]" role="status">
          {busy ? "Checking for duplicates and interactions…" : "Scan a label or add a US medicine to start."}
        </p>
      ) : alerts.length === 0 ? (
        <p className="mt-2 text-sm text-[var(--ink)]">No curated rule matched the identified ingredients.</p>
      ) : (
        <ul className="mt-3 grid gap-3 xl:grid-cols-2">
          {alerts.map((a) => (
            <AlertCard key={a.id} alert={a} onShow={onShow} />
          ))}
        </ul>
      )}
      {recon && (
        <p className="mt-3 text-xs text-[var(--muted)]">
          This is not a complete interaction screen. No alert does not mean the combination is safe.
        </p>
      )}
    </section>
  );
}
