export const Tick = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 16 16" aria-hidden focusable="false" className={className ?? 'size-3.5 shrink-0'}>
    <path
      d="M3 8.5 6.2 12 13 4.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const Cross = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 16 16" aria-hidden focusable="false" className={className ?? 'size-3.5 shrink-0'}>
    <path
      d="M4.5 4.5 11.5 11.5M11.5 4.5 4.5 11.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
  </svg>
);
