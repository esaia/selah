import { specOf, type Lang } from '@/lib/bible/languages';

/**
 * Psalm numbering.
 *
 * Georgian, Russian and Ukrainian Bibles follow the Septuagint; English and
 * every other language the API carries follow the Masoretic text, Greek's
 * "Septuagint LXX" translation included — `specOf(lang).psalms` is which.
 * From Psalm 9 on the two diverge, and it is not a flat offset — some psalms
 * are split and others merged:
 *
 *   LXX 9        = Heb 9 + 10
 *   LXX 10-112   = Heb 11-113          (+1)
 *   LXX 113      = Heb 114 + 115
 *   LXX 114+115  = Heb 116
 *   LXX 116-145  = Heb 117-146         (+1)
 *   LXX 146+147  = Heb 147
 *   LXX 1-8, 148-150 are identical
 *
 * Verified against the API by comparing verse counts per chapter.
 */
export const PSALMS_BOOK = 22;

export interface Ref {
  chapter: number;
  verse: number;
}

/** Septuagint reference -> Masoretic. */
export const canonicalToEnglish = (chapter: number, verse: number): Ref => {
  if (chapter <= 8 || chapter >= 148) {
    return { chapter, verse };
  }

  if (chapter === 9) {
    return verse <= 20 ? { chapter: 9, verse } : { chapter: 10, verse: verse - 20 };
  }

  if (chapter <= 112) {
    return { chapter: chapter + 1, verse };
  }

  if (chapter === 113) {
    return verse <= 8 ? { chapter: 114, verse } : { chapter: 115, verse: verse - 8 };
  }

  if (chapter === 114) {
    return { chapter: 116, verse };
  }

  if (chapter === 115) {
    return { chapter: 116, verse: verse + 9 };
  }

  if (chapter <= 145) {
    return { chapter: chapter + 1, verse };
  }

  if (chapter === 146) {
    return { chapter: 147, verse };
  }

  return { chapter: 147, verse: verse + 11 };
};

/** Masoretic reference -> Septuagint. */
export const englishToCanonical = (chapter: number, verse: number): Ref => {
  if (chapter <= 8 || chapter >= 148) {
    return { chapter, verse };
  }

  if (chapter === 9) {
    return { chapter: 9, verse };
  }

  if (chapter === 10) {
    return { chapter: 9, verse: verse + 20 };
  }

  if (chapter <= 113) {
    return { chapter: chapter - 1, verse };
  }

  if (chapter === 114) {
    return { chapter: 113, verse };
  }

  if (chapter === 115) {
    return { chapter: 113, verse: verse + 8 };
  }

  if (chapter === 116) {
    return verse <= 9 ? { chapter: 114, verse } : { chapter: 115, verse: verse - 9 };
  }

  if (chapter <= 146) {
    return { chapter: chapter - 1, verse };
  }

  return verse <= 11 ? { chapter: 146, verse } : { chapter: 147, verse: verse - 11 };
};

/** A language's own reference -> the shared Septuagint numbering. */
export const toCanonicalRef = (book: number, lang: Lang, chapter: number, verse: number): Ref =>
  book === PSALMS_BOOK && specOf(lang).psalms === 'masoretic' ? englishToCanonical(chapter, verse) : { chapter, verse };

/** Shared Septuagint numbering -> the reference `lang` uses. */
export const fromCanonicalRef = (book: number, lang: Lang, chapter: number, verse: number): Ref =>
  book === PSALMS_BOOK && specOf(lang).psalms === 'masoretic' ? canonicalToEnglish(chapter, verse) : { chapter, verse };
