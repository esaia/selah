'use client';

import { useCallback, useRef, useState } from 'react';

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
