"use client";

import { useId, useRef } from "react";
import { useRouter } from "next/navigation";
import { clearConsent } from "@/lib/client-store";
import { dict } from "@/lib/i18n";
import { resetVisit, useVisit } from "@/lib/visit-store";

/** Clinician-facing, so always English; it never changes the page language. */
export function NewVisit() {
  const t = dict.en;
  const visit = useVisit();
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const helpId = useId();
  const router = useRouter();
  if (!visit.demoMode && !visit.products.length && !visit.usMeds.length) return null;
  return <>
    <button type="button" onClick={() => dialog.current?.showModal()} className="mt-2 min-h-11 rounded-lg border border-current px-3 py-2 font-semibold">{t.newVisit}</button>
    <dialog ref={dialog} aria-labelledby={titleId} aria-describedby={helpId} className="fixed inset-0 m-auto w-[calc(100%-2rem)] max-w-lg rounded-2xl border border-slate-300 bg-white p-5 text-slate-900 shadow-xl backdrop:bg-slate-900/60">
      <h2 id={titleId} className="text-xl font-bold">{t.newVisitTitle}</h2>
      <p id={helpId} className="mt-3 text-base">{t.newVisitHelp}</p>
      <div className="mt-5 flex flex-wrap justify-end gap-3">
        <button type="button" autoFocus onClick={() => dialog.current?.close()} className="min-h-11 rounded-lg border border-slate-400 px-4 py-2 font-semibold">{t.cancel}</button>
        <button type="button" onClick={() => {
          dialog.current?.close();
          resetVisit();
          clearConsent();
          router.replace("/");
        }} className="min-h-11 rounded-lg bg-teal-700 px-4 py-2 font-semibold text-white">{t.clearVisit}</button>
      </div>
    </dialog>
  </>;
}
