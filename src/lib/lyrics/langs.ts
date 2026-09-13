import { emptyShowData, type ShowData, type Song, type SongLang, type SongSlide } from '@/lib/types';

export const MAX_SONG_LANGS = 2;

export const PRIMARY_ID = 'primary';

export const isOriginal = (langId: string) => langId === PRIMARY_ID;

export interface StoredLangs {
  list: SongLang[];
  stage: string;
  lower3rd: string;
  cards: string;
}

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

export const songLangsRow = (song: Song): StoredLangs => ({
  list: song.langs ?? [],
  stage: song.stageLang ?? '',
  lower3rd: song.lower3rdLang ?? '',
  cards: song.cardLang ?? '',
});

export const langsOf = (song: Song): SongLang[] =>
  song.langs?.length ? song.langs : [{ id: PRIMARY_ID, label: '', on: true }];

export const armedLangs = (song: Song): SongLang[] => langsOf(song).filter(lang => lang.on);

export const isMultilingual = (song: Song): boolean => (song.langs?.length ?? 0) > 1;

const wordsOf = (song: Song, slide: SongSlide): Record<string, string> => ({
  ...slide.alt,
  [langsOf(song)[0].id]: slide.text,
});

export const textOf = (song: Song, slide: SongSlide, langId: string): string =>
  (langId === langsOf(song)[0].id ? slide.text : slide.alt?.[langId]) ?? '';

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

const withAlt = (slide: SongSlide, alt: Record<string, string>): SongSlide => {
  const next = { ...slide };

  delete next.alt;

  return Object.keys(alt).length > 0 ? { ...next, alt } : next;
};

export const hasWords = (slide: SongSlide): boolean =>
  slide.text.trim().length > 0 || Object.values(slide.alt ?? {}).some(text => text.trim().length > 0);

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

const withLangs = (song: Song, list: SongLang[]): Song => {
  const slides = rewritten(song, list);

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

export const addLang = (song: Song, lang: SongLang): Song => {
  const list = langsOf(song);

  if (list.length >= MAX_SONG_LANGS || list.some(kept => kept.id === lang.id)) return song;

  return withLangs(song, [...list, lang]);
};

export const removeLang = (song: Song, langId: string): Song => {
  const list = langsOf(song);

  if (isOriginal(langId)) return song;

  return withLangs(
    song,
    list.filter(lang => lang.id !== langId),
  );
};

export const renameLang = (song: Song, langId: string, label: string): Song => ({
  ...song,
  langs: langsOf(song).map(lang => (lang.id === langId ? { ...lang, label } : lang)),
});

export const armLang = (song: Song, langId: string, on: boolean): Song => ({
  ...song,
  langs: langsOf(song).map(lang => (lang.id === langId ? { ...lang, on } : lang)),
});

export const reorderLangs = (song: Song, ids: string[]): Song => {
  const list = langsOf(song);
  const moved = ids
    .map(id => list.find(lang => lang.id === id))
    .filter((lang): lang is SongLang => Boolean(lang))
    .filter((lang, index, all) => all.findIndex(other => other.id === lang.id) === index);

  return withLangs(song, [...moved, ...list.filter(lang => !moved.some(kept => kept.id === lang.id))]);
};

const chosen = (song: Song, pick?: string): string => {
  const armed = armedLangs(song);

  return armed.find(lang => lang.id === pick)?.id ?? armed[0]?.id ?? langsOf(song)[0].id;
};

export const stageLangOf = (song: Song): string => chosen(song, song.stageLang);

export const lower3rdLangOf = (song: Song): string => chosen(song, song.lower3rdLang);

export const cardLangOf = (song: Song): string => {
  const list = langsOf(song);

  return list.find(lang => lang.id === song.cardLang)?.id ?? armedLangs(song)[0]?.id ?? list[0].id;
};

const key = (label: string) => label.trim().toLowerCase();

export const syncSwitches = (songs: Song[], source: Song): Song[] => {
  if (!isMultilingual(source)) return [];

  const wanted = new Map(
    langsOf(source)
      .filter(lang => key(lang.label))
      .map(lang => [
        key(lang.label),
        {
          on: lang.on,
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

export const lyricBlocks = (lyrics: NonNullable<ShowData['lyrics']>): { id: string; label: string; text: string }[] =>
  lyrics.langs?.length ? lyrics.langs : [{ id: PRIMARY_ID, label: '', text: lyrics.text }];

export const lyricFor = (lyrics: NonNullable<ShowData['lyrics']>, langId?: string): string => {
  const blocks = lyricBlocks(lyrics);

  return (blocks.find(block => block.id === langId) ?? blocks[0]).text;
};
