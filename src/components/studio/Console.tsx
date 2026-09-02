'use client';

import { useEffect, useState } from 'react';
import { BookOpen, Music, Mic2 } from 'lucide-react';

import { cn } from '@/lib/cn';
import { useStudio, type Tab } from '@/lib/studio/StudioProvider';

const TABS: { id: Tab; label: string; icon: typeof BookOpen }[] = [
  { id: 'bible', label: 'Passages', icon: BookOpen },
  { id: 'lyrics', label: 'Songs', icon: Mic2 },
  { id: 'audio', label: 'Music', icon: Music },
];

import { AppBar, LiveBadge } from './AppBar';
import { AudioPanel } from './AudioPanel';
import { BrowseModal } from './BrowseModal';
import { LyricsPanel } from './LyricsPanel';
import { PassageBlock } from './PassageBlock';
import { PreviewPanel } from './PreviewPanel';
import { SearchBar } from './SearchBar';
import { SettingsModal } from './SettingsModal';

/**
 * The console shell.
 *
 * Passages on the left, what the room is seeing on the right. The arrow keys
 * step through slides from anywhere on the page, because during a service the
 * operator's hand is not on the mouse.
 */
export const Console = () => {
  const { blocks, stepLive, cardSize, setCardSize, clearBlocks, tab, setTab } = useStudio();
  const [browsing, setBrowsing] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;

      // Not while the operator is typing a reference or editing a song.
      if (target && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))) return;

      if (event.key === 'ArrowRight' || event.key === 'ArrowDown' || event.key === ' ') {
        event.preventDefault();
        stepLive(1);
      }

      if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
        event.preventDefault();
        stepLive(-1);
      }
    };

    window.addEventListener('keydown', onKey);

    return () => window.removeEventListener('keydown', onKey);
  }, [stepLive]);

  return (
    <div className="flex h-dvh flex-col">
      <AppBar onSettings={() => setSettingsOpen(true)} />

      <div className="flex min-h-0 flex-1">
        <nav className="border-ink-850 flex w-14 shrink-0 flex-col items-center gap-1 border-r py-3">
          {TABS.map(entry => (
            <button
              key={entry.id}
              type="button"
              onClick={() => setTab(entry.id)}
              title={entry.label}
              aria-label={entry.label}
              className={cn(
                'rounded-lg p-2.5 transition',
                tab === entry.id ? 'bg-ink-850 text-white' : 'text-ink-500 hover:text-white',
              )}
            >
              <entry.icon className="size-4" />
            </button>
          ))}
        </nav>

        <main className="min-w-0 flex-1">
          {tab === 'bible' ? (
            <div className="studio-scroll h-full overflow-y-auto">
              <div className="border-ink-850 bg-ink-950/90 sticky top-0 z-10 border-b px-4 py-3 backdrop-blur">
                <div className="mx-auto max-w-3xl">
                  <SearchBar onBrowse={() => setBrowsing(true)} />
                </div>
              </div>

              {blocks.length === 0 ? (
                <div className="text-ink-700 grid place-items-center px-6 py-32 text-center text-sm">
                  <p>
                    Type a reference above — “John 3:16-18” — and it is on the screen.
                    <br />
                    Every verse of the chapter comes with it, so stepping through costs nothing.
                  </p>
                </div>
              ) : (
                blocks.map(block => <PassageBlock key={block.id} block={block} />)
              )}
            </div>
          ) : null}

          {tab === 'lyrics' ? <LyricsPanel /> : null}
          {tab === 'audio' ? <AudioPanel /> : null}
        </main>

        <aside className="border-ink-850 hidden w-[22rem] shrink-0 flex-col gap-4 border-l p-4 lg:flex">
          <PreviewPanel />

          <LiveBadge />

          <label className="text-ink-500 mt-auto flex items-center gap-3 text-xs">
            Card size
            <input
              type="range"
              min={140}
              max={320}
              step={10}
              value={cardSize}
              onChange={event => setCardSize(Number(event.target.value))}
              className="accent-brand-500 flex-1"
            />
          </label>

          {blocks.length > 0 && tab === 'bible' ? (
            <button
              type="button"
              onClick={clearBlocks}
              className="border-ink-850 text-ink-500 hover:text-white hover:border-ink-800 rounded-md border py-1.5 text-xs transition"
            >
              Clear all passages
            </button>
          ) : null}
        </aside>
      </div>

      {browsing ? <BrowseModal onClose={() => setBrowsing(false)} /> : null}
      {settingsOpen ? <SettingsModal onClose={() => setSettingsOpen(false)} /> : null}
    </div>
  );
};
