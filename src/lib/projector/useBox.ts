'use client';

import { useCallback, useRef, useState } from 'react';

/**
 * Watch one element's box.
 *
 * A callback ref rather than an effect: the screens that use this swap the
 * element out — a full-screen message replaces the frame, an empty slide drops
 * a panel — and an effect that ran once at mount would be left watching a node
 * no longer on the page. The screen would then come back measuring nothing,
 * and size itself to nothing with it.
 *
 * Only the box is observed; every size is worked out during render, so digits
 * changing every second do not tear down and rebuild a ResizeObserver every
 * second.
 */
export const useBox = () => {
  const watching = useRef<ResizeObserver | null>(null);
  const [box, setBox] = useState({ width: 0, height: 0 });

  const ref = useCallback((node: HTMLElement | null) => {
    watching.current?.disconnect();
    watching.current = null;

    if (!node) return;

    const measure = () => {
      const { width, height } = node.getBoundingClientRect();

      setBox(current => (current.width === width && current.height === height ? current : { width, height }));
    };

    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(node);
    watching.current = observer;
  }, []);

  return [ref, box] as const;
};
