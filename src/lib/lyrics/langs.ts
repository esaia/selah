import { emptyShowData, type ShowData, type Song, type SongLang, type SongSlide } from '@/lib/types';

/**
 * The languages a song is sung in.
 *
 * Not the Bible catalogue: a congregation sings in languages we hold no
 * scripture for, so a song's languages are the operator's own words rather
 * than a row in `lib/bible/languages.json`. What that costs is a stable id —
 * a label is renamed on a Sunday morning, and renaming it must not move a word
 * of text.
 *
 * The words themselves live on the slide, never in a second song, so the two
 * languages of a line cannot drift apart: `slide.text` is always whichever
 * language sits first, and `slide.alt` holds the rest by id. That is what
 * makes a song written before any of this — and every song a ProPresenter
 * bundle imports — a song with one language and nothing else to say.
 */

/** Three blocks of text is what a projector at the back of a hall can hold. */
export const MAX_SONG_LANGS = 3;

/**
 * The id of the language a song already had before it was given any. It only
 * has to be unique within the song; nothing reads it as a name, and a reorder
 * can move it off the front like any other.
 */
export const PRIMARY_ID = 'primary';

/** The languages as stored, alongside the two picks. */
export interface StoredLangs {
  list: SongLang[];
  stage: string;
  lower3rd: string;
  cards: string;
}

/**
 * What the database gave back, cleaned up.
 *
 * A song row outlives the console that wrote it, and the column is free-form
 * JSON — so an entry with no id, a duplicate of one already listed, or a pick
 * naming a language that has since been removed is dropped here rather than
 * halfway down a render. Mirrors `asOrder`/`asFlags` in `lib/studio/settings.ts`.
 */
export const asSongLangs = (value: unknown): StoredLangs => {
  const stored = (value ?? {}) as { list?: unknown; stage?: unknown; lower3rd?: unknown; cards?: unknown };
  const listed = Array.isArray(stored.list) ? stored.list : [];

  const list: SongLang[] = [];

  for (const entry of listed) {
    if (list.length >= MAX_SONG_LANGS) break;

    const lang = (entry ?? {}) as Partial<SongLang>;

    if (typeof lang.id !== 'string' || !lang.id) continue;
    if (typeof lang.label !== 'string') continue;
    if (list.some(kept => kept.id === lang.id)) continue;

    list.push({ id: lang.id, label: lang.label, on: typeof lang.on === 'boolean' ? lang.on : true });
  }

  const pick = (value: unknown): string =>
    typeof value === 'string' && list.some(lang => lang.id === value) ? value : '';

  return { list, stage: pick(stored.stage), lower3rd: pick(stored.lower3rd), cards: pick(stored.cards) };
};

/**
 * A song row as the console holds it. The words are already in `slides`; this
 * only has to put the list and the picks back where the rest of the app reads
 * them, and leave a plain song looking exactly like one.
 */
export const songFromRow = (row: {
  id: string;
  title: string;
  slides: unknown;
  source?: string | null;
  langs?: unknown;
  library_id?: string | null;
}): Song => {
  const { list, stage, lower3rd, cards } = asSongLangs(row.langs);

  return {
    id: row.id,
    title: row.title,
    slides: (row.slides ?? []) as SongSlide[],
    source: row.source ?? undefined,
    libraryId: row.library_id ?? undefined,
    langs: list.length > 0 ? list : undefined,
    stageLang: stage || undefined,
    lower3rdLang: lower3rd || undefined,
    cardLang: cards || undefined,
  };
};

/** What the `langs` column holds. */
export const songLangsRow = (song: Song): StoredLangs => ({
  list: song.langs ?? [],
  stage: song.stageLang ?? '',
  lower3rd: song.lower3rdLang ?? '',
  cards: song.cardLang ?? '',
});

/** The song's languages, in the order they are projected. */
export const langsOf = (song: Song): SongLang[] =>
  song.langs?.length ? song.langs : [{ id: PRIMARY_ID, label: '', on: true }];

/** The ones the operator has switched on, in that same order. */
export const armedLangs = (song: Song): SongLang[] => langsOf(song).filter(lang => lang.on);

/** Has this song been given languages at all, or is it the plain kind? */
export const isMultilingual = (song: Song): boolean => (song.langs?.length ?? 0) > 1;

/** Every language's words for one slide, by id. */
const wordsOf = (song: Song, slide: SongSlide): Record<string, string> => ({
  ...slide.alt,
  [langsOf(song)[0].id]: slide.text,
});

/** One language's words for one slide. */
export const textOf = (song: Song, slide: SongSlide, langId: string): string =>
  (langId === langsOf(song)[0].id ? slide.text : slide.alt?.[langId]) ?? '';

/**
 * The slide with one language's words replaced. Emptying a language drops it
 * from the slide rather than leaving a blank behind — a slide carries only the
 * languages it has.
 */
export const withText = (song: Song, slide: SongSlide, langId: string, text: string): SongSlide => {
  if (langId === langsOf(song)[0].id) return { ...slide, text };

  const alt = { ...slide.alt };

  if (text.trim()) {
    alt[langId] = text;
  } else {
    delete alt[langId];
  }

  return withAlt(slide, alt);
};

/** The slide carrying exactly these other languages, and no empty `alt` key. */
const withAlt = (slide: SongSlide, alt: Record<string, string>): SongSlide => {
  const next = { ...slide };

  delete next.alt;

  return Object.keys(alt).length > 0 ? { ...next, alt } : next;
};

/** Does this slide say anything, in any of the song's languages? */
export const hasWords = (slide: SongSlide): boolean =>
  slide.text.trim().length > 0 || Object.values(slide.alt ?? {}).some(text => text.trim().length > 0);

/**
 * Every slide rewritten so the first language's words sit in `text`.
 *
 * The one place that moves words between the two homes, so removing a language
 * and reordering them share it. A language the slide had nothing for stays
 * nothing — including when it is the one being promoted, which leaves a slide
 * with an empty first language and its words still in `alt`, exactly as the
 * operator left it.
 */
const rewritten = (song: Song, next: SongLang[]): SongSlide[] => {
  const first = next[0]?.id ?? PRIMARY_ID;

  return song.slides.map(slide => {
    const words = wordsOf(song, slide);
    const alt: Record<string, string> = {};

    for (const lang of next.slice(1)) {
      if (words[lang.id]) alt[lang.id] = words[lang.id];
    }

    return withAlt({ ...slide, text: words[first] ?? '' }, alt);
  });
};

/** The song with `list` as its languages, and the picks it can still keep. */
const withLangs = (song: Song, list: SongLang[]): Song => {
  const slides = rewritten(song, list);

  // One language is no language: the song goes back to being the plain kind,
  // which is what every reader that has never heard of this already draws.
  if (list.length <= 1) {
    return {
      ...song,
      slides,
      langs: list.length === 1 ? list : undefined,
      stageLang: undefined,
      lower3rdLang: undefined,
      cardLang: undefined,
    };
  }

  const held = (pick?: string) => (list.some(lang => lang.id === pick) ? pick : undefined);

  return {
    ...song,
    slides,
    langs: list,
    stageLang: held(song.stageLang),
    lower3rdLang: held(song.lower3rdLang),
    cardLang: held(song.cardLang),
  };
};

/** A language added at the end, if there is room for it. */
export const addLang = (song: Song, lang: SongLang): Song => {
  const list = langsOf(song);

  if (list.length >= MAX_SONG_LANGS || list.some(kept => kept.id === lang.id)) return song;

  return withLangs(song, [...list, lang]);
};

/**
 * A language dropped, and its words with it.
 *
 * The first one stays. It is the song itself — the words a `.pro` import or a
 * paste put there, held in `slide.text` — and removing it would promote a
 * translation that may be half typed into its place and throw the original
 * away, which is a song disappearing rather than a language being removed. To
 * be rid of it, drag another language to the front first: that moves the words
 * rather than discarding them, and then the old one is a translation like any
 * other.
 */
export const removeLang = (song: Song, langId: string): Song => {
  const list = langsOf(song);

  if (list[0]?.id === langId) return song;

  return withLangs(
    song,
    list.filter(lang => lang.id !== langId),
  );
};

/** A new label for a language. The id and every word stay where they are. */
export const renameLang = (song: Song, langId: string, label: string): Song => ({
  ...song,
  langs: langsOf(song).map(lang => (lang.id === langId ? { ...lang, label } : lang)),
});

/** A language switched on or off. */
export const armLang = (song: Song, langId: string, on: boolean): Song => ({
  ...song,
  langs: langsOf(song).map(lang => (lang.id === langId ? { ...lang, on } : lang)),
});

/**
 * The languages in a new order, tolerating a list that has drifted — unknown
 * ids ignored, omitted ones kept on the end — the way `asOrder` does.
 */
export const reorderLangs = (song: Song, ids: string[]): Song => {
  const list = langsOf(song);
  const moved = ids
    .map(id => list.find(lang => lang.id === id))
    .filter((lang): lang is SongLang => Boolean(lang))
    .filter((lang, index, all) => all.findIndex(other => other.id === lang.id) === index);

  return withLangs(song, [...moved, ...list.filter(lang => !moved.some(kept => kept.id === lang.id))]);
};

/**
 * The language an output that shows one of them reads: the operator's pick
 * while it is still on, and the first one still on otherwise. The pick is kept
 * either way, so switching a language back on restores it — the same bargain
 * `stageLangOf` in `lib/studio/settings.ts` makes for verses.
 */
const chosen = (song: Song, pick?: string): string => {
  const armed = armedLangs(song);

  return armed.find(lang => lang.id === pick)?.id ?? armed[0]?.id ?? langsOf(song)[0].id;
};

export const stageLangOf = (song: Song): string => chosen(song, song.stageLang);

export const lower3rdLangOf = (song: Song): string => chosen(song, song.lower3rdLang);

/**
 * The language the console's own cards are read in.
 *
 * Unlike the two output picks this does not have to be switched on: the
 * operator reads the cards in the language they think in, and what the room
 * sees is a separate question. Falls back to whatever leads the projector.
 */
export const cardLangOf = (song: Song): string => {
  const list = langsOf(song);

  return list.find(lang => lang.id === song.cardLang)?.id ?? armedLangs(song)[0]?.id ?? list[0].id;
};

/** Two languages are the same language when the operator has given them the same name. */
const key = (label: string) => label.trim().toLowerCase();

/**
 * Every other song wearing the same switches, where the names agree.
 *
 * A bilingual service is a dozen songs with the same two languages in them,
 * and setting "English on, Georgian to the stage" a dozen times is the sort of
 * thing an operator does once and then forgets on the thirteenth. So a switch
 * thrown on one song is thrown on every song that calls a language by the same
 * name — which is exactly the operator's own statement that they are the same
 * language, since nothing else in a free-form name can say so.
 *
 * Only the switches travel: which languages are on, and which of them the
 * stage and the lower third read. The words, the order and the names
 * themselves stay each song's own. A language with no name yet matches
 * nothing, or every unnamed row in the library would move at once.
 *
 * Returns only the songs that actually change, so the caller writes nothing it
 * does not have to.
 */
export const syncSwitches = (songs: Song[], source: Song): Song[] => {
  if (!isMultilingual(source)) return [];

  const wanted = new Map(
    langsOf(source)
      .filter(lang => key(lang.label))
      .map(lang => [
        key(lang.label),
        {
          on: lang.on,
          // The stored pick, never the fallback: a song whose pick has been
          // switched off reads as the first one on, and copying that would
          // write a choice the operator never made.
          stage: lang.id === source.stageLang,
          lower3rd: lang.id === source.lower3rdLang,
        },
      ]),
  );

  const changed: Song[] = [];

  for (const song of songs) {
    if (song.id === source.id || !isMultilingual(song)) continue;

    let stageLang = song.stageLang;
    let lower3rdLang = song.lower3rdLang;

    const langs = langsOf(song).map(lang => {
      const match = wanted.get(key(lang.label));

      if (!match) return lang;

      if (match.stage) stageLang = lang.id;
      if (match.lower3rd) lower3rdLang = lang.id;

      return lang.on === match.on ? lang : { ...lang, on: match.on };
    });

    const next: Song = { ...song, langs, stageLang, lower3rdLang };

    if (JSON.stringify(songLangsRow(next)) !== JSON.stringify(songLangsRow(song))) changed.push(next);
  }

  return changed;
};

/**
 * One slide as the outputs receive it.
 *
 * The only place `showData.lyrics` is built. Every language that is on and has
 * words for this slide travels, and each output narrows — the projector stacks
 * them, the stage and the lower third take the one they were pointed at. A
 * song with one language sends what it has always sent, down to the absent
 * `langs` key, so nothing about an ordinary song changes on the wire.
 *
 * `text` stays the first language's words either way. `/show`, `/lower3rd` and
 * `/stage` are unattended pages that stay open across a deploy, and a
 * `session_state` row outlives the console that wrote it — an output that has
 * never heard of `langs` shows one language rather than a blank wall.
 */
export const lyricsShowData = (song: Song, slide: SongSlide): ShowData => {
  const blocks = armedLangs(song)
    .map(lang => ({ id: lang.id, label: lang.label, text: textOf(song, slide, lang.id) }))
    .filter(block => block.text.trim().length > 0);

  if (!isMultilingual(song) || blocks.length === 0) {
    return { ...emptyShowData(), lyrics: { title: song.title, text: slide.text } };
  }

  return {
    ...emptyShowData(),
    lyrics: {
      title: song.title,
      text: blocks[0].text,
      langs: blocks,
      stage: stageLangOf(song),
      lower3rd: lower3rdLangOf(song),
    },
  };
};

/** One slide's languages as an output draws them, newest shape or oldest. */
export const lyricBlocks = (lyrics: NonNullable<ShowData['lyrics']>): { id: string; label: string; text: string }[] =>
  lyrics.langs?.length ? lyrics.langs : [{ id: PRIMARY_ID, label: '', text: lyrics.text }];

/** The words an output showing one language should draw. */
export const lyricFor = (lyrics: NonNullable<ShowData['lyrics']>, langId?: string): string => {
  const blocks = lyricBlocks(lyrics);

  return (blocks.find(block => block.id === langId) ?? blocks[0]).text;
};
