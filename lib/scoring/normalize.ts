// lib/scoring/normalize.ts
// Level 1 of the scoring model: turn raw measurements into 0–100 scores.

import {
  RECENCY_BUCKETS,
  VERIFICATION_BANDS,
  type PiecewiseTable,
  type VerificationLevel,
} from './config';

export function clamp(value: number, min = 0, max = 100): number {
  return Math.min(max, Math.max(min, value));
}

/** Round to one decimal — enough precision for traces without float noise. */
export function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

/** §3 — min-max normalization for continuous data. */
export function minMax(x: number, min: number, max: number): number {
  if (max <= min) return 0;
  return clamp(((x - min) / (max - min)) * 100);
}

/**
 * §4 — piecewise/capped normalization with linear interpolation between
 * thresholds. Values beyond the last threshold take the last score.
 */
export function piecewise(x: number, table: PiecewiseTable): number {
  if (table.length === 0) return 0;
  if (x <= table[0][0]) return table[0][1];
  for (let i = 1; i < table.length; i++) {
    const [x1, y1] = table[i];
    if (x <= x1) {
      const [x0, y0] = table[i - 1];
      const t = (x - x0) / (x1 - x0);
      return y0 + t * (y1 - y0);
    }
  }
  return table[table.length - 1][1];
}

/** §5 — assessment normalization: raw / maximum * 100. */
export function normalizeAssessment(raw: number, maximum = 100): number {
  if (maximum <= 0) return 0;
  return clamp((raw / maximum) * 100);
}

/** §6 — days since last relevant activity -> score. */
export function recencyScore(days: number): number {
  const d = Math.max(0, days);
  return (RECENCY_BUCKETS.find((b) => d <= b.maxDays) ?? RECENCY_BUCKETS[RECENCY_BUCKETS.length - 1]).score;
}

/** §9 — score -> verification band. */
export function verificationLevel(score: number): VerificationLevel {
  const s = clamp(score);
  return (VERIFICATION_BANDS.find((b) => s <= b.max) ?? VERIFICATION_BANDS[VERIFICATION_BANDS.length - 1]).level;
}

export const VERIFICATION_LABEL: Record<VerificationLevel, string> = {
  UNVERIFIED: 'Unverified',
  WEAK: 'Weak',
  EMERGING: 'Emerging',
  DEMONSTRATED: 'Demonstrated',
  STRONGLY_VERIFIED: 'Strongly Verified',
};

/**
 * §25 — weighted score. Entries whose value is `null` are excluded from both
 * numerator and denominator, so the remaining weights are re-normalized.
 * Returns null when nothing is available.
 */
export function weightedScore(entries: { value: number | null; weight: number }[]): number | null {
  let num = 0;
  let den = 0;
  for (const { value, weight } of entries) {
    if (value === null) continue;
    num += value * weight;
    den += weight;
  }
  return den > 0 ? num / den : null;
}

export function daysBetween(from: Date, to: Date): number {
  return Math.max(0, (to.getTime() - from.getTime()) / 86_400_000);
}
