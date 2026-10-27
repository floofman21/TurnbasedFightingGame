export function Logo({ className = "size-[34px]" }: { className?: string }) {
  return (
    <div className={`grid flex-none place-items-center rounded-[9px] bg-brand ${className}`}>
      <svg
        viewBox="0 0 24 24"
        className="size-[18px]"
        fill="none"
        stroke="var(--on-accent)"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M3 12h4l2-5 4 10 2-5h6" />
      </svg>
    </div>
  );
}
