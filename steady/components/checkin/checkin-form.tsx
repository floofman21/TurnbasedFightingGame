"use client";

import * as React from "react";
import { toast } from "sonner";
import { Check } from "lucide-react";
import { submitCheckin } from "@/app/(app)/check-in/actions";
import { BAND_LABEL, BAND_TEXT, bandOf } from "@/components/shared/index-style";
import { TrendChart, type TrendPoint } from "@/components/shared/trend-chart";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { NOTE_MAX, QUESTIONS } from "@/lib/checkin";
import { computeIndices, INDICES, type Answers } from "@/lib/scoring";
import { cn } from "@/lib/utils";
import { ScaleQuestion } from "./scale-question";

type CheckinFormProps = {
  firstName: string;
  weekLabel: string;
  existing: (Answers & { note: string; noteShared: boolean }) | null;
  history: TrendPoint[];
};

const EMPTY: Answers = { mood: 0, energy: 0, stress: 0, workload: 0, belonging: 0 };

export function CheckinForm({ firstName, weekLabel, existing, history }: CheckinFormProps) {
  const [answers, setAnswers] = React.useState<Answers>(existing ?? EMPTY);
  const [note, setNote] = React.useState(existing?.note ?? "");
  const [noteShared, setNoteShared] = React.useState(existing?.noteShared ?? true);
  const [saved, setSaved] = React.useState(Boolean(existing));
  const [pending, startTransition] = React.useTransition();
  const historyRef = React.useRef<HTMLDivElement>(null);

  const answered = QUESTIONS.filter((q) => answers[q.key]).length;
  const complete = answered === QUESTIONS.length;
  const preview = complete ? computeIndices(answers) : null;
  const checkedIn = history.filter((p) => p.indices).length;

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!complete || pending) return;
    startTransition(async () => {
      const result = await submitCheckin({ ...answers, note, noteShared });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setSaved(true);
      toast("Check-in saved");
      historyRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
  };

  const clear = () => {
    setAnswers(EMPTY);
    setNote("");
    setNoteShared(true);
  };

  return (
    <div className="grid items-start gap-4 nav:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
      <form onSubmit={onSubmit} noValidate aria-label="Weekly check-in">
        <Card className="px-[22px] pt-[18px] pb-[22px]">
          <div className="flex items-center justify-between gap-3 border-b border-border pb-3.5">
            <div>
              <p className="text-[11px] font-semibold tracking-[0.07em] text-muted-foreground uppercase">
                Week of {weekLabel}
              </p>
              {saved && (
                <p className="mt-0.5 text-[13px] text-muted-foreground">
                  You’ve checked in this week. Changes replace that entry.
                </p>
              )}
            </div>
            <Progress answered={answered} total={QUESTIONS.length} />
          </div>

          <div className="divide-y divide-border">
            {QUESTIONS.map((q) => (
              <ScaleQuestion
                key={q.key}
                id={`q-${q.key}`}
                title={q.title}
                low={q.low}
                high={q.high}
                value={answers[q.key]}
                onChange={(v) => setAnswers((a) => ({ ...a, [q.key]: v }))}
              />
            ))}

            <div className="pt-4">
              <div className="mb-2.5 flex items-baseline justify-between gap-3">
                <label htmlFor="note" className="font-semibold">
                  Anything you want to share?
                </label>
                <small className="text-xs text-muted-foreground">Optional</small>
              </div>
              <textarea
                id="note"
                value={note}
                maxLength={NOTE_MAX}
                onChange={(e) => setNote(e.target.value)}
                placeholder="What went well, what got in the way, what would help…"
                aria-describedby="note-count"
                className="min-h-[92px] w-full resize-y rounded-md border border-border bg-surface px-3 py-2.5 placeholder:text-faint"
              />
              <div className="mt-2 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
                <label className="flex cursor-pointer items-center gap-2.5 text-muted-foreground">
                  <Checkbox checked={noteShared} onCheckedChange={(v) => setNoteShared(v === true)} />
                  Share this note with my manager
                </label>
                <span id="note-count" className="num text-xs text-muted-foreground" aria-live="polite">
                  {note.length} / {NOTE_MAX}
                </span>
              </div>
            </div>
          </div>
        </Card>

        {/* Sticky on phones so submit is always one tap away. */}
        <div className="sticky bottom-0 z-10 -mx-4 mt-3 flex items-center justify-end gap-2.5 border-t border-border bg-background/90 px-4 py-3 backdrop-blur nav:static nav:mx-0 nav:border-0 nav:bg-transparent nav:p-0 nav:backdrop-blur-none">
          {!complete && (
            <span className="mr-auto text-[13px] text-muted-foreground nav:mr-0">
              Answer all five to submit
            </span>
          )}
          <Button type="button" variant="outline" onClick={clear} disabled={pending}>
            Clear
          </Button>
          <Button type="submit" disabled={!complete || pending}>
            {pending ? "Saving…" : saved ? "Update check-in" : "Submit check-in"}
          </Button>
        </div>
      </form>

      <div className="flex flex-col gap-4 nav:sticky nav:top-[18px]">
        <Card className="p-[18px]">
          <h2 className="mb-0.5 text-sm font-semibold">Your scores this week</h2>
          <p className="text-[13px] text-muted-foreground">
            {complete ? "Based on your answers above." : "Fills in once all five are answered."}
          </p>
          <dl className="mt-3.5 grid grid-cols-2 gap-2.5">
            {INDICES.map((m) => {
              const v = preview?.[m.key];
              const b = bandOf(m.key, v);
              return (
                <div key={m.key} className="rounded-md bg-sunk px-3 py-2.5">
                  <dt className="text-xs text-muted-foreground">{m.short}</dt>
                  <dd className="m-0 flex items-baseline justify-between gap-2">
                    <b className={cn("num font-display text-[22px] font-semibold", b && BAND_TEXT[b])}>
                      {v == null ? "–" : v}
                    </b>
                    {b && <span className={cn("text-[11px] font-semibold", BAND_TEXT[b])}>{BAND_LABEL[b]}</span>}
                  </dd>
                </div>
              );
            })}
          </dl>
          <p className="mt-3 text-xs text-muted-foreground">
            0–100 scale. Lower is better for burnout and stress; higher is better for happiness and engagement.
          </p>
        </Card>

        <Card className="scroll-mt-4 p-[18px]" ref={historyRef}>
          <div className="mb-0.5 flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold">{firstName}’s last 8 weeks</h2>
            {saved && (
              <span className="inline-flex items-center gap-1 rounded-full bg-good-soft px-2 py-0.5 text-[11px] font-semibold text-good">
                <Check className="size-3" strokeWidth={3} />
                This week saved
              </span>
            )}
          </div>
          <p className="mb-2 text-[13px] text-muted-foreground">
            <span className="num">{checkedIn}</span> of <span className="num">{history.length}</span> check-ins
            completed.
          </p>
          <TrendChart points={history} />
        </Card>
      </div>
    </div>
  );
}

function Progress({ answered, total }: { answered: number; total: number }) {
  return (
    <div className="flex shrink-0 items-center gap-2" aria-live="polite">
      <div className="flex gap-1" aria-hidden="true">
        {Array.from({ length: total }, (_, i) => (
          <span key={i} className={cn("h-1.5 w-4 rounded-full", i < answered ? "bg-brand" : "bg-border")} />
        ))}
      </div>
      <span className="num text-xs text-muted-foreground">
        {answered} of {total}
      </span>
    </div>
  );
}
