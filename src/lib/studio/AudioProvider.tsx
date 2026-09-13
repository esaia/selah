'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react';

import { isAudioFile, loadLocalFile, loadLocalFiles, saveLocalFile, titleFromName } from '@/lib/media/localMedia';
import { supabase } from '@/lib/supabase/client';
import { useStudio } from '@/lib/studio/StudioProvider';
import { save } from '@/lib/supabase/save';

export interface Track {
  id: string;
  title: string;
  artist: string;
  src?: string | null;
  localId?: string | null;
  categoryId?: string | null;
  durationMs?: number | null;
  position: number;
  libraryPosition: number;
}

export interface Category {
  id: string;
  name: string;
  position: number;
}

export type Repeat = 'off' | 'one' | 'all';

const REPEAT_NEXT: Record<Repeat, Repeat> = { off: 'all', all: 'one', one: 'off' };

const DEFAULT_FADE_MS = 700;
const FADE_STEP_MS = 40;
const PROBE_TIMEOUT_MS = 8000;

const RESUME_KEY = 'studioAudioResume';

interface Resume {
  id: string;
  seconds: number;
}

const resumeListeners = new Set<() => void>();
let resumeSnapshot: Resume | null | undefined;

const resumeStore = {
  subscribe: (listener: () => void) => {
    resumeListeners.add(listener);
    return () => {
      resumeListeners.delete(listener);
    };
  },
  get: (): Resume | null => {
    if (resumeSnapshot !== undefined) return resumeSnapshot;

    try {
      const stored = JSON.parse(localStorage.getItem(RESUME_KEY) ?? 'null') as Resume | null;

      resumeSnapshot = stored && typeof stored.id === 'string' && Number.isFinite(stored.seconds) ? stored : null;
    } catch {
      resumeSnapshot = null;
    }

    return resumeSnapshot;
  },
  getServer: (): Resume | null => null,
  set: (next: Resume | null) => {
    resumeSnapshot = next;

    try {
      if (next) localStorage.setItem(RESUME_KEY, JSON.stringify(next));
      else localStorage.removeItem(RESUME_KEY);
    } catch {
    }

    resumeListeners.forEach(listener => listener());
  },
};

const startAtSeconds = (audio: HTMLAudioElement, seconds: number) => {
  if (!seconds) return;

  if (audio.readyState >= 1) {
    audio.currentTime = seconds;
    return;
  }

  audio.addEventListener('loadedmetadata', () => {
    audio.currentTime = seconds;
  }, { once: true });
};

interface AudioValue {
  tracks: Track[];
  categories: Category[];
  current: Track | null;
  playing: boolean;
  position: number;
  duration: number;
  volume: number;
  repeat: Repeat;
  muted: boolean;
  fadeMs: number;
  missing: Set<string>;
  error: string;

  addUrlTrack: (input: { title: string; src: string }) => Promise<void>;
  addLocalFiles: (files: Iterable<File>) => Promise<Track[]>;
  removeTrack: (id: string) => Promise<void>;
  trackList: (libraryId: string | null) => Track[];
  moveTrack: (id: string, beforeId: string | null, libraryId: string | null) => Promise<void>;
  setTrackCategory: (id: string, categoryId: string | null) => Promise<void>;
  addCategory: (name: string) => Promise<void>;
  renameCategory: (id: string, name: string) => Promise<void>;
  removeCategory: (id: string) => Promise<void>;
  moveCategory: (id: string, beforeId: string | null) => Promise<void>;

  play: (track: Track, from?: string | null) => void;
  playTrack: (track: Track, from?: string | null) => void;
  togglePlay: () => void;
  stop: () => void;
  seek: (seconds: number) => void;
  setVolume: (value: number) => void;
  cycleRepeat: () => void;
  toggleMute: () => void;
  setFadeMs: (value: number) => void;
}

const AudioContext = createContext<AudioValue | null>(null);

export const useAudio = () => {
  const value = useContext(AudioContext);

  if (!value) throw new Error('useAudio must be used inside AudioProvider');

  return value;
};

export interface AudioInitial {
  userId: string;
  tracks: Track[];
  categories: Category[];
}

export const AudioProvider = ({ initial, children }: { initial: AudioInitial; children: ReactNode }) => {
  const db = useMemo(() => supabase(), []);
  const { room, noteLimit } = useStudio();
  const element = useRef<HTMLAudioElement>(null);
  const fadeTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const objectUrls = useRef(new Map<string, string>());
  const probed = useRef(new Set<string>());
  const rememberedAt = useRef(-1);
  const startedFrom = useRef<string | null>(null);
  const lastPosition = useRef(Math.max(0, ...initial.tracks.map(track => track.position)));
  const lastCategoryPosition = useRef(Math.max(0, ...initial.categories.map(category => category.position)));

  const [tracks, setTracks] = useState<Track[]>(initial.tracks);
  const [libraries, setLibraries] = useState<Category[]>(initial.categories);
  const [chosen, setChosen] = useState<Track | null>(null);
  const [playing, setPlaying] = useState(false);
  const [played, setPlayed] = useState(0);
  const [ran, setRan] = useState(0);
  const [volume, setVolumeState] = useState(0.8);
  const [repeat, setRepeat] = useState<Repeat>('off');
  const [muted, setMuted] = useState(false);
  const [fadeMs, setFadeMsState] = useState(DEFAULT_FADE_MS);
  const [missing, setMissing] = useState<Set<string>>(new Set());
  const [error, setError] = useState('');

  const remember = useCallback((track: Track | null, seconds: number) => {
    rememberedAt.current = Math.floor(seconds);
    resumeStore.set(track ? { id: track.id, seconds } : null);
  }, []);

  const stored = useSyncExternalStore(resumeStore.subscribe, resumeStore.get, resumeStore.getServer);
  const cued = chosen === null && stored ? (tracks.find(track => track.id === stored.id) ?? null) : null;

  const current = chosen ?? cued;
  const position = cued ? (stored?.seconds ?? 0) : played;
  const duration = cued ? (cued.durationMs ?? 0) / 1000 : ran;

  useEffect(() => {
    void loadLocalFiles()
      .then(stored => {
        const held = new Set(stored.map(record => record.id));

        setMissing(
          new Set(
            tracks.filter(track => track.localId && !held.has(track.localId)).map(track => track.id),
          ),
        );
      })
      .catch(() => {});
  }, [tracks]);

  useEffect(() => {
    const urls = objectUrls.current;

    return () => {
      urls.forEach(url => URL.revokeObjectURL(url));
      urls.clear();
    };
  }, []);

  const stopFade = () => {
    if (fadeTimer.current) {
      clearInterval(fadeTimer.current);
      fadeTimer.current = null;
    }
  };

  const fadeTo = useCallback(
    (target: number, done?: () => void) => {
      const audio = element.current;

      if (!audio) return;

      stopFade();

      if (fadeMs === 0) {
        audio.volume = target;
        done?.();
        return;
      }

      const steps = Math.max(1, Math.round(fadeMs / FADE_STEP_MS));
      const delta = (target - audio.volume) / steps;
      let remaining = steps;

      fadeTimer.current = setInterval(() => {
        remaining -= 1;
        audio.volume = Math.min(1, Math.max(0, audio.volume + delta));

        if (remaining <= 0) {
          stopFade();
          audio.volume = target;
          done?.();
        }
      }, FADE_STEP_MS);
    },
    [fadeMs],
  );

  const sourceFor = useCallback(async (track: Track): Promise<string | null> => {
    if (track.src) return track.src;
    if (!track.localId) return null;

    const cached = objectUrls.current.get(track.localId);

    if (cached) return cached;

    const record = await loadLocalFile(track.localId).catch(() => null);

    if (!record?.file) return null;

    const url = URL.createObjectURL(record.file);
    objectUrls.current.set(track.localId, url);

    return url;
  }, []);

  const play = useCallback(
    (track: Track, from?: string | null) => {
      const audio = element.current;

      if (!audio) return;

      if (from !== undefined) startedFrom.current = from;

      setError('');

      void (async () => {
        const source = await sourceFor(track);

        if (!source) {
          setError(`“${track.title}” is on another computer.`);
          return;
        }

        const cue = resumeStore.get();
        const startAt = chosen === null && cue?.id === track.id ? cue.seconds : 0;

        audio.src = source;
        startAtSeconds(audio, startAt);
        audio.volume = fadeMs === 0 ? volume : 0;
        setChosen(track);
        remember(track, startAt);

        setPlaying(true);

        try {
          await audio.play();
          fadeTo(volume);
        } catch {
          setPlaying(false);
          setError('The browser blocked playback. Click once on the page and try again.');
        }
      })();
    },
    [chosen, fadeMs, fadeTo, remember, sourceFor, volume],
  );

  const stop = useCallback(() => {
    const audio = element.current;

    if (!audio) return;

    setChosen(null);
    setPlaying(false);
    remember(null, 0);

    fadeTo(0, () => {
      audio.pause();
      audio.currentTime = 0;
    });
  }, [fadeTo, remember]);

  const togglePlay = useCallback(() => {
    const audio = element.current;

    if (!audio || !current) return;

    if (playing) {
      setPlaying(false);

      fadeTo(0, () => audio.pause());
      return;
    }

    if (!audio.src || audio.error) {
      play(current);
      return;
    }

    setPlaying(true);

    audio
      .play()
      .then(() => fadeTo(volume))
      .catch(() => {
        setPlaying(false);
        play(current);
      });
  }, [current, fadeTo, play, playing, volume]);

  useEffect(() => {
    const pending = tracks.find(
      track => !track.durationMs && !probed.current.has(track.id) && !missing.has(track.id),
    );

    if (!pending) return;

    probed.current.add(pending.id);
    let cancelled = false;

    void (async () => {
      const source = await sourceFor(pending);

      if (!source || cancelled) return;

      const probe = new Audio();
      probe.preload = 'metadata';
      probe.src = source;

      const timer = setTimeout(() => probe.removeAttribute('src'), PROBE_TIMEOUT_MS);

      probe.onloadedmetadata = () => {
        clearTimeout(timer);

        const ms = Math.round(probe.duration * 1000);

        if (!ms || cancelled) return;

        setTracks(current => current.map(track => (track.id === pending.id ? { ...track, durationMs: ms } : track)));
        void save(db.from('audio_tracks').update({ duration_ms: ms }).eq('id', pending.id), 'a track length');
      };
    })();

    return () => {
      cancelled = true;
    };
  }, [db, missing, sourceFor, tracks]);

  const addUrlTrack = useCallback<AudioValue['addUrlTrack']>(
    async ({ title, src }) => {
      const position = (lastPosition.current += 1);
      const { data, error: failed } = await db
        .from('audio_tracks')
        .insert({ user_id: initial.userId, kind: 'url', title, artist: 'Added by URL', src, position })
        .select()
        .single();

      if (failed) setError(`“${title}” could not be saved: ${failed.message}`);

      if (data) {
        setTracks(current => [
          ...current,
          {
            id: data.id,
            title: data.title,
            artist: data.artist,
            src: data.src,
            categoryId: data.category_id,
            position: data.position,
            libraryPosition: data.library_position,
          },
        ]);
      }
    },
    [db, initial.userId],
  );

  const addLocalFiles = useCallback<AudioValue['addLocalFiles']>(
    async files => {
      const added: Track[] = [];

      for (const file of [...files].filter(isAudioFile)) {
        const record = await saveLocalFile(file);
        const { data, error: failed } = await db
          .from('audio_tracks')
          .insert({
            user_id: initial.userId,
            kind: 'local',
            title: titleFromName(record.name),
            artist: 'On this computer',
            local_id: record.id,
            size: record.size,
            position: (lastPosition.current += 1),
          })
          .select()
          .single();

        if (failed) setError(`“${record.name}” could not be saved: ${failed.message}`);

        if (data) {
          const track: Track = {
            id: data.id,
            title: data.title,
            artist: data.artist,
            localId: data.local_id,
            position: data.position,
            libraryPosition: data.library_position,
          };

          added.push(track);
          setTracks(current => [...current, track]);
        }
      }

      return added;
    },
    [db, initial.userId],
  );

  const removeTrack = useCallback<AudioValue['removeTrack']>(
    async id => {
      await db.from('audio_tracks').delete().eq('id', id);

      setTracks(current => current.filter(track => track.id !== id));
      setChosen(playing => {
        if (playing?.id !== id) return playing;

        remember(null, 0);
        return null;
      });
    },
    [db, remember],
  );

  const trackList = useCallback<AudioValue['trackList']>(
    libraryId =>
      libraryId === null
        ? [...tracks].sort((a, b) => a.position - b.position)
        : tracks
            .filter(track => (track.categoryId ?? null) === libraryId)
            .sort((a, b) => a.libraryPosition - b.libraryPosition),
    [tracks],
  );

  const categories = useMemo(
    () => [...libraries].sort((a, b) => a.position - b.position || a.name.localeCompare(b.name)),
    [libraries],
  );

  const moveCategory = useCallback<AudioValue['moveCategory']>(
    async (id, beforeId) => {
      if (id === beforeId) return;

      const moved = categories.find(category => category.id === id);

      if (!moved) return;

      const without = categories.filter(category => category.id !== id);
      const target = beforeId ? without.findIndex(category => category.id === beforeId) : -1;
      const at = target === -1 ? without.length : target;
      const ordered = [...without.slice(0, at), moved, ...without.slice(at)];

      if (ordered.every((category, index) => category.id === categories[index].id)) return;

      const places = new Map(ordered.map((category, index) => [category.id, index + 1]));

      setLibraries(current =>
        current.map(category => {
          const place = places.get(category.id);

          return place === undefined ? category : { ...category, position: place };
        }),
      );

      lastCategoryPosition.current = Math.max(lastCategoryPosition.current, ordered.length);

      await Promise.all(
        ordered
          .filter(category => places.get(category.id) !== category.position)
          .map(category =>
            save(
              db
                .from('audio_categories')
                .update({ position: places.get(category.id) as number })
                .eq('id', category.id),
              'the library order',
            ),
          ),
      );
    },
    [categories, db],
  );

  const moveTrack = useCallback<AudioValue['moveTrack']>(
    async (id, beforeId, libraryId) => {
      if (id === beforeId) return;

      const list = trackList(libraryId);
      const moved = list.find(track => track.id === id);

      if (!moved) return;

      const without = list.filter(track => track.id !== id);
      const target = beforeId ? without.findIndex(track => track.id === beforeId) : -1;
      const at = target === -1 ? without.length : target;
      const ordered = [...without.slice(0, at), moved, ...without.slice(at)];

      if (ordered.every((track, index) => track.id === list[index].id)) return;

      const placeOf = (track: Track) => (libraryId === null ? track.position : track.libraryPosition);
      const placed = (track: Track, place: number): Track =>
        libraryId === null ? { ...track, position: place } : { ...track, libraryPosition: place };

      const places = new Map(ordered.map((track, index) => [track.id, index + 1]));
      const patch = (place: number) => (libraryId === null ? { position: place } : { library_position: place });

      setTracks(current =>
        current.map(track => {
          const place = places.get(track.id);

          return place === undefined ? track : placed(track, place);
        }),
      );

      if (libraryId === null) lastPosition.current = Math.max(lastPosition.current, ordered.length);

      await Promise.all(
        ordered
          .filter(track => places.get(track.id) !== placeOf(track))
          .map(track =>
            save(
              db
                .from('audio_tracks')
                .update(patch(places.get(track.id) as number))
                .eq('id', track.id),
              'the track order',
            ),
          ),
      );
    },
    [db, trackList],
  );

  const after = (track: Track | null): Track | null => {
    if (!track) return null;

    const list = trackList(startedFrom.current);
    const at = list.findIndex(item => item.id === track.id);

    if (at === -1) return null;

    return [...list.slice(at + 1), ...list.slice(0, at + 1)].find(item => !missing.has(item.id)) ?? null;
  };

  const value = useMemo<AudioValue>(
    () => ({
      tracks,
      categories,
      current,
      playing,
      position,
      duration,
      volume,
      repeat,
      muted,
      fadeMs,
      missing,
      error,
      addUrlTrack,
      addLocalFiles,
      removeTrack,
      trackList,
      moveTrack,
      setTrackCategory: async (id, categoryId) => {
        const libraryPosition =
          Math.max(
            0,
            ...tracks.filter(track => (track.categoryId ?? null) === categoryId).map(track => track.libraryPosition),
          ) + 1;

        await db
          .from('audio_tracks')
          .update({ category_id: categoryId, library_position: libraryPosition })
          .eq('id', id);

        setTracks(current =>
          current.map(track => (track.id === id ? { ...track, categoryId, libraryPosition } : track)),
        );
      },
      addCategory: async name => {
        if (!room('audio_categories', 1, libraries.length)) {
          noteLimit('audio_categories');
          return;
        }

        const { data } = await db
          .from('audio_categories')
          .insert({ user_id: initial.userId, name, position: (lastCategoryPosition.current += 1) })
          .select()
          .single();

        if (data)
          setLibraries(current => [
            ...current,
            { id: data.id, name: data.name, position: data.position },
          ]);
      },
      moveCategory,
      renameCategory: async (id, name) => {
        await db.from('audio_categories').update({ name }).eq('id', id);
        setLibraries(current => current.map(category => (category.id === id ? { ...category, name } : category)));
      },
      removeCategory: async id => {
        await db.from('audio_categories').delete().eq('id', id);
        setLibraries(current => current.filter(category => category.id !== id));
      },
      play,
      playTrack: (track, from) => (current?.id === track.id ? togglePlay() : play(track, from)),
      togglePlay,
      stop,
      seek: seconds => {
        const audio = element.current;

        if (!audio) return;

        if (!audio.src || audio.error) {
          remember(current, seconds);
          return;
        }

        audio.currentTime = seconds;
      },
      setVolume: next => {
        setVolumeState(next);

        if (element.current && !fadeTimer.current) element.current.volume = next;
      },
      cycleRepeat: () => setRepeat(current => REPEAT_NEXT[current]),
      toggleMute: () => setMuted(current => !current),
      setFadeMs: next => setFadeMsState(Math.min(5000, Math.max(0, next))),
    }),
    [
      libraries,
      noteLimit,
      room,
      addLocalFiles,
      addUrlTrack,
      categories,
      current,
      db,
      duration,
      error,
      fadeMs,
      initial.userId,
      missing,
      moveCategory,
      moveTrack,
      muted,
      play,
      repeat,
      playing,
      position,
      remember,
      removeTrack,
      stop,
      togglePlay,
      trackList,
      tracks,
      volume,
    ],
  );

  return (
    <AudioContext.Provider value={value}>
      {children}

      <audio
        ref={element}
        loop={repeat === 'one'}
        muted={muted}
        onTimeUpdate={event => {
          const seconds = event.currentTarget.currentTime;

          setPlayed(seconds);

          if (current && Math.floor(seconds) !== rememberedAt.current) remember(current, seconds);
        }}
        onDurationChange={event => setRan(event.currentTarget.duration || 0)}
        onEnded={() => {
          if (current) remember(current, 0);

          const next = repeat === 'all' ? after(current) : null;

          if (next) play(next);
          else setPlaying(false);
        }}
        onError={() => setError('That track could not be played.')}
      />
    </AudioContext.Provider>
  );
};
