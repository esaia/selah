'use client';

import { useCallback, useEffect, useRef } from 'react';

import { VerseBlock } from '@/components/projector/VerseBlock';
import { fitText } from '@/lib/projector/fitText';
import { DYNAMIC_THEME, LOCAL_THEME, themeSrc } from '@/lib/projector/themes';
import { projectorStyle } from '@/lib/studio/settings';
import { useStudio } from '@/lib/studio/StudioProvider';
import type { Align } from '@/lib/types';

const ALIGN_CLASS: Record<Align, string> = {
  left: 'text-left',
  center: 'text-center',
  right: 'text-right',
};

/**
 * What the projector is showing, at desk size.
 *
 * It draws from the same components and the same fit-to-height search as the
 * real output, so a verse that will be clipped on the wall is clipped here.
 */
export const PreviewPanel = () => {
  const { settings, showData } = useStudio();
  const style = projectorStyle(settings);
  const frameRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);

  const lyrics = Boolean(showData.lyrics);

  const background =
    style.theme === LOCAL_THEME || style.theme === DYNAMIC_THEME
      ? style.theme === DYNAMIC_THEME
        ? style.dynamicImage
        : ''
      : themeSrc(style.theme);

  const resize = useCallback(() => {
    const height = frameRef.current?.clientHeight ?? 0;

    fitText(textRef.current, height - height * 0.14, {
      min: 6,
      max: lyrics ? Math.round(height / 4) : Math.round(height / 13),
    });
  }, [lyrics]);

  useEffect(() => {
    resize();

    const observer = new ResizeObserver(resize);

    if (frameRef.current) observer.observe(frameRef.current);

    return () => observer.disconnect();
  }, [resize, showData, settings]);

  return (
    <div
      ref={frameRef}
      className={`relative aspect-video w-full overflow-hidden rounded-lg bg-black bg-cover bg-center ${
        lyrics ? style.lyricsFont : style.font
      }`}
      style={background ? { backgroundImage: `url(${background})` } : undefined}
    >
      <div className="absolute inset-0 bg-black/55" />

      <div
        ref={textRef}
        className={`relative flex h-full w-full flex-col justify-center px-[4%] ${
          ALIGN_CLASS[lyrics ? style.lyricsAlign : style.align]
        }`}
      >
        {showData.lyrics ? (
          <p className="show-text">{showData.lyrics.text.split('\n').join(' ')}</p>
        ) : (
          style.order.map(lang => (style.enabled[lang] ? <VerseBlock key={lang} lang={lang} showData={showData} /> : null))
        )}
      </div>
    </div>
  );
};
