'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Check, Copy, Monitor, Radio, Settings, SquareDashed } from 'lucide-react';

import { cn } from '@/lib/cn';
import { useStudio } from '@/lib/studio/StudioProvider';

/** A link an operator carries to another machine, with a one-click copy. */
const OutputLink = ({ label, href, connected }: { label: string; href: string; connected: number }) => {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(new URL(href, window.location.origin).toString());
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="border-ink-800 bg-ink-900 flex items-center gap-2 rounded-md border px-2 py-1">
      <span
        title={connected ? `${connected} connected` : 'Nothing connected'}
        className={cn('size-1.5 rounded-full', connected ? 'bg-brand-500' : 'bg-ink-700')}
      />
      <span className="text-ink-300 text-xs">{label}</span>

      <button type="button" onClick={copy} title={`Copy the ${label} link`} className="text-ink-500 hover:text-white">
        {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
      </button>

      <a href={href} target="_blank" rel="noreferrer" title={`Open ${label}`} className="text-ink-500 hover:text-white">
        <SquareDashed className="size-3" />
      </a>
    </div>
  );
};

export const AppBar = ({ onSettings }: { onSettings: () => void }) => {
  const { session, peers, clearProjector, live } = useStudio();

  return (
    <header className="border-ink-850 flex items-center gap-3 border-b px-4 py-2.5">
      <Link href="/" className="text-brand-400 text-xs tracking-[0.25em] uppercase">
        Selah
      </Link>

      <div className="ml-4 flex items-center gap-2">
        <OutputLink label="Screen" href={`/show/${session.outputKey}`} connected={peers.show} />
        <OutputLink label="Stream" href={`/lower3rd/${session.outputKey}`} connected={peers.lower3rd} />
      </div>

      <div className="ml-auto flex items-center gap-2">
        <button
          type="button"
          onClick={clearProjector}
          disabled={!live}
          className={cn(
            'rounded-md border px-3 py-1.5 text-xs transition',
            live
              ? 'border-live/50 text-live hover:bg-live/10'
              : 'border-ink-850 text-ink-700 cursor-not-allowed',
          )}
        >
          Clear screen
        </button>

        <button
          type="button"
          onClick={onSettings}
          aria-label="Settings"
          className="text-ink-500 hover:bg-ink-850 rounded-md p-2 transition hover:text-white"
        >
          <Settings className="size-4" />
        </button>
      </div>
    </header>
  );
};

export const LiveBadge = () => {
  const { live, peers } = useStudio();

  return (
    <span className="text-ink-500 flex items-center gap-2 text-xs">
      {live ? <Radio className="text-live size-3 animate-pulse" /> : <Monitor className="size-3" />}
      {live ? 'On screen' : 'Screen is clear'}
      {peers.show ? ` · ${peers.show} output${peers.show > 1 ? 's' : ''}` : ''}
    </span>
  );
};
