import type { Song, SongLibrary, SongPlaylist } from '@/lib/types';

export const homeOf = (libraries: SongLibrary[]): string | undefined => libraries[0]?.id;

export const songsInLibrary = (songs: Song[], libraries: SongLibrary[], libraryId: string): Song[] => {
  const home = homeOf(libraries);

  return songs
    .filter(song => (song.libraryId ?? home) === libraryId)
    .sort((a, b) => a.title.localeCompare(b.title));
};

export const songsInPlaylist = (songs: Song[], playlist: SongPlaylist | undefined): Song[] =>
  (playlist?.songs ?? [])
    .map(id => songs.find(song => song.id === id))
    .filter((song): song is Song => Boolean(song));
