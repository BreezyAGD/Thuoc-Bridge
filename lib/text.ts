/** Deterministic text helpers shared by the guard and the normalizer. */

/** Lowercase, strip Vietnamese diacritics, collapse whitespace. "Bạch Quả" -> "bach qua". */
export function fold(s: string): string {
  return s
    .normalize("NFD")
    .replace(/\p{M}+/gu, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/** Lowercase NFC with diacritics kept and whitespace collapsed. */
export function lowerNfc(s: string): string {
  return s.normalize("NFC").toLowerCase().replace(/\s+/g, " ").trim();
}

/**
 * Letters and digits only (diacritics kept). Used for "is this text really on
 * the label" checks, so line breaks, dot leaders and punctuation don't matter.
 */
export function compact(s: string): string {
  return s.normalize("NFC").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "");
}

/**
 * Every number a printed string could mean. Vietnamese labels use a decimal
 * comma ("0,5 mg") and a dot as thousands separator ("5.000 IU"), so each
 * token yields both readings.
 */
export function numbersIn(s: string): number[] {
  const out = new Set<number>();
  for (const token of s.match(/\d+(?:[.,]\d+)*/g) ?? []) {
    const asDecimal = Number.parseFloat(token.replace(",", "."));
    if (Number.isFinite(asDecimal)) out.add(asDecimal);
    const asGrouped = Number.parseFloat(token.replace(/[.,]/g, ""));
    if (Number.isFinite(asGrouped)) out.add(asGrouped);
  }
  return [...out];
}

export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const row = [i];
    for (let j = 1; j <= b.length; j++) {
      row[j] = Math.min(
        prev[j] + 1,
        row[j - 1] + 1,
        prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
    prev = row;
  }
  return prev[b.length];
}
