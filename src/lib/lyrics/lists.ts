import type { Song, SongLibrary, SongPlaylist } from '@/lib/types';

/**
 * What is on a shelf, and what is in a running order.
 *
 * Two different questions wearing the same word "list". A library *holds* its
 * songs, so it is answered by looking at the songs; a playlist only *names*
 * them, so it is answered by resolving names — and a name that no longer
 * answers is skipped rather than leaving a hole in the order.
 */

/** The first library, which is where an unfiled song is taken to be. */
export const homeOf = (libraries: SongLibrary[]): string | undefined => libraries[0]?.id;

/**
 * The songs on one shelf, by title.
 *
 * A song with no library is on the first one: that is where the backfill put
 * everything already imported, and where a console that has never heard of
 * libraries files what it writes. Without that rule an older console's import
 * would land in a library the operator cannot open.
 */
export const songsInLibrary = (songs: Song[], libraries: SongLibrary[], libraryId: string): Song[] => {
  const home = homeOf(libraries);

  return songs
    .filter(song => (song.libraryId ?? home) === libraryId)
    .sort((a, b) => a.title.localeCompare(b.title));
};

/** The songs of one running order, in that order, skipping any since deleted. */
export const songsInPlaylist = (songs: Song[], playlist: SongPlaylist | undefined): Song[] =>
  (playlist?.songs ?? [])
    .map(id => songs.find(song => song.id === id))
    .filter((song): song is Song => Boolean(song));
