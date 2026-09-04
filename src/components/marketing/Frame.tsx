import Image from 'next/image';

import { cn } from '@/lib/cn';

/**
 * A screen, on paper.
 *
 * Every product surface on the marketing site is shown inside one of these: a
 * dark pane with the URL it is opened at written above it. The URL bar is not
 * chrome for the look of it — "each screen is a link you open" is the whole
 * pitch, so the address is part of the picture.
 *
 * Give it `src` for a real screenshot, or `children` to render live markup —
 * the slide, the timer and the name card are drawn rather than photographed, so
 * they cannot drift from the product the way a stale PNG does. With neither, it
 * holds a labelled slot so the page can be laid out before the shots exist.
 */
export const Frame = ({
  url,
  label,
  src,
  alt,
  children,
  className,
  paneClassName,
}: {
  url?: string;
  label?: string;
  src?: string;
  alt?: string;
  children?: React.ReactNode;
  className?: string;
  paneClassName?: string;
}) => (
  <figure
    className={cn(
      'overflow-hidden rounded-studio-lg border border-studio-bar/15 bg-studio-bar p-1.5',
      className,
    )}
  >
    {url ? (
      <div className="flex items-center gap-2 px-2 py-1.5">
        <span className="size-1.5 rounded-full bg-studio-faint/50" />
        <span className="truncate font-mono text-[11px] leading-none text-studio-faint">{url}</span>
      </div>
    ) : null}

    <div className={cn('relative overflow-hidden rounded-studio bg-studio-slide', paneClassName)}>
      {src ? (
        <Image src={src} alt={alt ?? ''} fill className="object-cover" sizes="(max-width: 1024px) 100vw, 60vw" />
      ) : (
        (children ?? <Placeholder label={label} />)
      )}
    </div>
  </figure>
);

/** What goes here, said plainly, until the screenshot arrives. */
const Placeholder = ({ label }: { label?: string }) => (
  <div className="flex aspect-16/10 items-center justify-center border border-dashed border-studio-border/60 p-6">
    <span className="text-center text-xs text-studio-faint">{label ?? 'Screenshot'}</span>
  </div>
);
