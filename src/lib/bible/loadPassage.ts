import type { QueryClient } from '@tanstack/react-query';

import { chapterKey, fetchChapter, type ChapterQuery } from '@/lib/bible/api';
import { fromCanonicalRef, toCanonicalRef } from '@/lib/bible/psalms';
import type { Lang } from '@/lib/bible/languages';
import type { ApiChapter, Verse } from '@/lib/types';

export interface Target {
  lang: Lang;
  version?: string;
}

export interface PassageRequest {
  book: number;
  chapter: number;
  verses?: number[];
  adminLang: Lang;
  targets: Target[];
}

export interface Passage {
  data: Partial<Record<Lang, (Verse | null)[]>>;
  chapterLength: number;
  verses: number[];
}

/**
 * Loading a whole chapter is one request per language, and the API hands back
 * every verse of it. Once a chapter is cached, going live on any verse in it
 * costs no network at all.
 */
export const loadChapter = (client: QueryClient, query: ChapterQuery): Promise<ApiChapter> =>
  client.fetchQuery({
    queryKey: chapterKey(query),
    queryFn: () => fetchChapter(query),
    staleTime: Infinity,
  });

/**
 * Load one passage in every armed language, aligned verse by verse.
 *
 * The admin language defines the passage; each verse is translated into the
 * shared Septuagint numbering and back out into the target language's own
 * numbering. For everything except Psalms that is the identity, but a Georgian
 * psalm can land on a different English chapter — and occasionally on two of
 * them — so the chapters are resolved per verse rather than assumed to match.
 * Missing verses stay null to keep the arrays aligned with `verses`.
 */
export const loadPassage = async (
  client: QueryClient,
  { book, chapter, verses, adminLang, targets }: PassageRequest,
): Promise<Passage> => {
  const adminTarget = targets.find(target => target.lang === adminLang);
  const adminChapter = await loadChapter(client, { book, chapter, lang: adminLang, version: adminTarget?.version });

  const allVerses = adminChapter?.bibleData ?? [];
  const byNumber = new Map(allVerses.map(verse => [+verse.muxli, verse]));

  // No explicit list means the whole chapter.
  const wanted = (verses?.length ? verses : allVerses.map(verse => +verse.muxli)).filter(number =>
    byNumber.has(number),
  );

  const adminVerses = wanted.map(number => byNumber.get(number) ?? null);
  const chapterLength = allVerses.length;
  const canonical = wanted.map(number => toCanonicalRef(book, adminLang, chapter, number));

  const results = await Promise.all(
    targets.map(async ({ lang, version }): Promise<[Lang, (Verse | null)[]]> => {
      if (lang === adminLang) return [lang, adminVerses];

      const refs = canonical.map(ref => fromCanonicalRef(book, lang, ref.chapter, ref.verse));
      const chapters = [...new Set(refs.map(ref => ref.chapter))];
      const loaded: Record<number, Verse[]> = {};

      await Promise.all(
        chapters.map(async target => {
          try {
            const data = await loadChapter(client, { book, chapter: target, lang, version });
            loaded[target] = data?.bibleData ?? [];
          } catch {
            loaded[target] = [];
          }
        }),
      );

      return [lang, refs.map(ref => (loaded[ref.chapter] ?? []).find(item => +item.muxli === ref.verse) ?? null)];
    }),
  );

  return {
    data: Object.fromEntries(results),
    chapterLength,
    verses: wanted,
  };
};

/** How many chapters a book has — the API reports it on any chapter fetch. */
export const loadChapterCount = async (client: QueryClient, query: Omit<ChapterQuery, 'chapter'>) => {
  const data = await loadChapter(client, { ...query, chapter: 1 });
  return Number(data?.tavi?.[0]?.cc) || 0;
};

/** How many verses a chapter has. */
export const loadVerseCount = async (client: QueryClient, query: ChapterQuery) => {
  const data = await loadChapter(client, query);
  return data?.bibleData?.length ?? 0;
};
