'use client';

import { useEffect, useState, type CSSProperties } from 'react';
import { X } from 'lucide-react';

import { IconButton } from '@/components/ui/IconButton';
import { useStudio } from '@/lib/studio/StudioProvider';
import { toggleRun } from '@/lib/timer/model';

import { AppBar } from './AppBar';
import { AudioBar } from './AudioBar';
import { AudioPanel } from './AudioPanel';
import { LyricsPanel } from './LyricsPanel';
import { SongSearch } from './SongSearch';
import { PassageBlock } from './PassageBlock';
import { useSortable } from './sortable';
import { RightRail } from './RightRail';
import { SearchBar } from './SearchBar';
import { SettingsModal } from './SettingsModal';
import { Sidebar } from './Sidebar';
import { TimerPanel } from './TimerPanel';

/**
 * The console shell.
 *
 * Setup on the left, passages in the middle, what the room is seeing on the
 * right. The arrow keys step through slides from anywhere on the page, because
 * during a service the operator's hand is not on the mouse.
 */
export const Console = () => {
  const { blocks, stepLive, cardSize, setCardSize, tab, loading, updateTimer, orderBlocks } = useStudio();

  // The running order of passages. Every block folds while one is in the air —
  // see `PassageBlock` — so the whole order fits on screen as it is rearranged.
  const sortable = useSortable(blocks, block => block.id, orderBlocks);
  const [settingsTab, setSettingsTab] = useState<string | null>(null);
  const [navOpen, setNavOpen] = useState(false);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;

      const typing = Boolean(
        target && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)),
      );

      if (event.key === 'f' && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setSearching(true);
        return;
      }

      // Stepping slides must not fight with typing a reference or a lyric.
      if (typing) return;

      // A stage timer is started and stopped with a thumb on the space bar. On
      // its own tab that wins over stepping the slide, which is what the same
      // key does everywhere else in the console.
      if (event.key === ' ' && tab === 'stage') {
        event.preventDefault();
        updateTimer(toggleRun);
        return;
      }

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
  }, [stepLive, tab, updateTimer]);

  return (
    <div className="flex h-dvh flex-col bg-studio-bg">
      <AppBar onSettings={() => setSettingsTab('projector')} onOpenNav={() => setNavOpen(true)} />

      {/* Sits on the seam under the app bar, so it is in the operator's eyeline
          wherever they are working — the wait is usually a language change made
          on the far left while looking at the cards on the right. */}
      <div aria-hidden className="relative h-0.5 shrink-0">
        {loading ? (
          <div role="progressbar" aria-label="Loading passages" className="studio-progress absolute inset-0" />
        ) : null}
      </div>

      <div className="flex min-h-0 flex-1">
        <aside className="hidden w-[18rem] shrink-0 border-r border-studio-border lg:block">
          <Sidebar onSettings={setSettingsTab} />
        </aside>

        {navOpen ? (
          <div className="fixed inset-0 z-40 flex lg:hidden">
            <div className="flex-1 bg-black/30" onClick={() => setNavOpen(false)} />
            <div className="w-[18rem] max-w-[85vw] border-l border-studio-border bg-white shadow-studio-panel">
              <div className="flex h-12 items-center justify-between border-b border-studio-border px-3">
                <span className="text-sm font-semibold">Setup</span>
                <IconButton label="Close setup" onClick={() => setNavOpen(false)}>
                  <X className="size-4" />
                </IconButton>
              </div>
              <div className="h-[calc(100%-3rem)]">
                <Sidebar
                  onSettings={next => {
                    setNavOpen(false);
                    setSettingsTab(next);
                  }}
                />
              </div>
            </div>
          </div>
        ) : null}

        <main className="flex min-w-0 flex-1 flex-col">
          {tab === 'bible' ? (
            <>
              <div className="shrink-0 border-b border-studio-border bg-white px-4 py-3">
                <SearchBar />
              </div>

              <div className="studio-scroll min-h-0 flex-1 overflow-y-auto">
                {blocks.length === 0 ? (
                  <div className="grid place-items-center px-6 py-32 text-center text-sm text-studio-muted">
                    <p>
                      Search a passage above — “John 3:16-18” — and it is on the screen.
                      <br />
                      Every verse of the chapter comes with it, so stepping through costs nothing.
                    </p>
                  </div>
                ) : (
                  <div {...sortable.list()}>
                    {sortable.items.map((block, index) => (
                      <PassageBlock
                        key={block.id}
                        block={block}
                        index={index}
                        isFirst={index === 0}
                        isLast={index === blocks.length - 1}
                        sortable={sortable}
                      />
                    ))}
                  </div>
                )}
              </div>

              <div className="flex shrink-0 items-center justify-end gap-3 border-t border-studio-border bg-white px-4 py-2">
                <label className="flex items-center gap-3 text-xs text-studio-muted">
                  Card size
                  <input
                    type="range"
                    min={140}
                    max={320}
                    step={10}
                    value={cardSize}
                    onChange={event => setCardSize(Number(event.target.value))}
                    style={{ '--range-fill': `${((cardSize - 140) / 180) * 100}%` } as CSSProperties}
                    className="studio-range h-1.5 cursor-pointer appearance-none rounded-full bg-studio-border w-40"
                  />
                </label>
              </div>
            </>
          ) : null}

          {tab === 'lyrics' ? <LyricsPanel onSearch={() => setSearching(true)} /> : null}
          {tab === 'audio' ? <AudioPanel /> : null}
          {tab === 'stage' ? <TimerPanel /> : null}

          {/* Mounted on every tab, so a bed can be faded or stopped without
              leaving the passage that is on screen. */}
          <AudioBar />
        </main>

        <RightRail onSettings={setSettingsTab} />
      </div>

      {settingsTab ? <SettingsModal tab={settingsTab} onClose={() => setSettingsTab(null)} /> : null}
      {searching ? <SongSearch onClose={() => setSearching(false)} /> : null}
    </div>
  );
};
