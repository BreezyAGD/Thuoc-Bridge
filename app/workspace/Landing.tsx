"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { CURATED_RULE_COUNT } from "@/lib/alerts";
import { demoScenarios } from "@/lib/cache";
import { clearConsent, giveConsent, useConsent } from "@/lib/client-store";
import type { UsMedRow } from "@/lib/reconcile";
import { addPhotos, addUsMed, loadDemo, removeUsMed, useVisit, type Visit } from "@/lib/visit-store";
import { ConfidenceChip } from "./DetailPanel";
import { Workspace } from "./Workspace";

/** Featured demo samples shown as one-tap chips; the rest stay in the menu. */
const FEATURED: { id: string; label: string }[] = [
  { id: "real-panadol-blister", label: "Panadol blister (real photo)" },
  { id: "3-cold-medicine-bp", label: "Cold tablet + amlodipine" },
  { id: "2-ginkgo-warfarin", label: "Ginkgo + warfarin" },
  { id: "5-herbal-no-ingredient-list", label: "Herbal, no ingredient list" },
];

const RETURNING_KEY = "tb.returning";

function markReturning() {
  try {
    window.localStorage.setItem(RETURNING_KEY, "1");
  } catch {
    // Storage blocked: the intro simply shows every time.
  }
}

function scrollToId(id: string) {
  // Wait one frame so a section that just appeared is in the DOM.
  window.setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" }), 60);
}

function Logo() {
  return (
    <span className="flex items-center gap-2.5 font-serif text-[22px] font-bold tracking-tight">
      <span aria-hidden className="h-[17px] w-8 -rotate-[30deg] rounded-full bg-[linear-gradient(90deg,var(--terra)_50%,var(--saffron)_50%)]" />
      Thuốc <em className="font-medium text-[var(--terra)]">Bridge</em>
    </span>
  );
}

const btn = "inline-flex min-h-12 items-center justify-center gap-2 rounded-[14px] px-6 text-base font-semibold transition active:translate-y-px";
const btnPrimary = `${btn} rounded-bl-[4px] bg-[var(--terra)] font-serif text-[17px] font-bold text-white hover:bg-[var(--terra-2)] disabled:bg-[var(--line)] disabled:text-[var(--muted)]`;
const btnLine = `${btn} border-[1.5px] border-[var(--ink)] text-[var(--ink)] hover:bg-[var(--hover)] disabled:border-[var(--line)] disabled:text-[var(--muted)]`;

function Header() {
  return (
    <header className="sticky top-0 z-20 border-b border-[var(--line)]/70 bg-[var(--paper)]/92 backdrop-blur">
      <div className="mx-auto flex h-[72px] w-full max-w-[1200px] items-center justify-between gap-4 px-5">
        <Link href="/" aria-label="Thuốc Bridge home"><Logo /></Link>
        <nav aria-label="Sections" className="caps hidden gap-10 text-[var(--ink-2)] md:flex">
          <a href="#how" className="py-2 hover:text-[var(--terra)]">How it works</a>
          <a href="#scan" className="py-2 hover:text-[var(--terra)]">Scan</a>
          <a href="#samples" className="py-2 hover:text-[var(--terra)]">Samples</a>
        </nav>
        <a href="#scan" className="caps rounded-full border-[1.5px] border-[var(--terra)] px-5 py-3 whitespace-nowrap text-[var(--terra)] hover:bg-[var(--terra)] hover:text-white">
          <span className="hidden sm:inline">Scan a label</span><span className="sm:hidden">Scan</span>
        </a>
      </div>
    </header>
  );
}

function Hero({ onSample }: { onSample: () => void }) {
  return (
    <section aria-labelledby="hero-heading" className="relative overflow-hidden pt-8 pb-20 md:pt-12 md:pb-24">
      <div className="mx-auto grid w-full max-w-[1200px] grid-cols-1 items-center gap-10 px-5 lg:grid-cols-[1.05fr_1fr_140px]">
        <div>
          <p className="caps text-[var(--terra)]">For nurses &amp; pharmacists</p>
          <h1 id="hero-heading" className="display mt-4 text-[44px] leading-[1.03] sm:text-[60px] lg:text-[66px]">
            Medicines from home, <em>made clear</em> in two minutes
          </h1>
          <p className="mt-6 max-w-[34ch] text-lg text-[var(--ink-2)] sm:text-[19px]">
            Photograph a Vietnamese label. We read the printed ingredients, match them to US drug names, and flag
            duplicates with your patient&apos;s current medicines.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a href="#scan" className={`${btnPrimary} flex-1 sm:flex-none`}>Scan a label</a>
            <button type="button" onClick={onSample} className={`${btnLine} flex-1 sm:flex-none`}>Try a sample</button>
          </div>
        </div>

        <div className="relative mx-auto grid w-full max-w-[460px] gap-3 lg:block lg:h-[580px] lg:max-w-none">
          <span aria-hidden className="absolute -top-2 right-0 h-[32%] w-[56%] rounded-[46%_54%_38%_62%/52%_38%_62%_48%] bg-[var(--saffron)] lg:-right-[6%] lg:h-[46%] lg:w-[58%]" />
          <span aria-hidden className="absolute top-[3%] -left-[4%] size-32 rounded-full bg-[var(--clay)] lg:size-36" />
          <span aria-hidden className="absolute -top-[1%] -left-[8%] size-32 rounded-full border-[1.5px] border-[#e4877a] lg:size-36" />
          <div className="relative mx-auto h-[420px] w-[78%] overflow-hidden rounded-full bg-[#e9e1d6] shadow-[0_40px_60px_-45px_rgba(43,26,20,.6)] lg:absolute lg:top-0 lg:left-[8%] lg:h-full lg:w-[76%]">
            {/* eslint-disable-next-line @next/next/no-img-element -- bundled sample photo */}
            <img src="/demo-assets/real-panadol-blister-0.jpg" alt="Example: a Panadol blister bought in Vietnam" className="h-full w-full object-cover" />
            <span aria-hidden className="absolute top-[30.4%] left-[57.6%] h-[2.6%] w-[27.2%] rounded-[3px] border-[2.5px] border-[var(--ok)] bg-[var(--saffron)]/30" />
          </div>
          <div className="relative rounded-2xl bg-[var(--card)] p-4 text-sm shadow-[0_24px_40px_-26px_rgba(43,26,20,.55)] lg:absolute lg:top-[56%] lg:-left-[4%] lg:w-[250px]">
            <p className="caps text-[10px] text-[var(--muted)]">Example · read from the label</p>
            <p className="mt-1.5 font-serif text-lg font-bold">PARACETAMOL <span className="text-[var(--terra)]">→ acetaminophen</span></p>
            <span className="mt-2 inline-flex rounded-full bg-[var(--ok-bg)] px-2.5 py-0.5 text-xs font-semibold text-[var(--ok)]">✓ Found on label · RxCUI 161</span>
          </div>
          <div className="relative rounded-2xl border-l-4 border-[var(--alert)] bg-[var(--card)] p-4 text-sm shadow-[0_24px_40px_-26px_rgba(43,26,20,.55)] lg:absolute lg:-right-[4%] lg:bottom-[2%] lg:w-[248px]">
            <p className="text-[11px] font-bold tracking-[0.1em] text-[var(--alert)] uppercase">● High · duplicate</p>
            <p className="mt-1 font-semibold">Acetaminophen in two products</p>
            <p className="text-[var(--ink-2)]">Panadol + Norco</p>
          </div>
        </div>

        <dl className="grid grid-cols-3 gap-4 lg:grid-cols-1 lg:gap-12">
          {[
            [String(CURATED_RULE_COUNT), "Cited safety rules"],
            ["~2 min", "Per medicine"],
            ["0", "Photos stored"],
          ].map(([value, label]) => (
            <div key={label} className="flex flex-col-reverse">
              <dt className="caps mt-2 max-w-[11ch] text-[10px] leading-relaxed text-[var(--ink-2)] sm:text-[11px]">{label}</dt>
              <dd className="font-serif text-[28px] leading-none font-extrabold tracking-tight sm:text-[38px]">{value}</dd>
            </div>
          ))}
        </dl>
      </div>
      <svg aria-hidden className="absolute bottom-6 left-0 hidden h-[70px] w-[46%] lg:block" viewBox="0 0 600 70" preserveAspectRatio="none">
        <path d="M0 40 H220 L240 40 L255 12 L272 62 L288 26 L300 40 H600" fill="none" stroke="var(--saffron)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </section>
  );
}

const STEPS = [
  { title: "Photograph the label", body: "The side with “Thành phần” or a strength like “500 mg”.", time: "About 20 s" },
  { title: "Check what was read", body: "Tap any highlighted box to see the printed text and every check it passed.", time: "About 30 s" },
  { title: "Add US medicines", body: "From the chart or the patient's bottles, each matched to RxNorm.", time: "About 30 s" },
  { title: "Review & print", body: "Cited findings, an English summary for the chart, a Vietnamese sheet for the patient.", time: "About 40 s" },
];

function HowItWorks() {
  return (
    <section id="how" aria-labelledby="how-heading" className="scroll-mt-16 border-y border-[var(--line)] bg-[var(--card)] py-16 md:py-24">
      <div className="mx-auto w-full max-w-[1200px] px-5">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="caps text-[var(--terra)]">How it works</p>
            <h2 id="how-heading" className="display mt-3 text-[36px] leading-[1.05] sm:text-[50px]">Four steps, <em>one photo</em> each</h2>
          </div>
          <p className="max-w-[40ch] text-[var(--ink-2)]">Foreign labels are where medication histories go wrong. Scan them at intake, before anyone has to guess.</p>
        </div>
        <ol className="mt-12 grid grid-cols-1 border-t-[1.5px] border-[var(--ink)] md:grid-cols-4">
          {STEPS.map((s, i) => (
            <li key={s.title} className="border-b border-[var(--line)] py-6 md:border-b-0 md:py-7 md:pr-6 md:[&+li]:border-l md:[&+li]:pl-6">
              <span aria-hidden className="font-serif text-[52px] leading-none font-medium text-[var(--terra)] italic">0{i + 1}</span>
              <h3 className="mt-4 font-serif text-[22px] leading-tight font-bold">{s.title}</h3>
              <p className="mt-2 text-[15px] text-[var(--ink-2)]">{s.body}</p>
              <p className="caps mt-4 text-[11px] text-[var(--muted)]">{s.time}</p>
            </li>
          ))}
        </ol>
        <p className="mt-10 flex max-w-[900px] gap-4 text-[15px] text-[var(--ink-2)]">
          <span aria-hidden className="grid size-[26px] flex-none place-items-center rounded-full bg-[var(--saffron)] font-serif font-bold italic text-[var(--ink)]">i</span>
          <span>
            <b className="text-[var(--ink)]">Before you rely on it:</b> the AI only copies printed text. Matching and alerts use cited rules
            still pending pharmacist review. Anything unclear is marked Unverified, so check the box or ask the pharmacist.
          </span>
        </p>
      </div>
    </section>
  );
}

function UsMeds({ visit }: { visit: Visit }) {
  const [text, setText] = useState("");
  const rows = visit.recon?.usMeds ?? [];
  return (
    <div className="rounded-[20px] border border-[var(--line)] bg-[var(--card)] p-5">
      <h3 id="usmeds-heading" className="font-serif text-[19px] font-bold">Current US medicines</h3>
      <form
        className="mt-3 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          addUsMed(text);
          setText("");
        }}
      >
        <input
          id="usmeds-input"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="e.g. warfarin, Norco, Eliquis"
          aria-label="Add a US medicine"
          maxLength={120}
          autoComplete="off"
          className="min-h-12 min-w-0 flex-1 rounded-xl border-[1.5px] border-[var(--line)] bg-white px-3.5 placeholder:text-[#a8948a] focus:border-[var(--terra)] focus:outline-none"
        />
        <button type="submit" disabled={!text.trim()} className={`${btnPrimary} px-5`}>Add</button>
      </form>
      {visit.usMeds.length === 0 ? (
        <p className="mt-3 text-sm text-[var(--muted)]">None entered yet. The medication history may be incomplete.</p>
      ) : (
        <ul className="mt-3 flex flex-col gap-2">
          {visit.usMeds.map((m) => {
            const row: UsMedRow | undefined = rows.find((r) => r.id === m.id);
            return (
              <li key={m.id} className="flex items-start justify-between gap-3 rounded-xl border border-[var(--line)] bg-[var(--paper)] p-3">
                <div className="min-w-0 text-sm">
                  <p className="font-semibold break-words">{m.text}</p>
                  {!row ? (
                    <p className="text-[var(--muted)]">Matching…</p>
                  ) : row.confidence === "unverified" ? (
                    <p className="text-[var(--warn)]">Unverified: confirm the name with the patient or the bottle</p>
                  ) : (
                    <p className="text-[var(--ink-2)]">
                      {row.resolution.concepts.map((c) => c.name).join(" + ")}{" "}
                      <span className="font-mono text-xs text-[var(--muted)]">{row.resolution.concepts.map((c) => c.rxcui).join(", ")}</span>
                    </p>
                  )}
                  {row && <div className="mt-1"><ConfidenceChip level={row.confidence} /></div>}
                </div>
                <button type="button" onClick={() => removeUsMed(m.id)} className="min-h-9 shrink-0 rounded-md px-2 text-xs text-[var(--muted)] underline hover:text-[var(--ink)]">
                  Remove
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function ScanSection({ visit, onPhotos, onSample }: { visit: Visit; onPhotos: (files: FileList | null) => void; onSample: (id: string) => void }) {
  const consented = useConsent();
  const camera = useRef<HTMLInputElement>(null);
  const library = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);

  return (
    <section id="scan" aria-labelledby="scan-heading" className="scroll-mt-16 py-16 md:py-24">
      <div className="mx-auto w-full max-w-[1200px] px-5">
        <p className="caps text-[var(--terra)]">Scan</p>
        <h2 id="scan-heading" className="display mt-3 text-[36px] leading-[1.05] sm:text-[50px]">Scan a <em>medicine label</em></h2>
        <div className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-[1.35fr_1fr]">
          <div
            onDragOver={(e) => {
              if (!consented) return;
              e.preventDefault();
              setOver(true);
            }}
            onDragLeave={() => setOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setOver(false);
              if (consented) onPhotos(e.dataTransfer.files);
            }}
            className={`relative grid min-h-[320px] place-items-center overflow-hidden rounded-[28px] border-2 border-dashed p-8 text-center transition lg:min-h-[430px] ${over ? "border-[var(--terra)] bg-[var(--hover)]" : "border-[#d9a98e] bg-[var(--card)]"}`}
          >
            <span aria-hidden className="absolute -top-16 -right-16 size-52 rounded-full bg-[var(--clay)]/45" />
            <div className="relative">
              <span aria-hidden className="mx-auto mb-5 grid size-20 place-items-center rounded-full bg-[var(--saffron)]">
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 8h3l2-3h6l2 3h3v11H4z" /><circle cx="12" cy="13" r="3.5" /></svg>
              </span>
              <h3 className="font-serif text-[28px] font-bold sm:text-[32px]">Drop label photos here</h3>
              <p className="mx-auto mt-2 mb-6 max-w-[38ch] text-[var(--ink-2)]">
                {consented
                  ? "Or take one with this device. Several products at once is fine: each photo is read in parallel."
                  : "First tick the consent box, then take or choose photos."}
              </p>
              <div className="flex flex-wrap justify-center gap-3">
                <button type="button" disabled={!consented} onClick={() => camera.current?.click()} className={btnPrimary}>Take photo</button>
                <button type="button" disabled={!consented} onClick={() => library.current?.click()} className={btnLine}>Choose files</button>
              </div>
              <input ref={camera} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => { onPhotos(e.target.files); e.target.value = ""; }} />
              <input ref={library} type="file" accept="image/*" multiple className="hidden" onChange={(e) => { onPhotos(e.target.files); e.target.value = ""; }} />
            </div>
          </div>

          <div className="grid content-start gap-4">
            <div className="rounded-[20px] border border-[var(--line)] bg-[var(--card)] p-5">
              <h3 className="font-serif text-[19px] font-bold">Before the first photo</h3>
              <label className="mt-3 flex cursor-pointer gap-3 text-[15px]">
                <input
                  type="checkbox"
                  checked={consented}
                  onChange={(e) => (e.target.checked ? giveConsent() : clearConsent())}
                  className="mt-0.5 size-6 flex-none accent-[var(--terra)]"
                />
                <span>The patient agreed to the packaging being photographed, and no names or pharmacy labels are in the frame.</span>
              </label>
              <p className="mt-2.5 text-[13px] text-[var(--muted)]">Photos go to Anthropic&apos;s AI to read the text and are not stored on our server. Samples are never sent.</p>
            </div>
            <UsMeds visit={visit} />
            <div id="samples" className="scroll-mt-20 rounded-[20px] border border-[var(--line)] bg-[var(--card)] p-5">
              <h3 className="font-serif text-[19px] font-bold">No label at hand?</h3>
              <div className="mt-3 flex flex-wrap gap-2">
                {FEATURED.filter((f) => demoScenarios.some((s) => s.id === f.id)).map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => onSample(f.id)}
                    aria-pressed={visit.demoMode && visit.demoScenario === f.id}
                    className="min-h-10 rounded-full border border-[var(--line)] bg-[var(--paper)] px-3.5 text-sm hover:border-[var(--terra)] aria-pressed:border-[var(--terra)] aria-pressed:bg-[var(--terra)] aria-pressed:text-white"
                  >
                    {f.label}
                  </button>
                ))}
              </div>
              <label className="mt-3 block text-sm text-[var(--muted)]">
                <span className="sr-only">Demo sample</span>
                <select
                  id="demo-pick"
                  aria-label="Demo sample"
                  value={visit.demoMode ? (visit.demoScenario ?? "") : ""}
                  onChange={(e) => e.target.value && onSample(e.target.value)}
                  className="mt-1 min-h-11 w-full rounded-xl border border-[var(--line)] bg-white px-3 text-[var(--ink)]"
                >
                  <option value="">All samples…</option>
                  {demoScenarios.map((s) => (
                    <option key={s.id} value={s.id}>{s.description}</option>
                  ))}
                </select>
              </label>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/** Phone-only action bar so a nurse on the move never has to scroll back up. */
function MobileBar({ findings, hasResults }: { findings: number; hasResults: boolean }) {
  const item = "flex min-h-14 flex-1 flex-col items-center justify-center text-xs font-semibold";
  return (
    <nav aria-label="Quick actions" className="fixed inset-x-0 bottom-0 z-30 flex border-t border-[var(--line)] bg-[var(--card)]/95 pb-[env(safe-area-inset-bottom)] backdrop-blur sm:hidden">
      <a href="#scan" className={`${item} text-[var(--terra)]`}><span aria-hidden className="text-lg leading-none">◉</span>Scan</a>
      <button type="button" className={item} onClick={() => { scrollToId("scan"); window.setTimeout(() => document.getElementById("usmeds-input")?.focus(), 400); }}>
        <span aria-hidden className="text-lg leading-none">＋</span>Add med
      </button>
      <a href={hasResults ? "#findings-heading" : "#scan"} className={item} aria-disabled={!hasResults}>
        <span aria-hidden className={`rounded-full px-1.5 text-[11px] leading-5 ${findings ? "bg-[var(--alert)] text-white" : "bg-[var(--line)]"}`}>{findings}</span>
        Findings
      </a>
    </nav>
  );
}

export function Landing() {
  const visit = useVisit();
  const hasResults = visit.products.length > 0 || visit.usMeds.length > 0;

  // Returning users (this device has scanned before) land on the scanner, not the intro.
  useEffect(() => {
    try {
      if (window.localStorage.getItem(RETURNING_KEY) && !window.location.hash) {
        document.getElementById("scan")?.scrollIntoView({ block: "start" });
      }
    } catch {
      // Storage blocked: show the intro.
    }
  }, []);

  const onPhotos = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    markReturning();
    void addPhotos(files);
    scrollToId("results");
  };

  const onSample = (id: string) => {
    markReturning();
    void loadDemo(id);
    scrollToId("results");
  };

  return (
    <div className="flex min-h-full flex-1 flex-col overflow-x-clip pb-16 sm:pb-0">
      <Header />
      <main lang="en" className="flex-1">
        <Hero onSample={() => onSample(FEATURED[0].id)} />
        <HowItWorks />
        <ScanSection visit={visit} onPhotos={onPhotos} onSample={onSample} />
        {hasResults && <Workspace />}
      </main>
      <footer className="border-t border-[var(--line)] py-10">
        <div className="mx-auto flex w-full max-w-[1200px] flex-wrap items-center justify-between gap-6 px-5 text-sm text-[var(--muted)]">
          <Logo />
          <p className="max-w-[62ch]">
            A prototype to support clinicians. Not a substitute for a pharmacist. No real patient data. Verify with{" "}
            <a href="https://mor.nlm.nih.gov/RxNav/" className="text-[var(--ink)] underline">RxNav</a>,{" "}
            <a href="https://dailymed.nlm.nih.gov/" className="text-[var(--ink)] underline">DailyMed</a>, or your pharmacist.{" "}
            <Link href="/demo-guide" className="text-[var(--ink)] underline">Demo walkthrough</Link>
          </p>
        </div>
      </footer>
      <MobileBar findings={visit.recon?.alerts.length ?? 0} hasResults={hasResults} />
    </div>
  );
}
