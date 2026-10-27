export function PageHeader({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <>
      <h1 className="mb-1 font-display text-[26px] font-semibold tracking-[-0.01em] text-balance">{title}</h1>
      {children && <p className="mb-5 max-w-[65ch] text-muted-foreground">{children}</p>}
    </>
  );
}
