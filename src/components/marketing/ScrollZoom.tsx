'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion, useScroll, useSpring, useTransform } from 'motion/react';

export const ScrollZoom = ({ intro, children }: { intro: React.ReactNode; children: React.ReactNode }) => {
  const reduced = useReducedMotion();
  const [wide, setWide] = useState(false);

  useEffect(() => {
    const q = window.matchMedia('(min-width: 64rem)');
    const read = () => setWide(q.matches);
    read();
    q.addEventListener('change', read);
    return () => q.removeEventListener('change', read);
  }, []);

  if (reduced || !wide) {
    return (
      <div className="space-y-12">
        {intro}
        <div className="mx-auto max-w-7xl px-6">{children}</div>
      </div>
    );
  }

  return <Stage intro={intro}>{children}</Stage>;
};

const Stage = ({ intro, children }: { intro: React.ReactNode; children: React.ReactNode }) => {
  const track = useRef<HTMLDivElement>(null);
  const group = useRef<HTMLDivElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const [fit, setFit] = useState({ scale: 1, lift: 0 });

  const measure = useCallback(() => {
    const el = box.current;
    const wrap = group.current;
    if (!el || !wrap) return;
    const { offsetWidth: width, offsetHeight: height, offsetTop: top } = el;
    if (!width || !height) return;

    setFit({
      scale: Math.max(1, Math.min(window.innerWidth / width, window.innerHeight / height)),
      lift: wrap.offsetHeight / 2 - (top + height / 2),
    });
  }, []);

  useEffect(() => {
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [measure]);

  useEffect(() => {
    const settle = () => {
      measure();
      window.dispatchEvent(new Event('resize'));
      window.dispatchEvent(new Event('scroll'));
    };

    const frame = requestAnimationFrame(settle);
    window.addEventListener('load', settle);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('load', settle);
    };
  }, [measure]);

  const { scrollYProgress } = useScroll({ target: track, offset: ['start start', 'end end'] });

  const t = useSpring(scrollYProgress, { stiffness: 110, damping: 26, mass: 0.35 });

  const scale = useTransform(t, [0.06, 0.78], [1, fit.scale]);
  const y = useTransform(t, [0.06, 0.78], [0, fit.lift]);

  const introOpacity = useTransform(t, [0, 0.22], [1, 0]);

  return (
    <div ref={track} className="relative h-[200vh]">
      <div className="pointer-events-none sticky top-0 z-20 flex h-dvh items-center overflow-x-clip">
        <div ref={group} className="relative w-full">
          <motion.div style={{ opacity: introOpacity }}>{intro}</motion.div>

          <div className="mx-auto mt-12 w-full max-w-7xl px-6">
            <motion.div ref={box} className="pointer-events-auto" style={{ scale, y, willChange: 'transform' }}>
              {children}
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
};
