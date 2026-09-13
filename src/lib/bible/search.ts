import type { Lang } from '@/lib/bible/languages';
import { toLangBook } from '@/lib/bible/passage';

export const MIN_SEARCH_LENGTH = 3;

export const SEARCH_LIMIT = 40;

export interface VerseHit {
  book: number;
  wigni: number;
  chapter: number;
  verse: number;
  text: string;
}

export const splitOnMatch = (text: string, query: string): [string, string, string] => {
  const at = query ? text.toLowerCase().indexOf(query.toLowerCase()) : -1;

  if (at < 0) return [text, '', ''];

  return [text.slice(0, at), text.slice(at, at + query.length), text.slice(at + query.length)];
};

export const snippetAround = (text: string, query: string, span = 140): string => {
  if (text.length <= span) return text;

  const at = query ? text.toLowerCase().indexOf(query.toLowerCase()) : -1;

  if (at < 0) return `${text.slice(0, span).trimEnd()}…`;

  const room = Math.max(0, span - query.length);
  const start = Math.min(Math.max(0, at - Math.floor(room / 2)), Math.max(0, text.length - span));
  const end = Math.min(text.length, start + span);

  return `${start > 0 ? '…' : ''}${text.slice(start, end).trim()}${end < text.length ? '…' : ''}`;
};

export const searchVerses = async (
  { lang, version, query, book }: { lang: Lang; version: string; query: string; book?: number | null },
  signal?: AbortSignal,
): Promise<VerseHit[]> => {
  const params = new URLSearchParams({ language: lang, mv: version, q: query });

  if (book) params.set('w', String(toLangBook(book, lang)));
  const response = await fetch(`/api/bible/search?${params}`, { signal });

  if (!response.ok) {
    const reason = await response
      .json()
      .then((body: { error?: string }) => body.error)
      .catch(() => null);

    throw new Error(reason || 'Could not search the scripture library');
  }

  const body = (await response.json()) as { results?: VerseHit[] };

  return body.results ?? [];
};
