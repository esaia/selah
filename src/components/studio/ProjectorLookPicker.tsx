'use client';

import { useLayoutEffect, useRef, useState } from 'react';

import { Slide } from '@/components/projector/Slide';
import { cn } from '@/lib/cn';
import { fitText } from '@/lib/projector/fitText';
import { fitTo, LYRIC_LOOKS, VERSE_LOOKS, type Look } from '@/lib/projector/looks';
import { DYNAMIC_THEME, LOCAL_THEME, themeSrc } from '@/lib/projector/themes';
import { projectorStyle } from '@/lib/studio/settings';
import { useStudio } from '@/lib/studio/StudioProvider';
import { REQUIRED_LANG, type ProjectorStyle, type ShowData } from '@/lib/types';

const TARGETS = [
  { id: 'verses', label: 'Verses' },
  { id: 'lyrics', label: 'Lyrics' },
];

/** Long enough to wrap onto three lines in a tile, short enough to stay read. */
const SAMPLE_VERSE: ShowData = {
  [REQUIRED_LANG]: [
    {
      bv: 'For God so loved the world, that he gave his one and only Son.',
      wigni: 43,
      tavi: 3,
      muxli: 16,
    },
  ],
};

const SAMPLE_LYRIC: ShowData = {
  lyrics: { title: 'Amazing Grace', text: 'Amazing grace, how sweet the sound that saved a wretch like me' },
};

/** The screen a tile stands for, before it is scaled down to the tile's width. */
const FRAME_W = 640;
const FRAME_H = 360;

/**
 * One tile: the sample slide on a small screen of its own.
 *
 * The frame is a fixed size and the fit runs against it exactly as it runs
 * against a projector, so a look that comes out large comes out large here —
 * which is the only thing separating the two song looks that differ in size
 * and nothing else. The whole frame is then scaled to the tile.
 */
const LookTile = ({
  look,
  showData,
  style,
  background,
}: {
  look: Look;
  showData: ShowData;
  style: ProjectorStyle;
  background: string;
}) => {
  const boxRef = useRef<HTMLDivElement>(null);
  const slideRef = useRef<HTMLDivElement>(null);

  const [scale, setScale] = useState(0);

  useLayoutEffect(() => {
    const box = boxRef.current;

    if (!box) return;

    const observer = new ResizeObserver(() => setScale(box.clientWidth / FRAME_W));

    observer.observe(box);

    return () => observer.disconnect();
  }, []);

  useLayoutEffect(() => {
    const { available, min, max } = fitTo(look, FRAME_H, {
      scale: showData.lyrics ? style.lyricsScale : 'both',
      size: style.lyricsSize,
    });

    fitText(slideRef.current, available, { min, max });
  });

  return (
    <div ref={boxRef} className="show-preview" style={background ? { backgroundImage: `url(${background})` } : undefined}>
      <div className="show-preview-frame" style={{ width: FRAME_W, height: FRAME_H, transform: `scale(${scale})` }}>
        {/* The projector's scrim, so the sample reads the way the slide will
            over the same picture. */}
        <div className="absolute inset-0 bg-black/55" />

        <Slide ref={slideRef} showData={showData} style={style} />
      </div>
    </div>
  );
};

/**
 * Picks the layout of the projector slide by showing it. The tiles render the
 * real `<Slide>` — the same component `/show` draws with — over the operator's
 * own background, so a look and its preview cannot disagree and the choice is
 * made against the picture the room will actually see.
 *
 * Verses and song slides keep separate looks, switched by the tabs above the
 * grid rather than by a second identical grid, exactly as the lower third's
 * picker does.
 */
export const ProjectorLookPicker = () => {
  const { settings, update } = useStudio();

  const [target, setTarget] = useState('verses');

  const lyrics = target === 'lyrics';
  const looks = lyrics ? LYRIC_LOOKS : VERSE_LOOKS;
  const selected = lyrics ? settings.projectorLyricsLook : settings.projectorLook;
  const select = (value: string) => update(lyrics ? { projectorLyricsLook: value } : { projectorLook: value });

  // The operator's own picture cannot be reached from here — it lives in this
  // browser's IndexedDB, and minting a URL for it is the preview panel's job —
  // so a tile falls back to the plain dark slide, which is what an unsupported
  // background looks like on the projector too.
  const background =
    settings.theme === LOCAL_THEME
      ? ''
      : settings.theme === DYNAMIC_THEME
        ? settings.dynamicImage
        : themeSrc(settings.theme);

  // The tiles show the layout, not the language set: one language, armed, so a
  // three-language operator is not judging a look through three stacked blocks.
  const style: ProjectorStyle = {
    ...projectorStyle(settings),
    order: [REQUIRED_LANG],
    enabled: { [REQUIRED_LANG]: true },
  };

  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <span className="block text-xs font-semibold text-studio-text">Slide layout</span>

        <nav
          aria-label="Which slides this layout applies to"
          className="flex items-center gap-0.5 rounded-studio border border-studio-border bg-studio-surface p-0.5"
        >
          {TARGETS.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              aria-current={target === id ? 'true' : undefined}
              onClick={() => setTarget(id)}
              className={cn(
                'h-6 rounded-[4px] px-2.5 text-[11px] font-medium transition-colors duration-150',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-studio-accent/40',
                target === id ? 'bg-studio-lift text-studio-text shadow-studio' : 'text-studio-muted hover:text-studio-text',
              )}
            >
              {label}
            </button>
          ))}
        </nav>
      </div>

      <p className="mt-0.5 text-[11px] leading-snug text-studio-faint">
        {lyrics
          ? 'How song slides sit on the projector screen.'
          : 'Where the reference sits, and how the verse is set.'}
      </p>

      <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-4">
        {looks.map(look => (
          <button
            key={look.value}
            type="button"
            aria-pressed={selected === look.value}
            onClick={() => select(look.value)}
            className={cn(
              'overflow-hidden rounded-studio border text-left transition-colors duration-150',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-studio-accent/40',
              selected === look.value
                ? 'border-studio-accent ring-1 ring-studio-accent'
                : 'border-studio-border hover:border-studio-faint',
            )}
          >
            <LookTile
              look={look}
              showData={lyrics ? SAMPLE_LYRIC : SAMPLE_VERSE}
              style={{ ...style, look: look.value, lyricsLook: look.value }}
              background={background}
            />

            <span
              className={cn(
                'block truncate px-1.5 py-1 text-[11px] font-medium',
                selected === look.value ? 'bg-studio-accent text-studio-onaccent' : 'bg-studio-bg text-studio-muted',
              )}
            >
              {look.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};
