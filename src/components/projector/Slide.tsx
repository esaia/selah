import type { RefObject } from 'react';

import { cn } from '@/lib/cn';
import { lyricBlocks } from '@/lib/lyrics/langs';
import { fontStyleOf } from '@/lib/projector/fonts';
import { DEFAULT_LYRIC_LOOK, DEFAULT_VERSE_LOOK, isCustomLook } from '@/lib/projector/looks';
import { referenceOf } from '@/lib/projector/template';
import type { Align, Lang, ProjectorStyle, ShowData, Verse } from '@/lib/types';

import { CustomSlide } from './CustomSlide';

const ALIGN_CLASS: Record<Align, string> = {
  left: 'text-left',
  center: 'text-center',
  right: 'text-right',
};

const VerseBlock = ({ verses, lang }: { verses: Verse[]; lang: Lang }) => {
  const { book, numbers } = referenceOf(verses, lang);

  return (
    <div className="show-block">
      {verses.map((verse, index) => (
        <p className="show-text" key={index} dangerouslySetInnerHTML={{ __html: verse.bv }} />
      ))}

      <div className="show-refline">
        <span className="show-ref">
          <span className="show-ref-book">{book}</span> <span className="show-ref-num">{numbers}</span>
        </span>
      </div>
    </div>
  );
};

export const Slide = ({
  ref,
  showData,
  style,
  assets,
  className,
}: {
  ref?: RefObject<HTMLDivElement | null>;
  showData: ShowData;
  style: ProjectorStyle;
  assets?: Record<string, string>;
  className?: string;
}) => {
  const lyrics = showData?.lyrics;

  const look = lyrics
    ? style.lyricsLook || DEFAULT_LYRIC_LOOK
    : style.look || DEFAULT_VERSE_LOOK;

  const template = lyrics ? style.lyricsTemplate : style.template;

  if (isCustomLook(look) && template) {
    return <CustomSlide template={template} showData={showData} style={style} assets={assets} />;
  }

  const type = fontStyleOf(lyrics ? style.lyricsFont : style.font, style.fonts);

  return (
    <div
      ref={ref}
      className={cn(
        'show-slide',
        `show-slide--${look}`,
        type.className,
        ALIGN_CLASS[lyrics ? style.lyricsAlign : style.align],
        className,
      )}
      style={type.style ? { fontFamily: type.style } : undefined}
    >
      {lyrics ? (
        lyricBlocks(lyrics).map(block => (
          <div key={block.id} className="show-block">
            <p className="show-text">{block.text.split('\n').join(' ')}</p>
          </div>
        ))
      ) : (
        style.order.map(lang => {
          const verses = showData?.[lang] ?? [];

          return style.enabled?.[lang] && verses.length > 0 ? (
            <VerseBlock key={lang} lang={lang} verses={verses} />
          ) : null;
        })
      )}
    </div>
  );
};
