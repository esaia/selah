'use client';

import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { HiOutlinePencil } from 'react-icons/hi';
import { Plus } from 'lucide-react';

import { Slide } from '@/components/projector/Slide';
import { useLocalFiles } from '@/components/projector/useLocalBackground';
import { IconButton } from '@/components/ui/IconButton';
import { cn } from '@/lib/cn';
import { fitText } from '@/lib/projector/fitText';
import { CUSTOM_LOOK, customLook, fitTo, lookOf, LYRIC_LOOKS, VERSE_LOOKS, type Look } from '@/lib/projector/looks';
import { filesUsedBy, SAMPLE_VERSE, startingTemplate, type SlideTemplate } from '@/lib/projector/template';
import { DYNAMIC_THEME, LOCAL_THEME, themeSrc } from '@/lib/projector/themes';
import { newTemplateName, projectorStyle, templatesFor } from '@/lib/studio/settings';
import { useStudio } from '@/lib/studio/StudioProvider';
import { REQUIRED_LANG, type ProjectorStyle, type ShowData } from '@/lib/types';

import { TemplateEditor } from '@/components/studio/lyrics/TemplateEditor';

export type LookTarget = 'verses' | 'lyrics';

const TARGETS: { id: LookTarget; label: string }[] = [
  { id: 'verses', label: 'Verses' },
  { id: 'lyrics', label: 'Lyrics' },
];

const SAMPLE_LYRIC: ShowData = {
  lyrics: { title: 'Amazing Grace', text: 'Amazing grace, how sweet the sound that saved a wretch like me' },
};

const FRAME_W = 640;
const FRAME_H = 360;

const LookTile = ({
  look,
  showData,
  style,
  background,
  assets,
}: {
  look: Look;
  showData: ShowData;
  style: ProjectorStyle;
  background: string;
  assets?: Record<string, string>;
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
    if (look.selfFit) return;

    const { available, min, max } = fitTo(look, FRAME_H, {
      scale: showData.lyrics ? style.lyricsScale : style.verseScale,
      size: showData.lyrics ? style.lyricsSize : style.verseSize,
    });

    fitText(slideRef.current, available, { min, max });
  });

  return (
    <div ref={boxRef} className="show-preview" style={background ? { backgroundImage: `url(${background})` } : undefined}>
      <div className="show-preview-frame" style={{ width: FRAME_W, height: FRAME_H, transform: `scale(${scale})` }}>
        <div className="absolute inset-0 bg-black/55" />

        <Slide ref={slideRef} showData={showData} style={style} assets={assets} />
      </div>
    </div>
  );
};

export const ProjectorLookPicker = ({
  target,
  onTarget,
}: {
  target: LookTarget;
  onTarget: (target: LookTarget) => void;
}) => {
  const { settings, update, room } = useStudio();

  const [editing, setEditing] = useState('');

  const lyrics = target === 'lyrics';
  const looks = lyrics ? LYRIC_LOOKS : VERSE_LOOKS;
  const selected = lyrics ? settings.projectorLyricsLook : settings.projectorLook;
  const select = (value: string) => update(lyrics ? { projectorLyricsLook: value } : { projectorLook: value });

  const background =
    settings.theme === LOCAL_THEME
      ? ''
      : settings.theme === DYNAMIC_THEME
        ? settings.dynamicImage
        : themeSrc(settings.theme);

  const style: ProjectorStyle = {
    ...projectorStyle(settings),
    fonts: settings.customFonts,
    order: [REQUIRED_LANG],
    enabled: { [REQUIRED_LANG]: true },
  };

  const mine = templatesFor(settings, target);
  const custom = lookOf(CUSTOM_LOOK, lyrics);

  const tiles: { value: string; look: Look; label: string; template?: SlideTemplate }[] = [
    ...looks.filter(look => look.value !== CUSTOM_LOOK).map(look => ({ value: look.value, look, label: look.label })),
    ...mine.map(row => ({ value: customLook(row.id), look: custom, label: row.name, template: row.template })),
  ];

  const assets = useLocalFiles(
    useMemo(
      () => settings.customTemplates.flatMap(row => filesUsedBy(row.template)),
      [settings.customTemplates],
    ),
    null,
  );

  const add = () => {
    const row = {
      id: crypto.randomUUID(),
      target,
      name: newTemplateName(settings, target),
      template: startingTemplate(target),
    };

    if (!room('custom_templates')) {
      setEditing(row.id);
      return;
    }

    update({ customTemplates: [...settings.customTemplates, row] });
    select(customLook(row.id));
    setEditing(row.id);
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
              onClick={() => onTarget(id)}
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
        {tiles.map(({ value, look, label, template }) => (
          <div key={value} className="relative">
            <button
              type="button"
              aria-pressed={selected === value}
              onClick={() => select(value)}
              className={cn(
                'block w-full overflow-hidden rounded-studio border text-left transition-colors duration-150',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-studio-accent/40',
                selected === value
                  ? 'border-studio-accent ring-1 ring-studio-accent'
                  : 'border-studio-border hover:border-studio-faint',
              )}
            >
              <LookTile
                look={look}
                showData={lyrics ? SAMPLE_LYRIC : SAMPLE_VERSE}
                style={{
                  ...style,
                  look: value,
                  lyricsLook: value,
                  ...(template ? (lyrics ? { lyricsTemplate: template } : { template }) : {}),
                }}
                background={background}
                assets={assets}
              />

              <span
                className={cn(
                  'block truncate px-1.5 py-1 text-[11px] font-medium',
                  selected === value ? 'bg-studio-accent text-studio-onaccent' : 'bg-studio-bg text-studio-muted',
                )}
              >
                {label}
              </span>
            </button>

            {template ? (
              <IconButton
                label={`Edit ${label}`}
                tone="onDark"
                onClick={() => setEditing(value.slice(CUSTOM_LOOK.length + 1))}
                className="absolute top-1 right-1 size-6 bg-black/55 backdrop-blur-sm"
              >
                <HiOutlinePencil className="text-xs" />
              </IconButton>
            ) : null}
          </div>
        ))}

        <button
          type="button"
          onClick={add}
          className={cn(
            'block w-full overflow-hidden rounded-studio border border-dashed border-studio-border text-left',
            'text-studio-muted transition-colors duration-150 hover:border-studio-faint hover:text-studio-text',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-studio-accent/40',
          )}
        >
          <div className="flex aspect-video w-full items-center justify-center">
            <Plus className="size-5" />
          </div>

          <span className="block truncate bg-studio-bg px-1.5 py-1 text-[11px] font-medium">New template</span>
        </button>
      </div>

      {editing ? (
        <TemplateEditor target={target} id={editing} onClose={() => setEditing('')} />
      ) : null}
    </div>
  );
};
