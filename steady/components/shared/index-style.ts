import { band, type Band, type IndexKey } from "@/lib/scoring";

/** Series identity for charts. Status colors are reserved for bands. */
export const SERIES_COLOR: Record<IndexKey, string> = {
  burnout: "var(--series-1)",
  happiness: "var(--series-2)",
  stress: "var(--series-3)",
  engagement: "var(--series-4)",
};

export const BAND_LABEL: Record<Band, string> = {
  healthy: "Healthy",
  watch: "Watch",
  at_risk: "At risk",
};

export const BAND_TEXT: Record<Band, string> = {
  healthy: "text-good",
  watch: "text-warn",
  at_risk: "text-bad",
};

export const BAND_DOT: Record<Band, string> = {
  healthy: "bg-good",
  watch: "bg-warn",
  at_risk: "bg-bad",
};

export function bandOf(key: IndexKey, value: number | null | undefined): Band | null {
  return value == null ? null : band(key, value);
}
