// Week helpers. A week is identified by its start date ("YYYY-MM-DD") as seen in
// the organization's time zone. Weeks start Monday (ISO) unless the org says otherwise.

export const DEFAULT_TIMEZONE = "America/New_York";

const DAY_MS = 86_400_000;

/** Calendar date ("YYYY-MM-DD") of an instant in the given time zone. */
export function localDate(instant: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(instant);
  const get = (type: string) => parts.find((p) => p.type === type)!.value;
  return `${get("year")}-${get("month")}-${get("day")}`;
}

function toUtc(date: string) {
  return new Date(`${date}T00:00:00Z`);
}

function fromUtc(d: Date) {
  return d.toISOString().slice(0, 10);
}

export function addDays(date: string, days: number): string {
  return fromUtc(new Date(toUtc(date).getTime() + days * DAY_MS));
}

export function addWeeks(weekStart: string, weeks: number): string {
  return addDays(weekStart, weeks * 7);
}

/**
 * Start of the week containing `instant` in `timeZone`.
 * `weekStartDay` uses JS numbering: 0 = Sunday, 1 = Monday (default).
 */
export function weekStartOf(instant: Date, timeZone: string, weekStartDay = 1): string {
  const date = localDate(instant, timeZone);
  const dow = toUtc(date).getUTCDay();
  return addDays(date, -((dow - weekStartDay + 7) % 7));
}

/** The last `count` week starts ending with `current`, oldest first. */
export function recentWeeks(current: string, count: number): string[] {
  return Array.from({ length: count }, (_, i) => addWeeks(current, i - (count - 1)));
}

/** "Oct 26" */
export function formatWeekShort(weekStart: string) {
  return toUtc(weekStart).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

/** "Oct 26, 2026" */
export function formatWeekLong(weekStart: string) {
  return toUtc(weekStart).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}
