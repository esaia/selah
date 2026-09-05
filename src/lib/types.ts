export {
  LANGS,
  LANG_LABELS,
  LANG_SPECS,
  MAX_LANGS,
  REQUIRED_LANG,
  defaultVersionOf,
  isLang,
  specOf,
  versionsOf,
} from '@/lib/bible/languages';
export type { Lang, LangSpec } from '@/lib/bible/languages';

import type { Lang } from '@/lib/bible/languages';
import type { Colorway } from '@/lib/lower3rd/colors';
import type { CustomFont } from '@/lib/projector/fonts';
import type { ScaleMode } from '@/lib/projector/looks';

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
 * One slide of a song, as the outputs receive it.
 *
 * `text` is whichever language the song lists first, and is always there.
 * `langs` carries every language the slide has — the first one included, so
 * `langs[0].text` and `text` say the same thing — with `stage` and `lower3rd`
 * naming the one each of those two outputs should read. A song with a single
 * language sends no `langs` at all, which is also what an output too old to
 * know the field falls back to reading. `lib/lyrics/langs.ts` is the only
 * thing that builds this and the only thing that reads it.
 */
export interface LyricsSlide {
  title: string;
  text: string;
  langs?: { id: string; label: string; text: string }[];
  stage?: string;
  lower3rd?: string;
}

/**
 * What the outputs render: the verses of one card, in whichever languages the
 * operator has armed. A language the slide does not carry is simply absent
 * rather than empty, which is also what makes adding a fourteenth language
 * cost nothing on the wire. When `lyrics` is present the language arrays are
 * ignored and the slide is a song slide instead, carrying the song's own
 * languages rather than the armed ones.
 *
 * Flat rather than nested because every reader already asks it for a language
 * by key, and no language code is `lyrics`.
 */
export type ShowData = Partial<Record<Lang, Verse[]>> & {
  lyrics?: LyricsSlide;
};

export const emptyShowData = (): ShowData => ({});

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
  /** Which layout the slide is drawn in; see `lib/projector/looks.ts`. */
  look: string;
  lyricsLook: string;
  /** How song text is sized: scaled to fit, or held at `lyricsSize`. */
  lyricsScale: ScaleMode;
  /** That size, as a percentage of the screen height. */
  lyricsSize: number;
  order: Lang[];
  enabled: Partial<Record<Lang, boolean>>;
  transitionMs: number;
  /**
   * The added faces this slide actually names, so the output can fetch them.
   * Only the ones in use travel: the library is the operator's, and a slide is
   * not the place to carry it.
   */
  fonts: CustomFont[];
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
  enabled: Partial<Record<Lang, boolean>>;
  transitionMs: number;
  position: 'top' | 'bottom';
  variant: string;
  lyricsVariant: string;
  /**
   * What those looks are painted in. Only what the operator has picked: an
   * empty colourway is the look's own colours, not black.
   */
  colors: Colorway;
  lyricsColors: Colorway;
  hidden: boolean;
  /** As on `ProjectorStyle`: the added faces this overlay draws, and no more. */
  fonts: CustomFont[];
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
  data: Partial<Record<Lang, (Verse | null)[]>>;
  collapsed?: boolean;
}

export type Live =
  | null
  | { kind?: undefined; blockId: string; verseIndex: number }
  | { kind: 'lyrics'; songId: string; slideIndex: number };

export interface SongSlide {
  id: string;
  /**
   * The words, in whichever language the song lists first. Always present:
   * a song with one language has only ever had this.
   */
  text: string;
  /**
   * What part of the song this is — "Chorus", "Verse 2" — in the operator's
   * own words. Optional, because a song typed in at speed on a Sunday morning
   * has none and does not need any; `lib/lyrics/groups.ts` gives it its colour.
   */
  group?: string;
  /**
   * The same line in the song's other languages, by language id. The
   * translation rides on the slide rather than in a second song so the two can
   * never fall out of step. `lib/lyrics/langs.ts` is what moves words between
   * here and `text`.
   */
  alt?: Record<string, string>;
}

/**
 * One language a song is sung in, named by the operator rather than drawn from
 * the Bible catalogue — a congregation sings in languages we hold no scripture
 * for. The id is opaque and never shown, so renaming the label leaves every
 * word where it is.
 */
export interface SongLang {
  id: string;
  label: string;
  on: boolean;
}

/**
 * A shelf the songs are filed on. A song sits on exactly one, the way a
 * document does in ProPresenter — "where does this song live" has one answer,
 * and moving it somewhere else takes it off the old shelf.
 */
export interface SongLibrary {
  id: string;
  name: string;
}

/**
 * A service in the order it is sung. Songs are referenced, not held: the same
 * song is on a dozen playlists and is still one song, and deleting a playlist
 * takes nothing but the order with it.
 */
export interface SongPlaylist {
  id: string;
  name: string;
  songs: string[];
}

/** Which of the two lists the panel is showing. */
export interface OpenList {
  kind: 'library' | 'playlist';
  id: string;
}

export interface Song {
  id: string;
  title: string;
  slides: SongSlide[];
  source?: string;
  /** The library it is filed on; the first library when it has never been filed. */
  libraryId?: string;
  /**
   * In projection order; the first is the one whose words sit in `slide.text`.
   * Absent, or a single entry, means the plain kind of song.
   */
  langs?: SongLang[];
  /** The language id the stage display reads, and the one the lower third does. */
  stageLang?: string;
  lower3rdLang?: string;
  /**
   * The one the console's own slide cards are read in — the operator's side of
   * the glass, not the room's, the way `settings.adminLang` is for verses. It
   * need not be a language that is switched on: reading the cards in Georgian
   * while the wall carries English is a normal way to run a service.
   */
  cardLang?: string;
}

/** The verses of one group, in one language, with the gaps dropped. */
export const groupVerses = (block: Block, lang: Lang, group: number[]): Verse[] =>
  (group ?? [])
    .map(number => block.data?.[lang]?.[block.verses.indexOf(number)])
    .filter((verse): verse is Verse => Boolean(verse));

export const range = (from: number, to: number): number[] =>
  Array.from({ length: to - from + 1 }, (_, index) => from + index);
