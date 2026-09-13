'use client';

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { X } from 'lucide-react';

import { useCustomFonts } from '@/components/projector/useCustomFonts';
import { IconButton } from '@/components/ui/IconButton';
import {
  readSidebarCollapsed,
  SIDEBAR_FULL_WIDTH,
  SIDEBAR_WIDTH_VAR,
  writeSidebarCollapsed,
} from '@/lib/studio/sidebarCollapse';
import { useStudio } from '@/lib/studio/StudioProvider';
import { toggleRun } from '@/lib/timer/model';
import type { SongSlide } from '@/lib/types';

import { AppBar } from '@/components/studio/chrome/AppBar';
import { AudioBar } from '@/components/studio/chrome/AudioBar';
import { MediaPane } from '@/components/studio/media/MediaPane';
import { AudioPanel } from '@/components/studio/audio/AudioPanel';
import { Lower3rdPanel } from '@/components/studio/lower3rd/Lower3rdPanel';
import { LyricsPanel } from '@/components/studio/lyrics/LyricsPanel';
import { SongSearch } from '@/components/studio/lyrics/SongSearch';
import { PassageBlock } from '@/components/studio/lyrics/PassageBlock';
import { modalOpen } from '@/components/studio/modals/modal';
import { useSortable } from '@/components/studio/shared/sortable';
import { RightRail } from '@/components/studio/chrome/RightRail';
import { SearchBar } from '@/components/studio/chrome/SearchBar';
import { SettingsModal } from '@/components/studio/modals/SettingsModal';
import { Sidebar } from '@/components/studio/chrome/Sidebar';
import { TimerPanel } from '@/components/studio/timer/TimerPanel';

const dropCardFocus = () => {
  const focused = document.activeElement;

  if (focused instanceof HTMLElement && focused.matches('[data-slide-card]')) focused.blur();
};

const sidebarListeners = new Set<() => void>();
let sidebarSnapshot: boolean | null = null;

const sidebarStore = {
  subscribe: (listener: () => void) => {
    sidebarListeners.add(listener);
    return () => {
      sidebarListeners.delete(listener);
    };
  },
  get: (): boolean => (sidebarSnapshot ??= readSidebarCollapsed()),
  getServer: (): boolean | null => null,
  set: (collapsed: boolean) => {
    sidebarSnapshot = collapsed;
    writeSidebarCollapsed(collapsed);
    sidebarListeners.forEach(listener => listener());
  },
};

export const Console = () => {
  const {
    blocks,
    stepLive,
    tab,
    loading,
    updateTimer,
    orderBlocks,
    settings,
    live,
    songs,
    removeSlide,
    removeSlides,
    pasteSlides,
    selectedSlides,
    setSelectedSlides,
    limitNotice,
    dismissLimit,
    room,
    noteLimit,
  } = useStudio();

  useCustomFonts(settings.customFonts);

  const sortable = useSortable(blocks, block => block.id, orderBlocks);
  const [settingsTab, setSettingsTab] = useState<string | null>(null);
  const [navOpen, setNavOpen] = useState(false);
  const sidebarCollapsed = useSyncExternalStore(sidebarStore.subscribe, sidebarStore.get, sidebarStore.getServer);

  useEffect(() => {
    if (sidebarCollapsed !== null) writeSidebarCollapsed(sidebarCollapsed);
  }, [sidebarCollapsed]);

  const [searching, setSearching] = useState(false);
  const [browsing, setBrowsing] = useState(false);

  const clipboardRef = useRef<Omit<SongSlide, 'id'>[] | null>(null);

  const browse = useCallback(
    (open: boolean) => {
      if (open && !room('passages')) {
        noteLimit('passages');
        return;
      }

      setBrowsing(open);
    },
    [noteLimit, room],
  );

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;

      const typing = Boolean(
        target && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)),
      );

      if (event.key === 'Escape' && (searching || browsing)) {
        event.preventDefault();
        setSearching(false);
        setBrowsing(false);
        return;
      }

      if (event.key === 'Escape' && tab === 'lyrics' && selectedSlides.size > 0) {
        event.preventDefault();
        setSelectedSlides(new Set());
        return;
      }

      if (modalOpen()) return;

      if (event.key === 'f' && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();

        if (tab === 'bible') browse(true);
        else setSearching(true);

        return;
      }

      if (typing) return;

      if ((event.key === 'Delete' || event.key === 'Backspace') && tab === 'lyrics') {
        if (selectedSlides.size > 0) {
          event.preventDefault();

          for (const song of songs) {
            const ids = song.slides.filter(slide => selectedSlides.has(slide.id)).map(slide => slide.id);

            if (ids.length > 0) void removeSlides(song, ids);
          }

          setSelectedSlides(new Set());
          return;
        }

        if (live?.kind !== 'lyrics') return;

        const song = songs.find(item => item.id === live.songId);
        const slide = song?.slides[live.slideIndex];

        if (!song || !slide) return;

        event.preventDefault();
        void removeSlide(song, slide.id);
        return;
      }

      if (event.key.toLowerCase() === 'c' && (event.metaKey || event.ctrlKey) && tab === 'lyrics') {
        const clips: Omit<SongSlide, 'id'>[] = [];

        if (selectedSlides.size > 0) {
          for (const song of songs) {
            for (const slide of song.slides) {
              if (selectedSlides.has(slide.id)) clips.push({ text: slide.text, group: slide.group, alt: slide.alt });
            }
          }
        } else if (live?.kind === 'lyrics') {
          const slide = songs.find(item => item.id === live.songId)?.slides[live.slideIndex];

          if (slide) clips.push({ text: slide.text, group: slide.group, alt: slide.alt });
        }

        if (clips.length === 0) return;

        event.preventDefault();
        clipboardRef.current = clips;
        return;
      }

      if (event.key.toLowerCase() === 'v' && (event.metaKey || event.ctrlKey) && tab === 'lyrics') {
        if (!clipboardRef.current || clipboardRef.current.length === 0) return;

        if (selectedSlides.size > 0) {
          event.preventDefault();

          for (const song of songs) {
            const picked = song.slides.filter(slide => selectedSlides.has(slide.id));
            const after = picked[picked.length - 1];

            if (after) void pasteSlides(song, after.id, clipboardRef.current);
          }

          setSelectedSlides(new Set());
          return;
        }

        if (live?.kind !== 'lyrics') return;

        const song = songs.find(item => item.id === live.songId);
        const slide = song?.slides[live.slideIndex];

        if (!song || !slide) return;

        event.preventDefault();
        void pasteSlides(song, slide.id, clipboardRef.current);
        return;
      }

      if (event.key === ' ' && tab === 'stage') {
        event.preventDefault();
        updateTimer(toggleRun);
        return;
      }

      if (event.key === 'ArrowRight' || event.key === 'ArrowDown' || event.key === ' ') {
        event.preventDefault();
        dropCardFocus();
        stepLive(1);
      }

      if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
        event.preventDefault();
        dropCardFocus();
        stepLive(-1);
      }
    };

    window.addEventListener('keydown', onKey);

    return () => window.removeEventListener('keydown', onKey);
  }, [
    browse,
    browsing,
    live,
    pasteSlides,
    removeSlide,
    removeSlides,
    searching,
    selectedSlides,
    setSelectedSlides,
    songs,
    stepLive,
    tab,
    updateTimer,
  ]);

  useEffect(() => {
    if (!limitNotice) return;

    const wait = window.setTimeout(dismissLimit, 9000);

    return () => window.clearTimeout(wait);
  }, [dismissLimit, limitNotice]);

  return (
    <div className="flex h-dvh flex-col bg-studio-bg">
      <AppBar onSettings={() => setSettingsTab('projector')} onOpenNav={() => setNavOpen(true)} />

      <div aria-hidden className="relative h-0.5 shrink-0">
        {loading ? (
          <div role="progressbar" aria-label="Loading passages" className="studio-progress absolute inset-0" />
        ) : null}
      </div>

      {limitNotice ? (
        <div className="pointer-events-none fixed inset-x-0 top-3 z-[110] flex justify-center px-3">
          <div
            role="status"
            className="studio-notice pointer-events-auto flex items-center gap-3 rounded-studio border
              border-studio-border bg-studio-lift px-3 py-2 shadow-studio-panel"
          >
            <span className="text-sm text-studio-text">{limitNotice}</span>

            <a
              href="/pricing"
              className="shrink-0 rounded-studio bg-studio-accent px-2.5 py-1 text-xs font-medium text-studio-onaccent"
            >
              See Pro
            </a>

            <IconButton label="Dismiss" onClick={dismissLimit}>
              <X className="size-3.5" />
            </IconButton>
          </div>
        </div>
      ) : null}

      <div className="flex min-h-0 flex-1">
        <aside
          data-studio-sidebar
          style={{ width: `var(${SIDEBAR_WIDTH_VAR}, ${SIDEBAR_FULL_WIDTH}px)` }}
          className="hidden shrink-0 overflow-hidden border-r border-studio-border lg:block"
        >
          {sidebarCollapsed !== null ? (
            <Sidebar
              onSettings={setSettingsTab}
              mini={sidebarCollapsed}
              onToggleMini={() => sidebarStore.set(!sidebarCollapsed)}
            />
          ) : null}
        </aside>

        {navOpen ? (
          <div className="fixed inset-0 z-40 flex lg:hidden">
            <div className="flex-1 bg-black/70" onClick={() => setNavOpen(false)} />
            <div className="w-[18rem] max-w-[85vw] border-l border-studio-border bg-studio-bg shadow-studio-panel">
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
              <div className="shrink-0 border-b border-studio-border bg-studio-bg px-4 py-3">
                <SearchBar browsing={browsing} onBrowse={browse} />
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

            </>
          ) : null}

          {tab === 'lyrics' ? <LyricsPanel onSearch={() => setSearching(true)} /> : null}
          {tab === 'lower3rd' ? <Lower3rdPanel /> : null}
          {tab === 'audio' ? <AudioPanel /> : null}
          {tab === 'stage' ? <TimerPanel /> : null}

          <MediaPane />

          <AudioBar />
        </main>

        <RightRail onSettings={setSettingsTab} />
      </div>

      {settingsTab ? <SettingsModal tab={settingsTab} onClose={() => setSettingsTab(null)} /> : null}
      {searching ? <SongSearch onClose={() => setSearching(false)} /> : null}
    </div>
  );
};
