import { Card } from "@/components/ui/card";

/** Placeholder for screens that land in a later build phase. */
export function ComingSoon({ phase, items }: { phase: number; items: string[] }) {
  return (
    <Card className="p-[22px]">
      <p className="mb-2 text-[11px] font-semibold tracking-[0.07em] text-muted-foreground uppercase">
        Arrives in phase {phase}
      </p>
      <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </Card>
  );
}
