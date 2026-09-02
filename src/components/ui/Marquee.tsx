'use client';

import { useLayoutEffect, useRef, useState, type CSSProperties } from 'react';

import { cn } from '@/lib/cn';

/**
 * Text that walks sideways when it does not fit, the way a player shows a long
 * track title, and sits still when it does.
 *
 * The distance is measured rather than guessed, so the animation always stops
 * exactly at the end of the text — and its duration follows that distance, so
 * a slightly-too-long title does not crawl.
 */
export const Marquee = ({ text, className }: { text: string; className?: string }) => {
  const box = useRef<HTMLSpanElement>(null);
  const inner = useRef<HTMLSpanElement>(null);

  const [shift, setShift] = useState(0);

  useLayoutEffect(() => {
    const outer = box.current;
    const content = inner.current;

    if (!outer || !content) return;

    const measure = () => setShift(Math.min(0, outer.clientWidth - content.scrollWidth));

    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(outer);
    observer.observe(content);

    return () => observer.disconnect();
  }, [text]);

  const style = {
    '--marquee-shift': `${shift}px`,
    // Roughly a constant reading speed, with a floor so a short overrun still
    // moves gently rather than twitching.
    '--marquee-duration': `${Math.max(6, 4 + -shift / 25)}s`,
  } as CSSProperties;

  return (
    <span ref={box} title={text} className={cn('block overflow-hidden', className)}>
      <span
        ref={inner}
        style={shift < 0 ? style : undefined}
        className={cn('inline-block whitespace-nowrap', shift < 0 && 'studio-marquee')}
      >
        {text}
      </span>
    </span>
  );
};
