'use client';

import { useEffect, useRef, useState } from 'react';

const RUN = 520;

const ease = (t: number) => 1 - (1 - t) ** 3;

const parse = (value: string) => {
  const match = /^(\D*)(\d+(?:\.\d+)?)(.*)$/.exec(value);

  if (!match) return null;

  const [, before, digits, after] = match;

  return { before, after, target: Number(digits), places: (digits.split('.')[1] ?? '').length };
};

export const CountingPrice = ({
  value,
  className = '',
  style,
}: {
  value: string;
  className?: string;
  style?: React.CSSProperties;
}) => {
  const parsed = parse(value);
  const target = parsed?.target ?? 0;

  const [shown, setShown] = useState(target);
  const at = useRef(target);

  useEffect(() => {
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (still || at.current === target) {
      at.current = target;
      setShown(target);

      return;
    }

    const from = at.current;
    const start = performance.now();
    let frame = 0;

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / RUN);
      const next = from + (target - from) * ease(t);

      at.current = next;
      setShown(next);

      if (t < 1) frame = requestAnimationFrame(tick);
      else at.current = target;
    };

    frame = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(frame);
  }, [target]);

  if (!parsed) return <span className={className} style={style}>{value}</span>;

  return (
    <span className={className} style={style}>
      {parsed.before}
      <span className="tabular-nums">{shown.toFixed(parsed.places)}</span>
      {parsed.after}
    </span>
  );
};
