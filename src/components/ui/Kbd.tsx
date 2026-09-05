import { cn } from '@/lib/cn';

/**
 * A key, drawn as a key. The console's shortcuts are worth nothing to an
 * operator who has not been told about them, so wherever a shortcut opens
 * something, the chip rides on the thing it opens.
 *
 * Plate and lettering are both the cream, thinned — not one of the flat greys.
 * A fixed fill read as a hole punched through the button, and a fill a step
 * lighter still lost the label it sits beside; a translucent one lifts off
 * whatever is under it by the same amount, so the chip holds its contrast on
 * the bar, on a button, and on a button that lightens under the cursor.
 */
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
