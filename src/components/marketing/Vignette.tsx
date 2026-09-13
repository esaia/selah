'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion, useScroll, useSpring, useTransform } from 'motion/react';

export const Vignette = ({ children }: { children: React.ReactNode }) => {
  const reduced = useReducedMotion();
  const [wide, setWide] = useState(false);
  const track = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const q = window.matchMedia('(min-width: 64rem)');
    const read = () => setWide(q.matches);
    read();
    q.addEventListener('change', read);
    return () => q.removeEventListener('change', read);
  }, []);

  const { scrollYProgress } = useScroll({ target: track, offset: ['start start', 'end end'] });
  const t = useSpring(scrollYProgress, { stiffness: 55, damping: 22, mass: 0.5 });

  const opacity = useTransform(t, [0.05, 0.35, 0.75, 0.95], [0, 1, 1, 0]);

  return (
    <div ref={track} className="relative">
      {reduced || !wide ? null : (
        <motion.div aria-hidden className="pointer-events-none fixed inset-0 bg-[#110F0F]" style={{ opacity }} />
      )}
      {children}
    </div>
  );
};
