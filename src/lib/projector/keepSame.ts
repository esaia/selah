import { lyricBlocks } from '@/lib/lyrics/langs';
import { LANGS, type LyricsSlide, type ShowData } from '@/lib/types';

/**
 * Identity, kept across a payload that says nothing new.
 *
 * The outputs decide "a new slide has arrived" by comparing the incoming state
 * with the one on screen by reference, and every payload arrives as a freshly
 * parsed object. That is fine while only slides travel — but the timer rides
 * along with the slide, so adjusting a run, renaming a timer or starting the
 * next one re-sends the same words and the bar crossfaded out and back in for
 * a change it does not draw.
 *
 * So a receiver folds the payload in through this: same content, same object,
 * and the transition never starts.
 */
export const keepSame = <T>(current: T, next: T): T => (equal(current, next) ? current : next);

/**
 * Is this the same verse, wearing a different set of languages?
 *
 * `keepSame` covers a payload that says nothing new. This covers the next case
 * along: the operator disarms a language, the slide is rebuilt without it, and
 * the words that remain are word for word the ones already on the wall. That
 * is a line being dropped, not a slide being changed — the screen should let
 * it go without crossfading out and back, which reads from the back of a hall
 * as the projector having blinked.
 *
 * True only when every language the two slides share is identical. If any
 * shared language reads differently the verse itself moved, and that is a
 * change the room should see the transition for.
 *
 * A song is the same case wearing the song's own languages: switching one off
 * mid-chorus drops a block, and the words that remain are the ones already on
 * the wall.
 */
export const sameVerse = (current: ShowData, next: ShowData): boolean => {
  if (!current || !next) return false;

  if (current.lyrics || next.lyrics) {
    return Boolean(current.lyrics && next.lyrics) && sameLyric(current.lyrics!, next.lyrics!);
  }

  const langs = LANGS.filter(lang => current[lang]?.length && next[lang]?.length);

  // Nothing in common is not "the same verse with less of it" — it is a blank
  // screen, or a different passage, and both deserve the transition.
  if (langs.length === 0) return false;

  return langs.every(lang => equal(current[lang], next[lang]));
};

/**
 * The same song slide, wearing a different set of languages.
 *
 * Matched by title and by every language the two have in common, the way a
 * verse is matched by every language it shares. A slide that shares no
 * language is a different slide — including the moment a song is switched
 * down to a translation it has no words for, which is a blank the room should
 * see arrive.
 */
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
