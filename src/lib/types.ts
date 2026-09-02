/** The three languages, in the order the API and the old app use them. */
export const LANGS = ['geo', 'eng', 'rus'] as const;
export type Lang = (typeof LANGS)[number];

export const LANG_LABELS: Record<Lang, string> = {
  geo: 'Georgian',
  eng: 'English',
  rus: 'Russian',
};

/** The upstream API speaks 'ru', not 'rus'. */
export const API_LANG: Record<Lang, string> = { geo: 'geo', eng: 'eng', rus: 'ru' };

/**
 * A verse exactly as the scripture API returns it. The Georgian field names are
 * the API's: wigni = book, tavi = chapter, muxli = verse, bv = the verse HTML.
 */
export interface Verse {
  bv: string;
  wigni: string | number;
  tavi: string | number;
  muxli: string | number;
}

export interface ApiChapter {
  bibleData?: Verse[];
  bibleNames?: string[];
  versions?: string[];
  tavi?: { cc: string | number }[];
  muxli?: { cc: string | number }[];
}

/**
 * What the outputs render. When `lyrics` is present the language arrays are
 * ignored and the slide is a song slide instead.
 */
export interface ShowData {
  geo: Verse[];
  eng: Verse[];
  rus: Verse[];
  lyrics?: { title: string; text: string };
}

export const emptyShowData = (): ShowData => ({ geo: [], eng: [], rus: [] });

export type Align = 'left' | 'center' | 'right';

/** Everything /show needs to draw a slide, sent with the slide itself. */
export interface ProjectorStyle {
  theme: string;
  dynamicImage: string;
  localImage: LocalFileMeta | null;
  font: string;
  align: Align;
  lyricsFont: string;
  lyricsAlign: Align;
  order: Lang[];
  enabled: Record<Lang, boolean>;
  transitionMs: number;
}

/**
 * Everything /lower3rd needs. `enabled` here has exactly one language true —
 * the stream shows one language, chosen from the armed set.
 */
export interface StreamStyle {
  font: string;
  align: Align;
  lyricsFont: string;
  lyricsAlign: Align;
  order: Lang[];
  enabled: Record<Lang, boolean>;
  transitionMs: number;
  position: 'top' | 'bottom';
  variant: string;
  lyricsVariant: string;
  hidden: boolean;
}

/** Identity of a file living in the operator's own browser, not on a server. */
export interface LocalFileMeta {
  id: string;
  name: string;
  type: string;
  size: number;
}

// ------------------------------------------------------------------ blocks

/**
 * One imported passage. `verses` holds verse numbers; `data[lang]` is index
 * aligned with it, holding null where a language lacks that verse. `groups`
 * partitions the verse numbers into slides — one group is one card.
 */
export interface Block {
  id: string;
  book: number;
  chapter: number;
  from: number | null;
  to: number | null;
  adminLang: Lang;
  versions: Partial<Record<Lang, string>>;
  chapterLength: number;
  verses: number[];
  groups: number[][];
  data: Record<Lang, (Verse | null)[]>;
  collapsed?: boolean;
}

export type Live =
  | null
  | { kind?: undefined; blockId: string; verseIndex: number }
  | { kind: 'lyrics'; songId: string; slideIndex: number };

export interface SongSlide {
  id: string;
  text: string;
}

export interface Song {
  id: string;
  title: string;
  slides: SongSlide[];
  source?: string;
}

/** The verses of one group, in one language, with the gaps dropped. */
export const groupVerses = (block: Block, lang: Lang, group: number[]): Verse[] =>
  (group ?? [])
    .map(number => block.data?.[lang]?.[block.verses.indexOf(number)])
    .filter((verse): verse is Verse => Boolean(verse));

export const range = (from: number, to: number): number[] =>
  Array.from({ length: to - from + 1 }, (_, index) => from + index);
