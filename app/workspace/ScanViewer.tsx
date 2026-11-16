"use client";

import { useState } from "react";
import type { Extraction } from "@/lib/schema";
import { ROLE_LABEL, type Mark, type ReadSource } from "./model";

const TONE = {
  verified: { box: "border-[var(--ok)] bg-[var(--saffron)]/20", tag: "bg-[var(--ok)] text-[var(--ink)]" },
  review: { box: "border-[var(--saffron)] bg-[var(--saffron)]/25", tag: "bg-[var(--saffron)] text-[var(--ink)]" },
  info: { box: "border-[var(--info)] bg-[var(--info)]/10", tag: "bg-[var(--info)] text-[var(--ink)]" },
} as const;

export function ScanViewer({
  image,
  extraction,
  marks,
  source,
  selectedLine,
  onSelect,
  onSize,
}: {
  image: string | null;
  extraction: Extraction | null;
  marks: Mark[];
  source: ReadSource | null;
  selectedLine: number | null;
  onSelect: (line: number) => void;
  onSize: (size: { w: number; h: number }) => void;
}) {
  const [showAll, setShowAll] = useState(true);
  const boxes = extraction?.line_boxes ?? [];
  const byLine = new Map<number, Mark[]>();
  for (const m of marks) byLine.set(m.line, [...(byLine.get(m.line) ?? []), m]);
  // Number the ingredient tags the way the detail panel does.
  const ingredientNo = (m: Mark) => (m.ingredient ?? 0) + 1;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <div role="group" aria-label="Which boxes to show" className="inline-flex rounded-lg border border-[var(--line)] p-0.5">
          {[
            { v: false, label: "Fields used" },
            { v: true, label: "All text read" },
          ].map((o) => (
            <button
              key={o.label}
              type="button"
              aria-pressed={showAll === o.v}
              onClick={() => setShowAll(o.v)}
              className={`min-h-9 rounded-md px-3 font-medium ${showAll === o.v ? "bg-[var(--ink)] text-[var(--card)]" : "text-[var(--ink-2)] hover:bg-[var(--hover)]"}`}
            >
              {o.label}
            </button>
          ))}
        </div>
        <ul className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--ink-2)]" aria-label="Legend">
          <li className="flex items-center gap-1.5"><span className="size-3 rounded-sm border-2 border-[var(--ok)]" />Verified ingredient</li>
          <li className="flex items-center gap-1.5"><span className="size-3 rounded-sm border-2 border-[var(--saffron)]" />Needs review</li>
          <li className="flex items-center gap-1.5"><span className="size-3 rounded-sm border-2 border-[var(--info)]" />Product details</li>
          {showAll && <li className="flex items-center gap-1.5"><span className="size-3 rounded-sm border border-dashed border-[var(--muted)] shadow-[0_0_0_1px_rgba(255,255,255,0.55)]" />Other text read</li>}
        </ul>
      </div>

      <div className="rounded-xl bg-[var(--hover)] p-2">
        {image ? (
          <div className="relative mx-auto w-fit">
            {/* eslint-disable-next-line @next/next/no-img-element -- local data URL or bundled sample */}
            <img
              src={image}
              alt="Photo of the medicine package"
              onLoad={(e) => onSize({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })}
              className="block max-h-[68vh] w-auto max-w-full rounded-lg"
            />
            {boxes.map((b) => {
              const lineMarks = byLine.get(b.line) ?? [];
              const used = lineMarks.length > 0;
              if (!used && !showAll && b.line !== selectedLine) return null;
              const primary = lineMarks.find((m) => m.role === "ingredient") ?? lineMarks[0];
              const tone = primary ? TONE[primary.status] : null;
              const selected = b.line === selectedLine;
              const text = extraction?.transcript[b.line] ?? "";
              return (
                <button
                  key={b.line}
                  type="button"
                  onClick={() => onSelect(b.line)}
                  title={`Line ${b.line + 1}: ${text}`}
                  aria-label={`Line ${b.line + 1}: ${text}${primary ? ` (${ROLE_LABEL[primary.role]})` : ""}`}
                  aria-pressed={selected}
                  style={{ left: `${b.x / 10}%`, top: `${b.y / 10}%`, width: `${b.w / 10}%`, height: `${b.h / 10}%` }}
                  className={`absolute rounded-[3px] transition ${
                    tone
                      ? `border-2 ${tone.box}`
                      : "border border-dashed border-[var(--muted)] shadow-[0_0_0_1px_rgba(255,255,255,0.55)] hover:border-[var(--terra)] hover:bg-[var(--saffron)]/20"
                  } ${selected ? "z-10 ring-2 ring-[var(--terra)] ring-offset-1" : ""}`}
                >
                  {primary && (
                    <span
                      className={`pointer-events-none absolute bottom-full left-0 mb-0.5 max-w-[16rem] truncate rounded px-1.5 py-px text-left text-[11px] leading-4 font-semibold whitespace-nowrap shadow ${tone!.tag}`}
                    >
                      {primary.role === "ingredient" || primary.role === "strength"
                        ? `#${ingredientNo(primary)} ${primary.label}`
                        : ROLE_LABEL[primary.role]}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        ) : (
          <p className="p-8 text-center text-[var(--ink-2)]">Photo not available.</p>
        )}
      </div>
      <p className="text-xs text-[var(--muted)]">
        {source ? `${source.boxes}. ` : ""}Tap a box to see what was read there and how it was checked. The photo is
        the source of truth.
        {extraction && boxes.length < extraction.transcript.length &&
          ` ${extraction.transcript.length - boxes.length} line(s) have no position.`}
      </p>
    </div>
  );
}
