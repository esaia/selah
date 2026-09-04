'use client';

import { useState } from 'react';

import { LlamaMark } from '@/components/brand/Wordmark';

/**
 * Things the llama has to say.
 *
 * From behind the screen, in the voice of somebody who has run a lot of
 * services: the jokes are the volunteer's, not ours, and none of them is about
 * the product being good.
 */
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

/** What he says the first time, before he starts complaining about the booth. */
const INTRO =
  'I’m Llama. I’m here to help you create beautiful presentations and keep your service focused on what matters.';

/**
 * The llama behind the projector.
 *
 * Ducked down until you come near the picture, and it says something if you go
 * to the trouble of finding it: who he is the first time, and then whatever the
 * booth is thinking. The line is picked on hover rather than on render, which
 * keeps it out of the server's markup — nothing to reconcile at hydration, and
 * a different answer every time somebody goes back for one.
 *
 * The lift is `group-hover` (the whole scene) while the bubble is this
 * element's own hover: moving over the illustration should show there is
 * something there, and only pointing at it should get you a word out of it.
 */
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
        // He introduces himself once. After that he has opinions.
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
        {/* The tail: a corner of the same box, turned to point back at him. */}
        <span
          className="absolute -bottom-[1.1cqi] left-[3cqi] size-[2.2cqi] rotate-45 border-r border-b
            border-site-rule bg-site-surface"
        />
      </div>

      <LlamaMark bare className="w-full" />
    </div>
  );
};
