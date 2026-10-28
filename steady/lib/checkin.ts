import { z } from "zod";
import type { Answers } from "@/lib/scoring";

export const QUESTIONS: { key: keyof Answers; title: string; low: string; high: string }[] = [
  { key: "mood", title: "How was your week overall?", low: "Rough", high: "Great" },
  { key: "energy", title: "How is your energy?", low: "Drained", high: "Energized" },
  { key: "stress", title: "How stressed do you feel?", low: "Calm", high: "Overwhelmed" },
  { key: "workload", title: "How manageable is your workload?", low: "Light", high: "Unsustainable" },
  { key: "belonging", title: "How connected do you feel to your team?", low: "Isolated", high: "Supported" },
];

export const NOTE_MAX = 1000;

const score = z.coerce.number().int().min(1).max(5);

/** Shared by the check-in form and the submitCheckin server action. */
export const checkinSchema = z.object({
  mood: score,
  energy: score,
  stress: score,
  workload: score,
  belonging: score,
  note: z.string().trim().max(NOTE_MAX, `Keep the note under ${NOTE_MAX} characters.`).default(""),
  noteShared: z.boolean().default(true),
});

export type CheckinInput = z.infer<typeof checkinSchema>;
