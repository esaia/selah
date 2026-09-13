import { lyricBlocks } from '@/lib/lyrics/langs';
import { LANGS, type LyricsSlide, type ShowData } from '@/lib/types';

export const keepSame = <T>(current: T, next: T): T => (equal(current, next) ? current : next);

export const sameVerse = (current: ShowData, next: ShowData): boolean => {
  if (!current || !next) return false;

  if (current.lyrics || next.lyrics) {
    return Boolean(current.lyrics && next.lyrics) && sameLyric(current.lyrics!, next.lyrics!);
  }

  const langs = LANGS.filter(lang => current[lang]?.length && next[lang]?.length);

  if (langs.length === 0) return false;

  return langs.every(lang => equal(current[lang], next[lang]));
};

const sameLyric = (current: LyricsSlide, next: LyricsSlide): boolean => {
  if (current.title !== next.title) return false;

  const by = (lyrics: LyricsSlide) =>
    new Map(lyricBlocks(lyrics).map(block => [block.id, block.text]));

  const before = by(current);
  const after = by(next);
  const shared = [...before.keys()].filter(id => after.has(id));

  return shared.length > 0 && shared.every(id => before.get(id) === after.get(id));
};

const equal = (a: unknown, b: unknown): boolean => {
  if (Object.is(a, b)) return true;

  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return false;

  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;

    return a.every((item, index) => equal(item, b[index]));
  }

  const keys = Object.keys(a as object);

  if (keys.length !== Object.keys(b as object).length) return false;

  return keys.every(
    key =>
      Object.hasOwn(b as object, key) &&
      equal((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key]),
  );
};
