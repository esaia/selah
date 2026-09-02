import { toLangBook } from '@/lib/bible/passage';
import { API_LANG, type ApiChapter, type Lang } from '@/lib/types';

/** The query the scripture API expects. Georgian field names are the API's. */
export interface ChapterQuery {
  book: number;
  chapter: number;
  lang: Lang;
  version?: string;
}

export const chapterParams = ({ book, chapter, lang, version }: ChapterQuery) => ({
  w: String(toLangBook(book, lang)),
  t: String(chapter),
  m: '',
  s: '',
  mv: version || '',
  language: API_LANG[lang],
  page: '1',
});

/**
 * Fetch one chapter through our own proxy. The browser never talks to the
 * upstream API directly: the route handler caches every response in Postgres,
 * so a chapter is fetched once for every operator rather than once per person.
 */
export const fetchChapter = async (query: ChapterQuery): Promise<ApiChapter> => {
  const response = await fetch(`/api/bible?${new URLSearchParams(chapterParams(query))}`);

  if (!response.ok) {
    // The route says why — a missing service key, an unreachable upstream —
    // and that reason is far more use to whoever is looking than "failed".
    const reason = await response
      .json()
      .then((body: { error?: string }) => body.error)
      .catch(() => null);

    throw new Error(reason || 'Could not reach the scripture service');
  }

  return response.json();
};

/** Query key shared by every chapter read. Scripture is immutable, so it never goes stale. */
export const chapterKey = ({ book, chapter, lang, version }: ChapterQuery) =>
  ['chapter', lang, book, chapter, version ?? ''] as const;
