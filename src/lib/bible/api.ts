import type { Lang } from '@/lib/bible/languages';
import { toLangBook } from '@/lib/bible/passage';
import type { ApiChapter } from '@/lib/types';

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
  language: lang,
  page: '1',
});

export const fetchChapter = async (query: ChapterQuery): Promise<ApiChapter> => {
  const response = await fetch(`/api/bible?${new URLSearchParams(chapterParams(query))}`);

  if (!response.ok) {
    const reason = await response
      .json()
      .then((body: { error?: string }) => body.error)
      .catch(() => null);

    throw new Error(reason || 'Could not reach the scripture service');
  }

  return response.json();
};

export const chapterKey = ({ book, chapter, lang, version }: ChapterQuery) =>
  ['chapter', lang, book, chapter, version ?? ''] as const;
