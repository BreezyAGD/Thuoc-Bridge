"use client";

import Link from "next/link";
import { dict } from "@/lib/i18n";
import type { IngredientRow } from "@/lib/reconcile";
import { useVisit } from "@/lib/visit-store";

/**
 * Printable take-home sheet in Vietnamese. Shows only guard-checked names and
 * strengths, the US generic name when the match is solid, and the fixed,
 * pre-written patient messages from data/interactions.json. No severity, no
 * dosing advice, never an instruction to stop a medicine.
 * NEEDS REVIEW: Vietnamese wording has not had a fluent-speaker check.
 */
const t = dict.vi;

function usNameFor(ing: IngredientRow): string | null {
  if (ing.confidence !== "high" && ing.confidence !== "medium") return null;
  if (ing.resolution.concepts.length !== 1) return null;
  const name = ing.resolution.concepts[0].name;
  return ing.printed_name.toLowerCase().includes(name.toLowerCase()) ? null : name;
}

function strength(ing: IngredientRow) {
  if (ing.strength === null) return null;
  const n = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 4 }).format(ing.strength);
  return ing.unit ? `${n} ${ing.unit}` : n;
}

export default function HandoutPage() {
  const visit = useVisit();
  const recon = visit.recon;
  const busy = visit.reconState === "loading" || visit.products.some((p) => p.state === "reading");
  const ready = !!recon && !busy && visit.reconState !== "error";

  const seen = new Set<string>();
  const messages = (recon?.alerts ?? [])
    .filter((a) => a.kind !== "unresolved" && a.involved.length > 0)
    .flatMap((a) => {
      const who = [...new Set(a.involved.map((i) => i.source_label))];
      const key = `${[...who].sort().join("|")}::${a.patient.vi}`;
      if (seen.has(key)) return [];
      seen.add(key);
      return [{ id: a.id, who: who.join(" + "), text: a.patient.vi }];
    });

  return (
    <main className="summary mx-auto w-full max-w-3xl p-4 sm:p-8">
      <nav lang="en" className="mb-5 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href="/" className="min-h-11 py-2 text-[var(--terra)] underline">Back to workspace</Link>
        <button
          type="button"
          disabled={!ready}
          onClick={() => window.print()}
          className="min-h-11 rounded-lg bg-[var(--terra)] px-4 font-semibold text-white disabled:bg-slate-400"
        >
          Print patient handout
        </button>
      </nav>
      <p lang="en" className="mb-4 rounded border border-amber-400 bg-amber-50 p-2 text-sm text-amber-950 print:hidden">
        For the clinician: Vietnamese take-home sheet. It shows only label-verified names and fixed, pre-written
        messages. The wording still needs a fluent-speaker review.
        {visit.demoMode && " Demo visit: sample data."}
      </p>

      <article lang="vi">
        <h1 className="text-2xl font-bold">{t.handoutTitle}</h1>
        <p className="mt-2">{t.handoutIntro}</p>

        {!ready ? (
          <p className="mt-4" role="status">{busy ? t.checking : t.handoutEmpty}</p>
        ) : (
          <>
            {recon.products.length === 0 && recon.usMeds.length === 0 && <p className="mt-4">{t.handoutEmpty}</p>}
            <ol className="mt-4 flex flex-col gap-3">
              {recon.products.map((p) => {
                const checked = p.ingredients.filter((i) => i.name_verified);
                return (
                  <li key={p.id} className="rounded-lg border border-slate-300 p-3 break-inside-avoid">
                    <p className="text-lg font-bold">{p.brand ?? t.unknownName}</p>
                    {checked.length === 0 ? (
                      <p className="mt-1 font-semibold">
                        {t.unverified}. {t.unverifiedHelp}
                      </p>
                    ) : (
                      <>
                        <p className="mt-1">{t.contains}</p>
                        <ul className="mt-1 list-disc pl-5">
                          {checked.map((ing, i) => {
                            const us = usNameFor(ing);
                            const s = strength(ing);
                            return (
                              <li key={i}>
                                <strong>{ing.printed_name}</strong>
                                {s && ` · ${s}`}
                                {us && (
                                  <span>
                                    {" "}({t.usName} <strong lang="en">{us}</strong>)
                                  </span>
                                )}
                              </li>
                            );
                          })}
                        </ul>
                      </>
                    )}
                  </li>
                );
              })}
            </ol>

            {recon.usMeds.length > 0 && (
              <section className="mt-4">
                <h2 className="text-lg font-bold">{t.handoutUsMeds}</h2>
                <ul className="mt-1 list-disc pl-5">
                  {recon.usMeds.map((m) => (
                    <li key={m.id} lang="en">{m.text}</li>
                  ))}
                </ul>
              </section>
            )}

            {messages.length > 0 && (
              <section className="mt-4 rounded-lg border-2 border-slate-800 p-3 break-inside-avoid">
                <h2 className="text-lg font-bold">{t.talkTitle}</h2>
                <ul className="mt-2 flex flex-col gap-2">
                  {messages.map((m) => (
                    <li key={m.id}>
                      <p className="font-semibold">{m.who}</p>
                      <p>{m.text}</p>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </>
        )}

        <p className="mt-4 font-semibold">{t.handoutBring}</p>
        <p className="mt-1 text-sm">{t.disclaimer}</p>
        <p className="mt-6 text-sm">
          {t.handoutReviewed} ____________________ {t.handoutDate} __________
        </p>
      </article>
    </main>
  );
}
