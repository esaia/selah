export {
  LANGS,
  LANG_LABELS,
  LANG_SPECS,
  labelOf,
  isCustomLang,
  CUSTOM_LANG_PREFIX,
  registerLangs,
  MAX_LANGS,
  REQUIRED_LANG,
  defaultVersionOf,
  isLang,
  specOf,
  versionsOf,
} from '@/lib/bible/languages';
export type { BuiltInLang, CustomLang, Lang, LangSpec } from '@/lib/bible/languages';

import type { Lang } from '@/lib/bible/languages';
import type { Colorway } from '@/lib/lower3rd/colors';
import type { CustomFont } from '@/lib/projector/fonts';
import type { ScaleMode } from '@/lib/projector/looks';
import type { SlideTemplate } from '@/lib/projector/template';

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

export interface LyricsSlide {
  title: string;
  text: string;
  langs?: { id: string; label: string; text: string }[];
  stage?: string;
  lower3rd?: string;
}

export type ShowData = Partial<Record<Lang, Verse[]>> & {
  lyrics?: LyricsSlide;
};

export const emptyShowData = (): ShowData => ({});

export type Align = 'left' | 'center' | 'right';

export interface ProjectorStyle {
  theme: string;
  dynamicImage: string;
  localImage: LocalFileMeta | null;
  font: string;
  align: Align;
  lyricsFont: string;
  lyricsAlign: Align;
  look: string;
  lyricsLook: string;
  template: SlideTemplate | null;
  lyricsTemplate: SlideTemplate | null;
  versions: Partial<Record<Lang, string>>;
  verseScale: ScaleMode;
  verseSize: number;
  lyricsScale: ScaleMode;
  lyricsSize: number;
  order: Lang[];
  enabled: Partial<Record<Lang, boolean>>;
  transitionMs: number;
  fonts: CustomFont[];
  langs: CustomLangSpec[];
}

export interface CustomLangSpec {
  code: Lang;
  label: string;
  names: string[];
}

export interface StreamStyle {
  font: string;
  align: Align;
  lyricsFont: string;
  lyricsAlign: Align;
  order: Lang[];
  enabled: Partial<Record<Lang, boolean>>;
  transitionMs: number;
  position: 'top' | 'bottom';
  variant: string;
  lyricsVariant: string;
  colors: Colorway;
  lyricsColors: Colorway;
  hidden: boolean;
  template: SlideTemplate | null;
  lyricsTemplate: SlideTemplate | null;
  versions: Partial<Record<Lang, string>>;
  fonts: CustomFont[];
  langs: CustomLangSpec[];
}

export interface LocalFileMeta {
  id: string;
  name: string;
  type: string;
  size: number;
}

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
  data: Partial<Record<Lang, (Verse | null)[]>>;
  collapsed?: boolean;
}

export type Live =
  | null
  | { kind?: undefined; blockId: string; verseIndex: number }
  | { kind: 'lyrics'; songId: string; slideIndex: number };

export interface SongSlide {
  id: string;
  text: string;
  group?: string;
  alt?: Record<string, string>;
}

export interface SongLang {
  id: string;
  label: string;
  on: boolean;
}

export interface SongLibrary {
  id: string;
  name: string;
}

export interface SongPlaylist {
  id: string;
  name: string;
  songs: string[];
}

export interface OpenList {
  kind: 'library' | 'playlist';
  id: string;
}

export interface Song {
  id: string;
  title: string;
  slides: SongSlide[];
  source?: string;
  libraryId?: string;
  langs?: SongLang[];
  stageLang?: string;
  lower3rdLang?: string;
  cardLang?: string;
}

export const groupVerses = (block: Block, lang: Lang, group: number[]): Verse[] =>
  (group ?? [])
    .map(number => block.data?.[lang]?.[block.verses.indexOf(number)])
    .filter((verse): verse is Verse => Boolean(verse));

export const range = (from: number, to: number): number[] =>
  Array.from({ length: to - from + 1 }, (_, index) => from + index);
