'use client';

import { useState } from 'react';

import { LlamaMark } from '@/components/brand/Wordmark';

const LINES = [
  'Nobody claps for the person at the back. I clap for you.',
  'The countdown says four minutes. The sermon disagrees.',
  'You changed the lyrics. The congregation noticed.',
  'Yes, the font is big enough. I checked.',
  'The pastor said ‘one last point.’ I have concerns.',
  'The service starts in two minutes. Naturally, we are changing the font.',
  'One more song? Sure. My schedule means nothing.',
  'Everything is working. Please don’t touch anything.',
  'The presentation is ready. Are you?',
];

const INTRO =
  'I’m Llama. I’m here to help you create beautiful presentations and keep your service focused on what matters.';

export const PeekingLlama = () => {
  const [line, setLine] = useState(INTRO);
  const [met, setMet] = useState(false);
  const [open, setOpen] = useState(false);

  return (
    <div
      className="absolute transition-transform duration-500 ease-out group-hover:-translate-y-[24%]
        motion-reduce:transition-none"
      style={{ left: '5%', bottom: '44%', width: '20%' }}
      onMouseEnter={() => {
        if (met) setLine(LINES[Math.floor(Math.random() * LINES.length)]);
        setMet(true);
        setOpen(true);
      }}
      onMouseLeave={() => setOpen(false)}
    >
      <div
        aria-hidden
        className={`absolute bottom-[86%] left-[38%] w-[42cqi] origin-bottom-left rounded-studio-lg border
          border-site-rule bg-site-surface px-[2.6cqi] py-[2.2cqi] text-[2.3cqi] leading-snug text-site-ink
          shadow-site-frame transition-all duration-200 ease-out motion-reduce:transition-none ${
            open ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-[8%] opacity-0'
          }`}
      >
        {line}
        <span
          className="absolute -bottom-[1.1cqi] left-[3cqi] size-[2.2cqi] rotate-45 border-r border-b
            border-site-rule bg-site-surface"
        />
      </div>

      <LlamaMark bare className="w-full" />
    </div>
  );
};
