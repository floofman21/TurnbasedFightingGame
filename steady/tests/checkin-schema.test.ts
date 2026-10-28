import { describe, expect, it } from "vitest";
import { checkinSchema } from "@/lib/checkin";

const valid = { mood: 3, energy: 4, stress: 2, workload: 3, belonging: 5, note: "ok", noteShared: false };

describe("checkinSchema", () => {
  it("accepts five 1–5 scores", () => expect(checkinSchema.safeParse(valid).success).toBe(true));
  it.each([0, 6, 2.5])("rejects score %s", (v) => expect(checkinSchema.safeParse({ ...valid, mood: v }).success).toBe(false));
  it("rejects a missing answer", () => {
    const rest: Partial<typeof valid> = { ...valid };
    delete rest.belonging;
    expect(checkinSchema.safeParse(rest).success).toBe(false);
  });
  it("caps the note at 1,000 characters", () => {
    expect(checkinSchema.safeParse({ ...valid, note: "x".repeat(1000) }).success).toBe(true);
    expect(checkinSchema.safeParse({ ...valid, note: "x".repeat(1001) }).success).toBe(false);
  });
  it("defaults note sharing to on", () => {
    const rest: Partial<typeof valid> = { ...valid };
    delete rest.noteShared;
    expect(checkinSchema.parse(rest).noteShared).toBe(true);
  });
});
