'use client';

import { useEffect, useRef, useState } from 'react';
import {
  BookOpen,
  Captions,
  Check,
  Copy,
  ExternalLink,
  Menu,
  Mic2,
  Monitor,
  MonitorPlay,
  Music,
  Settings,
} from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/cn';
import { useStudio, type Tab } from '@/lib/studio/StudioProvider';

const TABS: { id: Tab; label: string; Icon: typeof BookOpen }[] = [
  { id: 'bible', label: 'Bible', Icon: BookOpen },
  { id: 'lyrics', label: 'Lyrics', Icon: Mic2 },
  { id: 'audio', label: 'Audio', Icon: Music },
  { id: 'lower3rd', label: 'Lower3rd', Icon: Captions },
  { id: 'stage', label: 'Stage', Icon: MonitorPlay },
];

/** One output an operator carries to another machine, with a one-click copy. */
const OutputRow = ({
  label,
  hint,
  href,
  connected,
}: {
  label: string;
  hint: string;
  href: string;
  connected: number;
}) => {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(new URL(href, window.location.origin).toString());
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="flex items-center gap-2 rounded-studio px-2 py-2 transition-colors duration-150 hover:bg-studio-surface">
      <span
        className={cn('size-1.5 shrink-0 rounded-full', connected ? 'bg-studio-go' : 'bg-studio-border')}
        aria-hidden
      />

      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium text-studio-text">{label}</span>
        <span className="block truncate text-xs text-studio-faint">
          {connected ? `${connected} connected` : hint}
        </span>
      </span>

      <button
        type="button"
        onClick={copy}
        title={`Copy the ${label} link`}
        aria-label={`Copy the ${label} link`}
        className="inline-flex size-7 shrink-0 items-center justify-center rounded-studio text-studio-faint
          transition-colors duration-150 hover:bg-white hover:text-studio-text focus:outline-none
          focus-visible:ring-2 focus-visible:ring-studio-accent/40"
      >
        {copied ? <Check className="size-3.5 text-studio-go" /> : <Copy className="size-3.5" />}
      </button>

      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        title={`Open ${label} in a new tab`}
        aria-label={`Open ${label} in a new tab`}
        className="inline-flex size-7 shrink-0 items-center justify-center rounded-studio text-studio-faint
          transition-colors duration-150 hover:bg-white hover:text-studio-text focus:outline-none
          focus-visible:ring-2 focus-visible:ring-studio-accent/40"
      >
        <ExternalLink className="size-3.5" />
      </a>
    </div>
  );
};

/** The three outputs behind one button, so the bar keeps its room. */
const PresentMenu = () => {
  const { session, peers } = useStudio();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const total = peers.show + peers.lower3rd + peers.stage;

  useEffect(() => {
    if (!open) return;

    const handleMouseDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };

    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <Button
        icon={<MonitorPlay className="size-3.5" />}
        onClick={() => setOpen(value => !value)}
        aria-expanded={open}
        aria-haspopup="menu"
        title="Present — screen, stream and stage links"
        className={cn(open && 'bg-studio-surface')}
      >
        Present
        <span
          className={cn('size-1.5 shrink-0 rounded-full', total ? 'bg-studio-go' : 'bg-studio-border')}
          title={total ? `${total} connected` : 'Nothing connected'}
        />
      </Button>

      {open ? (
        <div
          role="menu"
          aria-label="Present"
          className="absolute right-0 z-30 mt-1.5 w-72 rounded-studio border border-studio-border bg-white p-1.5
            shadow-studio"
        >
          <p className="px-2 pb-1 pt-1.5 text-[11px] font-medium uppercase tracking-wide text-studio-faint">
            Present to
          </p>

          <OutputRow
            label="Screen"
            hint="The projector in the room"
            href={`/show/${session.outputKey}`}
            connected={peers.show}
          />
          <OutputRow
            label="Stream"
            hint="Lower third for the broadcast"
            href={`/lower3rd/${session.outputKey}`}
            connected={peers.lower3rd}
          />
          <OutputRow
            label="Stage"
            hint="The monitor facing the platform"
            href={`/stage/${session.outputKey}`}
            connected={peers.stage}
          />
        </div>
      ) : null}
    </div>
  );
};

export const AppBar = ({ onSettings, onOpenNav }: { onSettings: () => void; onOpenNav: () => void }) => {
  const { tab, setTab } = useStudio();

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
        <PresentMenu />

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
