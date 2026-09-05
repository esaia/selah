import { describe, expect, it } from 'vitest';

import type { Song, SongLang } from '@/lib/types';

import {
  addLang,
  armLang,
  armedLangs,
  cardLangOf,
  asSongLangs,
  hasWords,
  langsOf,
  lower3rdLangOf,
  lyricBlocks,
  lyricFor,
  lyricsShowData,
  MAX_SONG_LANGS,
  PRIMARY_ID,
  removeLang,
  renameLang,
  reorderLangs,
  stageLangOf,
  syncSwitches,
  textOf,
  withText,
} from './langs';

const ka: SongLang = { id: 'ka', label: 'ქართული', on: true };
const en: SongLang = { id: 'en', label: 'English', on: true };

/** A song of two slides in one language — every song, before any of this. */
const plain = (): Song => ({
  id: 'song',
  title: 'შენ ხარ ღირსი',
  slides: [
    { id: 'a', text: 'შენ ხარ ღირსი', group: 'Verse 1' },
    { id: 'b', text: 'დიდება შენ' },
  ],
});

/** The same song, sung in two. */
const bilingual = (): Song => ({
  ...plain(),
  langs: [ka, en],
  slides: [
    { id: 'a', text: 'შენ ხარ ღირსი', group: 'Verse 1', alt: { en: 'You are worthy' } },
    { id: 'b', text: 'დიდება შენ', alt: { en: 'Glory to you' } },
  ],
});

describe('asSongLangs', () => {
  it('reads nothing at all as no languages', () => {
    for (const value of [null, undefined, {}, 'nonsense']) {
      expect(asSongLangs(value)).toEqual({ list: [], stage: '', lower3rd: '', cards: '' });
    }
  });

  it('drops an entry it cannot use, and a second copy of one it can', () => {
    const { list } = asSongLangs({
      list: [ka, { label: 'no id' }, { id: 'x' }, null, { ...en, id: 'ka' }, en],
    });

    expect(list.map(lang => lang.id)).toEqual(['ka', 'en']);
  });

  it('takes a missing switch as on', () => {
    expect(asSongLangs({ list: [{ id: 'ka', label: 'ქართული' }] }).list[0].on).toBe(true);
    expect(asSongLangs({ list: [{ id: 'ka', label: 'ქართული', on: 'yes' }] }).list[0].on).toBe(true);
    expect(asSongLangs({ list: [{ ...ka, on: false }] }).list[0].on).toBe(false);
  });

  it('stops at the ceiling', () => {
    const many = Array.from({ length: 6 }, (_, index) => ({ id: `l${index}`, label: `L${index}`, on: true }));

    expect(asSongLangs({ list: many }).list).toHaveLength(MAX_SONG_LANGS);
  });

  it('clears a pick naming a language that is no longer listed', () => {
    expect(asSongLangs({ list: [ka, en], stage: 'ka', lower3rd: 'ru', cards: 'en' })).toEqual({
      list: [ka, en],
      stage: 'ka',
      lower3rd: '',
      cards: 'en',
    });
  });
});

describe('langsOf', () => {
  it('gives a song that has never been asked one language all the same', () => {
    expect(langsOf(plain())).toEqual([{ id: PRIMARY_ID, label: '', on: true }]);
  });

  it('keeps the operator’s order', () => {
    expect(langsOf(bilingual()).map(lang => lang.id)).toEqual(['ka', 'en']);
  });
});

describe('textOf and withText', () => {
  it('reads the first language off the slide itself and the rest off alt', () => {
    const song = bilingual();

    expect(textOf(song, song.slides[0], 'ka')).toBe('შენ ხარ ღირსი');
    expect(textOf(song, song.slides[0], 'en')).toBe('You are worthy');
    expect(textOf(song, song.slides[0], 'ru')).toBe('');
  });

  it('reads a plain song through its implicit language', () => {
    const song = plain();

    expect(textOf(song, song.slides[0], PRIMARY_ID)).toBe('შენ ხარ ღირსი');
  });

  it('writes the first language into text and the rest into alt', () => {
    const song = bilingual();

    expect(withText(song, song.slides[0], 'ka', 'ახალი').text).toBe('ახალი');
    expect(withText(song, song.slides[0], 'en', 'Worthy').alt).toEqual({ en: 'Worthy' });
  });

  it('drops a language the operator empties rather than leaving a blank behind', () => {
    const song = bilingual();
    const emptied = withText(song, song.slides[0], 'en', '   ');

    expect(emptied.alt).toBeUndefined();
    expect(emptied.text).toBe('შენ ხარ ღირსი');
    expect(emptied.group).toBe('Verse 1');
  });
});

describe('hasWords', () => {
  it('counts a slide that has words in any language at all', () => {
    expect(hasWords({ id: 'a', text: 'შენ ხარ ღირსი' })).toBe(true);
    expect(hasWords({ id: 'a', text: '  ', alt: { en: 'You are worthy' } })).toBe(true);
    expect(hasWords({ id: 'a', text: '' })).toBe(false);
    expect(hasWords({ id: 'a', text: ' ', alt: { en: '  ' } })).toBe(false);
  });
});

describe('addLang', () => {
  it('names the language the song already had, and leaves every word where it is', () => {
    const added = addLang(plain(), en);

    expect(added.langs).toEqual([{ id: PRIMARY_ID, label: '', on: true }, en]);
    expect(added.slides.map(slide => slide.text)).toEqual(['შენ ხარ ღირსი', 'დიდება შენ']);
    expect(added.slides[0].group).toBe('Verse 1');
  });

  it('refuses a fourth, and refuses one it already has', () => {
    const three = addLang(addLang(plain(), en), { id: 'ru', label: 'Русский', on: true });

    expect(langsOf(three)).toHaveLength(MAX_SONG_LANGS);
    expect(addLang(three, { id: 'la', label: 'Latina', on: true })).toBe(three);
    expect(addLang(bilingual(), en)).toEqual(bilingual());
  });
});

describe('removeLang', () => {
  it('takes a language’s words off every slide', () => {
    const song = addLang(bilingual(), { id: 'ru', label: 'Русский', on: true });
    const left = removeLang(song, 'en');

    expect(langsOf(left).map(lang => lang.id)).toEqual(['ka', 'ru']);
    expect(left.slides[0].alt).toBeUndefined();
    expect(left.slides[0].text).toBe('შენ ხარ ღირსი');
  });

  // The words in `text` are the song itself. Dropping the language that holds
  // them would promote a half-typed translation over them and throw them away,
  // which reads as the song vanishing.
  it('refuses to drop the first language, words and all', () => {
    expect(removeLang(bilingual(), 'ka')).toEqual(bilingual());
  });

  it('drops the old first language once another has been dragged in front', () => {
    const moved = reorderLangs(bilingual(), ['en', 'ka']);
    const left = removeLang(moved, 'ka');

    expect(left.slides.map(slide => slide.text)).toEqual(['You are worthy', 'Glory to you']);
    expect(left.slides.every(slide => slide.alt === undefined)).toBe(true);
  });

  it('takes a song back to the plain kind when one language is left', () => {
    const left = removeLang(bilingual(), 'en');

    expect(left.langs).toEqual([ka]);
    expect(left.slides).toEqual(plain().slides);
    expect(left.stageLang).toBeUndefined();
  });

  it('clears a pick that named it', () => {
    const song = addLang({ ...bilingual(), stageLang: 'en', lower3rdLang: 'ka' }, {
      id: 'ru',
      label: 'Русский',
      on: true,
    });

    const left = removeLang(song, 'en');

    expect(left.stageLang).toBeUndefined();
    expect(left.lower3rdLang).toBe('ka');
  });
});

describe('renameLang', () => {
  it('changes the label and nothing else', () => {
    const renamed = renameLang(bilingual(), 'en', 'English (singing)');

    expect(renamed.langs?.[1]).toEqual({ id: 'en', label: 'English (singing)', on: true });
    expect(renamed.slides).toEqual(bilingual().slides);
  });
});

describe('reorderLangs', () => {
  it('leaves the slides alone when the first language does not move', () => {
    const song = addLang(bilingual(), { id: 'ru', label: 'Русский', on: true });
    const moved = reorderLangs(song, ['ka', 'ru', 'en']);

    expect(moved.slides.map(slide => slide.text)).toEqual(song.slides.map(slide => slide.text));
  });

  it('moves the words when a different language comes first', () => {
    const moved = reorderLangs(bilingual(), ['en', 'ka']);

    expect(moved.slides[0].text).toBe('You are worthy');
    expect(moved.slides[0].alt).toEqual({ ka: 'შენ ხარ ღირსი' });
    expect(moved.slides[0].group).toBe('Verse 1');
  });

  it('promotes a language a slide has nothing for without inventing words', () => {
    const song: Song = { ...bilingual(), slides: [{ id: 'a', text: 'შენ ხარ ღირსი' }] };
    const moved = reorderLangs(song, ['en', 'ka']);

    expect(moved.slides[0].text).toBe('');
    expect(moved.slides[0].alt).toEqual({ ka: 'შენ ხარ ღირსი' });
  });

  it('ignores an id it does not know and keeps one left out', () => {
    const moved = reorderLangs(bilingual(), ['en', 'ru']);

    expect(langsOf(moved).map(lang => lang.id)).toEqual(['en', 'ka']);
  });
});

describe('the picks', () => {
  it('reads the operator’s choice while it is on', () => {
    const song = { ...bilingual(), stageLang: 'en', lower3rdLang: 'ka' };

    expect(stageLangOf(song)).toBe('en');
    expect(lower3rdLangOf(song)).toBe('ka');
  });

  it('falls back to the first one still on, keeping the choice for later', () => {
    const song = armLang({ ...bilingual(), stageLang: 'en' }, 'en', false);

    expect(armedLangs(song).map(lang => lang.id)).toEqual(['ka']);
    expect(stageLangOf(song)).toBe('ka');
    expect(stageLangOf(armLang(song, 'en', true))).toBe('en');
  });

  it('answers for a plain song too', () => {
    expect(stageLangOf(plain())).toBe(PRIMARY_ID);
  });
});

describe('cardLangOf', () => {
  it('reads the cards in a language the wall is not carrying', () => {
    const song = armLang({ ...bilingual(), cardLang: 'en' }, 'en', false);

    expect(cardLangOf(song)).toBe('en');
    expect(stageLangOf(song)).toBe('ka');
  });

  it('follows the projector until the operator says otherwise', () => {
    expect(cardLangOf(bilingual())).toBe('ka');
    expect(cardLangOf(armLang(bilingual(), 'ka', false))).toBe('en');
    expect(cardLangOf(plain())).toBe(PRIMARY_ID);
  });
});

describe('syncSwitches', () => {
  /** The same two languages, named the same way, in another song. */
  const other = (): Song => ({
    id: 'other',
    title: 'აკურთხე',
    langs: [
      { id: 'x', label: 'English', on: true },
      { id: 'y', label: 'ქართული', on: true },
    ],
    slides: [{ id: 's', text: 'Bless the Lord', alt: { y: 'აკურთხე' } }],
  });

  it('throws the same switch on every song that uses the name', () => {
    const source = armLang({ ...bilingual(), stageLang: 'ka', lower3rdLang: 'en' }, 'en', false);
    const [changed] = syncSwitches([bilingual(), other()], source);

    expect(changed.id).toBe('other');
    expect(changed.langs).toEqual([
      { id: 'x', label: 'English', on: false },
      { id: 'y', label: 'ქართული', on: true },
    ]);
    expect(changed.stageLang).toBe('y');
    expect(changed.lower3rdLang).toBe('x');
  });

  it('matches a name however it was typed', () => {
    const source = armLang({ ...bilingual(), langs: [ka, { ...en, label: '  ENGLISH ' }] }, 'en', false);

    expect(syncSwitches([other()], source)[0].langs?.[0].on).toBe(false);
  });

  it('leaves a song alone when nothing about it would change', () => {
    expect(syncSwitches([other()], bilingual())).toEqual([]);
    expect(syncSwitches([other()], plain())).toEqual([]);
  });

  it('matches nothing on a language with no name yet', () => {
    const source = armLang({ ...bilingual(), langs: [ka, { id: 'en', label: '', on: true }] }, 'en', false);

    expect(syncSwitches([other()], source)).toEqual([]);
  });

  it('does not copy a pick the operator never made', () => {
    // `stageLang` unset reads as the first language on, but that is a
    // fallback rather than a choice, so nothing is copied from it.
    const source = armLang(bilingual(), 'en', false);

    expect(syncSwitches([other()], source)[0].stageLang).toBeUndefined();
  });

  it('leaves the words and the names where they are', () => {
    const source = armLang({ ...bilingual(), stageLang: 'ka' }, 'en', false);
    const [changed] = syncSwitches([other()], source);

    expect(changed.slides).toEqual(other().slides);
    expect(changed.langs?.map(lang => lang.label)).toEqual(['English', 'ქართული']);
  });
});

describe('lyricsShowData', () => {
  it('sends a plain song exactly what it has always sent', () => {
    const song = plain();

    expect(lyricsShowData(song, song.slides[0])).toEqual({
      lyrics: { title: 'შენ ხარ ღირსი', text: 'შენ ხარ ღირსი' },
    });
  });

  it('sends both languages, with the first one repeated as text', () => {
    const song = { ...bilingual(), stageLang: 'ka', lower3rdLang: 'en' };
    const { lyrics } = lyricsShowData(song, song.slides[0]);

    expect(lyrics?.langs).toEqual([
      { id: 'ka', label: 'ქართული', text: 'შენ ხარ ღირსი' },
      { id: 'en', label: 'English', text: 'You are worthy' },
    ]);
    expect(lyrics?.text).toBe(lyrics?.langs?.[0].text);
    expect(lyrics).toMatchObject({ stage: 'ka', lower3rd: 'en' });
  });

  it('leaves out a language that is switched off', () => {
    const song = armLang(bilingual(), 'en', false);

    expect(lyricsShowData(song, song.slides[0]).lyrics?.langs?.map(block => block.id)).toEqual(['ka']);
  });

  it('leaves out a language this slide has no words for', () => {
    const song: Song = { ...bilingual(), slides: [{ id: 'a', text: 'შენ ხარ ღირსი' }] };

    expect(lyricsShowData(song, song.slides[0]).lyrics?.langs?.map(block => block.id)).toEqual(['ka']);
  });

  it('keeps text non-empty when the first language is the one missing', () => {
    const song: Song = { ...bilingual(), slides: [{ id: 'a', text: '', alt: { en: 'You are worthy' } }] };

    expect(lyricsShowData(song, song.slides[0]).lyrics?.text).toBe('You are worthy');
  });
});

describe('lyricBlocks and lyricFor', () => {
  it('reads a payload from before any of this as one language', () => {
    const lyrics = { title: 'Song', text: 'One line' };

    expect(lyricBlocks(lyrics)).toEqual([{ id: PRIMARY_ID, label: '', text: 'One line' }]);
    expect(lyricFor(lyrics, 'en')).toBe('One line');
  });

  it('picks the language it was pointed at, and the first one otherwise', () => {
    const song = { ...bilingual(), stageLang: 'en' };
    const { lyrics } = lyricsShowData(song, song.slides[0]);

    expect(lyricFor(lyrics!, lyrics!.stage)).toBe('You are worthy');
    expect(lyricFor(lyrics!, 'ru')).toBe('შენ ხარ ღირსი');
    expect(lyricFor(lyrics!)).toBe('შენ ხარ ღირსი');
  });
});
