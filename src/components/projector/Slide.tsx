import type { RefObject } from 'react';

import { apiBookName } from '@/lib/bible/passage';
import { cn } from '@/lib/cn';
import { lyricBlocks } from '@/lib/lyrics/langs';
import { fontStyleOf } from '@/lib/projector/fonts';
import { DEFAULT_LYRIC_LOOK, DEFAULT_VERSE_LOOK } from '@/lib/projector/looks';
import type { Align, Lang, ProjectorStyle, ShowData, Verse } from '@/lib/types';

const ALIGN_CLASS: Record<Align, string> = {
  left: 'text-left',
  center: 'text-center',
  right: 'text-right',
};

/**
 * The reference for one group, in one language: `John 3:16`, or `3:16-18` when
 * the card carries several verses. Split into book and number because a look
 * may want to set them apart, the way the lower third does.
 */
const referenceOf = (verses: Verse[], lang: Lang) => {
  const first = verses[0];
  const last = verses[verses.length - 1];

  return {
    // `wigni` is the book number the API used for this language, counting from
    // Genesis = 1; the name arrays carry three group headers before Genesis, so
    // the same book sits two further along.
    book: apiBookName(first.wigni, lang),
    numbers: `${first.tavi}:${verses.length > 1 ? `${first.muxli}-${last.muxli}` : first.muxli}`,
  };
};

/** One language's verses, with its reference. */
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

/**
 * A slide, as the projector draws it.
 *
 * One markup for three readers: `/show`, the console's preview panel, and the
 * tiles in the look picker. That is the whole point of it being a component —
 * the lower third learned the same lesson, and a look that previews itself
 * cannot drift from what the room will see.
 *
 * Everything inside is sized in `em`, so a single `fitText` pass on this box
 * scales the text, the gaps, the plate padding and the reference together. The
 * caller owns that pass: the projector fits against a screen, the panel against
 * a thumbnail, and the picker not at all.
 */
export const Slide = ({
  ref,
  showData,
  style,
  className,
}: {
  ref?: RefObject<HTMLDivElement | null>;
  showData: ShowData;
  style: ProjectorStyle;
  className?: string;
}) => {
  const lyrics = showData?.lyrics;

  const look = lyrics
    ? style.lyricsLook || DEFAULT_LYRIC_LOOK
    : style.look || DEFAULT_VERSE_LOOK;

  // A shipped face is a class and nothing else; one the operator added has no
  // class and is named inline instead. `fontStyleOf` decides which, so a font
  // deleted from the library falls back here rather than on the wall.
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
        // A song slide has no reference, and its languages are the song's own
        // rather than the armed ones — but they stack exactly as verses do, so
        // two languages of a chorus are two blocks fitted as one. The line
        // breaks the song was written with are ignored: at projector size they
        // wrap anyway, and honouring both gives a ragged block.
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
