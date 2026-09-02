import { bibleNames } from '@/lib/bible/catalog';
import type { Lang, ShowData } from '@/lib/types';

/**
 * One language's block on the projector. Fading is handled by the parent so
 * the whole screen crossfades as a unit and the text is only remeasured while
 * it is invisible.
 */
export const VerseBlock = ({ showData, lang }: { showData: ShowData; lang: Lang }) => {
  const verses = showData?.[lang] ?? [];

  if (verses.length === 0) return null;

  const first = verses[0];
  const last = verses[verses.length - 1];

  // `wigni` is the book number the API used for this language, counting from
  // Genesis = 1; the name arrays carry three group headers before Genesis, so
  // the same book sits two further along.
  const name = bibleNames[lang]?.[+first.wigni + 2] ?? '';
  const muxli = verses.length > 1 ? `${first.muxli}-${last.muxli}` : first.muxli;

  return (
    <div className="w-full">
      {verses.map((verse, index) => (
        <p className="show-text" key={index} dangerouslySetInnerHTML={{ __html: verse.bv }} />
      ))}

      <h3 className="show-text text-gray-300/90 italic">{`${name} ${first.tavi}:${muxli}`}</h3>
    </div>
  );
};
