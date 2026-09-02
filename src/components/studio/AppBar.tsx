'use client';

import { useState } from 'react';
import { BookOpen, Check, Clock, Copy, ExternalLink, Menu, Mic2, Monitor, Music, Settings } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/cn';
import { useStudio, type Tab } from '@/lib/studio/StudioProvider';

const TABS: { id: Tab; label: string; Icon: typeof BookOpen }[] = [
  { id: 'bible', label: 'Bible', Icon: BookOpen },
  { id: 'lyrics', label: 'Lyrics', Icon: Mic2 },
  { id: 'audio', label: 'Audio', Icon: Music },
  { id: 'timer', label: 'Timer', Icon: Clock },
];

/** A link an operator carries to another machine, with a one-click copy. */
const OutputLink = ({ label, href, connected }: { label: string; href: string; connected: number }) => {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(new URL(href, window.location.origin).toString());
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <span
      className="inline-flex h-8 items-center gap-1.5 rounded-studio border border-studio-border bg-white px-2.5
        text-xs font-medium text-studio-text"
    >
      <span
        title={connected ? `${connected} connected` : 'Nothing connected'}
        className={cn('size-1.5 shrink-0 rounded-full', connected ? 'bg-studio-go' : 'bg-studio-border')}
      />
      <span className="hidden lg:inline">{label}</span>

      <button
        type="button"
        onClick={copy}
        title={`Copy the ${label} link`}
        aria-label={`Copy the ${label} link`}
        className="text-studio-faint transition-colors duration-150 hover:text-studio-text"
      >
        {copied ? <Check className="size-3.5 text-studio-go" /> : <Copy className="size-3.5" />}
      </button>

      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        title={`Open ${label}`}
        aria-label={`Open ${label}`}
        className="text-studio-faint transition-colors duration-150 hover:text-studio-text"
      >
        <ExternalLink className="size-3.5" />
      </a>
    </span>
  );
};

export const AppBar = ({ onSettings, onOpenNav }: { onSettings: () => void; onOpenNav: () => void }) => {
  const { session, peers, tab, setTab } = useStudio();

  return (
    <header
      className="flex shrink-0 flex-wrap items-center justify-between gap-x-3 gap-y-2 border-b border-studio-border
        bg-white px-3 py-2 sm:px-4 lg:h-12 lg:flex-nowrap lg:gap-4 lg:py-0"
    >
      <div className="flex min-w-0 items-center gap-2">
        <button
          type="button"
          onClick={onOpenNav}
          aria-label="Open setup"
          title="Setup — languages, projector, stream"
          className="-ml-1 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-studio text-studio-muted
            transition-colors duration-150 hover:bg-studio-surface hover:text-studio-text focus:outline-none
            focus-visible:ring-2 focus-visible:ring-studio-accent/40 lg:hidden"
        >
          <Menu className="size-4" />
        </button>

        <span className="truncate text-sm font-semibold text-studio-text">Selah</span>
        <span className="hidden text-xs text-studio-faint sm:inline">Studio</span>
      </div>

      <nav
        aria-label="Workspace"
        className="order-last flex items-center gap-0.5 rounded-studio border border-studio-border
          bg-studio-surface p-0.5 sm:order-none"
      >
        {TABS.map(({ id, label, Icon }) => (
          <button
            key={id}
            type="button"
            aria-current={tab === id ? 'page' : undefined}
            onClick={() => setTab(id)}
            className={cn(
              'inline-flex h-7 items-center gap-1.5 rounded-[4px] px-3 text-xs font-medium transition-colors',
              'duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-studio-accent/40',
              tab === id ? 'bg-white text-studio-text shadow-studio' : 'text-studio-muted hover:text-studio-text',
            )}
          >
            <Icon className="size-3.5" />
            {label}
          </button>
        ))}
      </nav>

      <div className="flex min-w-0 items-center gap-1.5 sm:gap-2">
        <OutputLink label="Screen" href={`/show/${session.outputKey}`} connected={peers.show} />
        <OutputLink label="Stream" href={`/lower3rd/${session.outputKey}`} connected={peers.lower3rd} />
        <OutputLink label="Timer" href={`/timer/${session.outputKey}`} connected={peers.timer} />

        <Button icon={<Settings className="size-3.5" />} onClick={onSettings} title="Settings — background, type, OBS">
          <span className="hidden md:inline">Settings</span>
        </Button>
      </div>
    </header>
  );
};

/** What the room is seeing, for the foot of the preview rail. */
export const LiveBadge = () => {
  const { live, peers } = useStudio();

  return (
    <span className="flex items-center gap-2 text-xs text-studio-muted">
      {live ? (
        <>
          <span className="size-1.5 shrink-0 animate-pulse rounded-full bg-studio-live" />
          On screen
        </>
      ) : (
        <>
          <Monitor className="size-3.5 text-studio-faint" />
          Screen is clear
        </>
      )}

      {peers.show ? (
        <span className="text-studio-faint">
          · {peers.show} output{peers.show > 1 ? 's' : ''}
        </span>
      ) : null}
    </span>
  );
};
