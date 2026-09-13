import type { LangSpec } from '@/lib/bible/languages';

export const PSALMS_BOOK = 22;

export interface Ref {
  chapter: number;
  verse: number;
}

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

export type PsalmScheme = LangSpec['psalms'];

export const toCanonicalRef = (book: number, psalms: PsalmScheme, chapter: number, verse: number): Ref =>
  book === PSALMS_BOOK && psalms === 'masoretic' ? englishToCanonical(chapter, verse) : { chapter, verse };

export const fromCanonicalRef = (book: number, psalms: PsalmScheme, chapter: number, verse: number): Ref =>
  book === PSALMS_BOOK && psalms === 'masoretic' ? canonicalToEnglish(chapter, verse) : { chapter, verse };
