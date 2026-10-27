// Index math for Steady. Pure functions only: every index is computed at read
// time from raw 1–5 answers, so the formulas can change without a migration.

export type Answers = {
  mood: number;
  energy: number;
  stress: number;
  workload: number;
  belonging: number;
};

export type IndexKey = "burnout" | "happiness" | "stress" | "engagement";
export type Indices = Record<IndexKey, number>;
export type Band = "healthy" | "watch" | "at_risk";
export type Direction = "higher" | "lower";

export const SCORING = {
  /** Thresholds on the 0–100 scale. */
  bands: {
    higher: { healthy: 65, watch: 45 }, // ≥ 65 healthy, 45–64 watch, < 45 at risk
    lower: { healthy: 40, watch: 60 }, // ≤ 40 healthy, 41–60 watch, > 60 at risk
  },
  /** A person is at risk when any of these indices is in the at-risk band. */
  atRiskWhen: ["burnout", "happiness"] as IndexKey[],
} as const;

export const INDICES: {
  key: IndexKey;
  label: string;
  short: string;
  direction: Direction;
}[] = [
  { key: "burnout", label: "Burnout Index", short: "Burnout", direction: "lower" },
  { key: "happiness", label: "Happiness Index", short: "Happiness", direction: "higher" },
  { key: "stress", label: "Stress Level", short: "Stress", direction: "lower" },
  { key: "engagement", label: "Engagement Level", short: "Engagement", direction: "higher" },
];

export const DIRECTION: Record<IndexKey, Direction> = {
  burnout: "lower",
  happiness: "higher",
  stress: "lower",
  engagement: "higher",
};

/** Map a 1–5 average onto 0–100. */
export function pct(x: number) {
  return Math.round(((x - 1) / 4) * 100);
}

export function computeIndices(a: Answers): Indices {
  return {
    burnout: pct((a.stress + a.workload + (6 - a.energy)) / 3),
    happiness: pct((a.mood + a.belonging) / 2),
    stress: pct(a.stress),
    engagement: pct((a.energy + a.belonging + a.mood) / 3),
  };
}

export function band(key: IndexKey, value: number): Band {
  if (DIRECTION[key] === "higher") {
    const t = SCORING.bands.higher;
    return value >= t.healthy ? "healthy" : value >= t.watch ? "watch" : "at_risk";
  }
  const t = SCORING.bands.lower;
  return value <= t.healthy ? "healthy" : value <= t.watch ? "watch" : "at_risk";
}

export function isAtRisk(indices: Indices) {
  return SCORING.atRiskWhen.some((key) => band(key, indices[key]) === "at_risk");
}

/** Mean of each index across a list; null for an empty list. Not rounded. */
export function meanIndices(list: Indices[]): Indices | null {
  if (!list.length) return null;
  const sum = (key: IndexKey) => list.reduce((acc, i) => acc + i[key], 0) / list.length;
  return {
    burnout: sum("burnout"),
    happiness: sum("happiness"),
    stress: sum("stress"),
    engagement: sum("engagement"),
  };
}
