import { describe, expect, it } from "vitest";
import { band, computeIndices, isAtRisk, meanIndices, pct, type Answers } from "@/lib/scoring";

const a = (mood: number, energy: number, stress: number, workload: number, belonging: number): Answers => ({
  mood,
  energy,
  stress,
  workload,
  belonging,
});

describe("pct", () => {
  it("maps 1–5 onto 0–100", () => {
    expect(pct(1)).toBe(0);
    expect(pct(3)).toBe(50);
    expect(pct(5)).toBe(100);
  });
  it("rounds to the nearest point", () => {
    expect(pct(10 / 3)).toBe(58); // 58.33
    expect(pct(11 / 3)).toBe(67); // 66.67
  });
});

describe("computeIndices", () => {
  it("burnout = pct((stress + workload + (6 − energy)) / 3)", () => {
    expect(computeIndices(a(3, 5, 1, 1, 3)).burnout).toBe(0);
    expect(computeIndices(a(3, 1, 5, 5, 3)).burnout).toBe(100);
    expect(computeIndices(a(3, 2, 4, 3, 3)).burnout).toBe(pct((4 + 3 + 4) / 3)); // 67
  });
  it("happiness = pct((mood + belonging) / 2)", () => {
    expect(computeIndices(a(4, 3, 3, 3, 3)).happiness).toBe(63);
    expect(computeIndices(a(5, 1, 5, 5, 5)).happiness).toBe(100);
  });
  it("stress = pct(stress)", () => {
    expect(computeIndices(a(3, 3, 2, 3, 3)).stress).toBe(25);
    expect(computeIndices(a(3, 3, 4, 3, 3)).stress).toBe(75);
  });
  it("engagement = pct((energy + belonging + mood) / 3)", () => {
    expect(computeIndices(a(4, 4, 3, 3, 5)).engagement).toBe(pct(13 / 3)); // 83
    expect(computeIndices(a(1, 1, 3, 3, 1)).engagement).toBe(0);
  });
});

describe("band — higher is better (happiness, engagement)", () => {
  it.each([
    [65, "healthy"],
    [64, "watch"],
    [45, "watch"],
    [44, "at_risk"],
  ] as const)("%i → %s", (value, expected) => {
    expect(band("happiness", value)).toBe(expected);
    expect(band("engagement", value)).toBe(expected);
  });
});

describe("band — lower is better (burnout, stress)", () => {
  it.each([
    [40, "healthy"],
    [41, "watch"],
    [60, "watch"],
    [61, "at_risk"],
  ] as const)("%i → %s", (value, expected) => {
    expect(band("burnout", value)).toBe(expected);
    expect(band("stress", value)).toBe(expected);
  });
});

describe("isAtRisk", () => {
  const base = { burnout: 30, happiness: 70, stress: 30, engagement: 70 };
  it("flags burnout at risk", () => expect(isAtRisk({ ...base, burnout: 61 })).toBe(true));
  it("flags happiness at risk", () => expect(isAtRisk({ ...base, happiness: 44 })).toBe(true));
  it("ignores stress and engagement alone", () =>
    expect(isAtRisk({ ...base, stress: 100, engagement: 0 })).toBe(false));
  it("is not at risk at the band edges", () => expect(isAtRisk({ ...base, burnout: 60, happiness: 45 })).toBe(false));
});

describe("meanIndices", () => {
  it("averages each index without rounding", () => {
    expect(
      meanIndices([
        { burnout: 50, happiness: 60, stress: 25, engagement: 70 },
        { burnout: 51, happiness: 61, stress: 50, engagement: 71 },
      ]),
    ).toEqual({ burnout: 50.5, happiness: 60.5, stress: 37.5, engagement: 70.5 });
  });
  it("returns null for no data", () => expect(meanIndices([])).toBeNull());
});
