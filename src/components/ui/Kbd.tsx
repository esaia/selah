import { cn } from '@/lib/cn';

export const Kbd = ({ children, className }: { children: string; className?: string }) => (
  <kbd
    className={cn(
      'rounded border border-studio-text/20 bg-studio-text/15 px-1.5 py-0.5 font-sans text-[10px]',
      'leading-none font-medium tracking-tight text-studio-text',
      className,
    )}
  >
    {children}
  </kbd>
);
