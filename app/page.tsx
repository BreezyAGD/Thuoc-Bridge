"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { AppHeader } from "./components/AppHeader";
import { giveConsent, useConsentRevision, useLang } from "@/lib/client-store";

/** Consent / disclaimer screen. Vietnamese first. */
function ConsentForm() {
  const { t } = useLang();
  const router = useRouter();
  const [agreed, setAgreed] = useState(false);

  return (
    <>
      <AppHeader />
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-6">
        <p className="text-lg text-slate-700">{t.tagline}</p>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h1 className="text-2xl font-bold">{t.consentTitle}</h1>
          <ul className="mt-4 flex flex-col gap-3 text-lg">
            {t.consentPoints.map((point) => (
              <li key={point} className="flex gap-3">
                <span aria-hidden className="mt-2.5 size-2.5 shrink-0 rounded-full bg-teal-600" />
                <span>{point}</span>
              </li>
            ))}
          </ul>

          <label className="mt-6 flex min-h-14 cursor-pointer items-center gap-4 rounded-xl border-2 border-slate-300 px-4 py-3 text-lg font-medium has-checked:border-teal-600 has-checked:bg-teal-50">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="size-7 shrink-0 accent-teal-700"
            />
            {t.consentAgree}
          </label>
        </section>

        <button
          type="button"
          disabled={!agreed}
          onClick={() => {
            giveConsent();
            router.push("/patient");
          }}
          className="min-h-16 rounded-2xl bg-teal-700 px-6 text-xl font-bold text-white shadow-sm active:bg-teal-800 disabled:bg-slate-300 disabled:text-slate-500"
        >
          {t.start}
        </button>
        {!agreed && <p className="text-center text-base text-slate-600">{t.needConsent}</p>}
      </main>
    </>
  );
}

export default function Home() {
  const revision = useConsentRevision();
  return <ConsentForm key={revision} />;
}
