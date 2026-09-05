import { describe, expect, it } from 'vitest';

import type { Song, SongLibrary } from '@/lib/types';

import { homeOf, songsInLibrary, songsInPlaylist } from './lists';

const libraries: SongLibrary[] = [
  { id: 'main', name: 'Library' },
  { id: 'xmas', name: 'Christmas' },
];

const song = (id: string, title: string, libraryId?: string): Song => ({ id, title, slides: [], libraryId });

const songs = [
  song('a', 'Way maker', 'main'),
  song('b', 'Silent night', 'xmas'),
  // Imported by a console that has never heard of libraries.
  song('c', 'Amazing grace'),
];

describe('songsInLibrary', () => {
  it('puts a song with no library on the first shelf', () => {
    expect(songsInLibrary(songs, libraries, 'main').map(item => item.id)).toEqual(['c', 'a']);
    expect(songsInLibrary(songs, libraries, 'xmas').map(item => item.id)).toEqual(['b']);
  });

  it('reads by title, whatever order the songs arrived in', () => {
    expect(songsInLibrary(songs, libraries, 'main').map(item => item.title)).toEqual(['Amazing grace', 'Way maker']);
  });

  it('has nothing to show for a shelf that is not there', () => {
    expect(songsInLibrary(songs, libraries, 'gone')).toEqual([]);
  });

  // With no libraries at all there is no first one, so the unfiled song has
  // nowhere to be — but a song that names its shelf is still on it.
  it('keeps a song that names its shelf, and shelves the unfiled nowhere', () => {
    expect(songsInLibrary(songs, [], 'main').map(item => item.id)).toEqual(['a']);
  });
});

describe('songsInPlaylist', () => {
  it('keeps the order the operator put them in, not the alphabet', () => {
    const list = { id: 'p', name: 'Sunday', songs: ['b', 'a'] };

    expect(songsInPlaylist(songs, list).map(item => item.id)).toEqual(['b', 'a']);
  });

  it('skips a song that has since been deleted rather than leaving a hole', () => {
    const list = { id: 'p', name: 'Sunday', songs: ['b', 'deleted', 'a'] };

    expect(songsInPlaylist(songs, list).map(item => item.id)).toEqual(['b', 'a']);
  });

  it('answers for no playlist at all', () => {
    expect(songsInPlaylist(songs, undefined)).toEqual([]);
  });
});

describe('homeOf', () => {
  it('is the first library, and nothing when there are none', () => {
    expect(homeOf(libraries)).toBe('main');
    expect(homeOf([])).toBeUndefined();
  });
});
