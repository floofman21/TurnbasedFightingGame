import { describe, expect, it } from "vitest";
import { addWeeks, formatWeekLong, formatWeekShort, localDate, recentWeeks, weekStartOf } from "@/lib/week";

describe("weekStartOf", () => {
  const NY = "America/New_York";

  it("returns the Monday for any day of the week", () => {
    expect(weekStartOf(new Date("2026-10-26T16:00:00Z"), NY)).toBe("2026-10-26"); // Mon
    expect(weekStartOf(new Date("2026-10-28T16:00:00Z"), NY)).toBe("2026-10-26"); // Wed
    expect(weekStartOf(new Date("2026-11-01T16:00:00Z"), NY)).toBe("2026-10-26"); // Sun
  });

  it("uses the org time zone at the Sunday→Monday boundary", () => {
    // 03:59 UTC Monday is still 23:59 Sunday in New York…
    expect(weekStartOf(new Date("2026-10-26T03:59:00Z"), NY)).toBe("2026-10-19");
    // …and 04:00 UTC is midnight Monday there.
    expect(weekStartOf(new Date("2026-10-26T04:00:00Z"), NY)).toBe("2026-10-26");
    // The same instant is already Monday in UTC and in Tokyo.
    expect(weekStartOf(new Date("2026-10-26T03:59:00Z"), "UTC")).toBe("2026-10-26");
    expect(weekStartOf(new Date("2026-10-25T15:00:00Z"), "Asia/Tokyo")).toBe("2026-10-26");
  });

  it("handles DST changes (US clocks fall back 2026-11-01)", () => {
    expect(weekStartOf(new Date("2026-11-02T04:59:00Z"), NY)).toBe("2026-10-26"); // Sun 23:59 EST
    expect(weekStartOf(new Date("2026-11-02T05:00:00Z"), NY)).toBe("2026-11-02"); // Mon 00:00 EST
  });

  it("crosses year boundaries", () => {
    expect(weekStartOf(new Date("2027-01-01T12:00:00Z"), "UTC")).toBe("2026-12-28");
  });

  it("supports a Sunday week start", () => {
    expect(weekStartOf(new Date("2026-10-28T16:00:00Z"), NY, 0)).toBe("2026-10-25");
  });
});

describe("helpers", () => {
  it("localDate reads the calendar date in a zone", () => {
    expect(localDate(new Date("2026-10-26T02:00:00Z"), "America/Los_Angeles")).toBe("2026-10-25");
  });
  it("addWeeks and recentWeeks", () => {
    expect(addWeeks("2026-10-26", -1)).toBe("2026-10-19");
    expect(recentWeeks("2026-10-26", 3)).toEqual(["2026-10-12", "2026-10-19", "2026-10-26"]);
  });
  it("formats labels", () => {
    expect(formatWeekShort("2026-10-26")).toBe("Oct 26");
    expect(formatWeekLong("2026-10-26")).toBe("Oct 26, 2026");
  });
});
