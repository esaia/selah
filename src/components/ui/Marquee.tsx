'use client';

import { useLayoutEffect, useRef, useState, type CSSProperties } from 'react';

import { cn } from '@/lib/cn';

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
