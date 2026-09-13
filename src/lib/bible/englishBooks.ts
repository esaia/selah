import books from '@/lib/bible/books.json';
import { specOf, type Lang } from '@/lib/bible/languages';

export const englishBooks: Record<number, number> = Object.fromEntries(
  Object.entries(books.englishBooks).map(([shared, english]) => [Number(shared), english]),
);

export const toApiBook = (book: number, lang: Lang) =>
  specOf(lang).order === 'eng' ? englishBooks[book] || book : book;
