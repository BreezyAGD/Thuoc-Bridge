"use client";

import { NewVisit } from "./NewVisit";
import { demoScenarios } from "@/lib/cache";
import { loadDemo, resetVisit, useVisit } from "@/lib/visit-store";
import { useLang } from "@/lib/client-store";

export function DemoControls({ english = false }: { english?: boolean }) {
  const visit = useVisit();
  const { lang: preferredLang } = useLang();
  const lang = english ? "en" : preferredLang;
  return <div className="mx-auto max-w-2xl px-4 pb-3 text-sm">
    <label className="flex min-h-10 items-center gap-2">
      <input type="checkbox" checked={visit.demoMode} onChange={(e) => { if (e.target.checked) void loadDemo(); else resetVisit(); }} />
      {lang === "vi" ? "Chế độ minh họa (bắt đầu lượt mới)" : "Demo mode (starts a new visit)"}
    </label>
    {visit.demoMode && <>
      <p>{lang === "vi" ? "Mẫu giả lập, không phải ảnh hộp thuốc thật." : "Synthetic samples, not real medicine box photos."}</p>
      <select aria-label={lang === "vi" ? "Chọn tình huống" : "Choose demo scenario"} className="mt-2 min-h-12 w-full rounded border bg-white p-2 text-slate-900" value={visit.demoScenario ?? demoScenarios[0].id} onChange={(e) => void loadDemo(e.target.value)}>
        {demoScenarios.map((s) => <option key={s.id} value={s.id}>{s.description}</option>)}
      </select>
    </>}
    <NewVisit english={english} />
  </div>;
}
