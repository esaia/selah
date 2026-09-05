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
import { save } from '@/lib/supabase/save';


export interface Track {
  id: string;
  title: string;
  artist: string;
  /** A URL the operator added. Absent for a file on this machine. */
  src?: string | null;
  /** The IndexedDB record this track plays from, for a local file. */
  localId?: string | null;
  categoryId?: string | null;
  durationMs?: number | null;
  /** Where the track sits in the All tracks order. */
  position: number;
  /** Where it sits in the library it is filed in, which is its own order. */
  libraryPosition: number;
}

export interface Category {
  id: string;
  name: string;
  /** Where the library sits in the operator's own order of libraries. */
  position: number;
}

/**
 * What happens when a track runs out.
 *
 * `one` is the element's own `loop`, so a bed under a prayer never has a gap.
 * `all` plays on down the library it was started from — a library *is* the
 * running order here, so "the next one" is a question the console can always
 * answer — and comes back round to the top rather than stopping the service
 * dead at the last track.
 */
export type Repeat = 'off' | 'one' | 'all';

const REPEAT_NEXT: Record<Repeat, Repeat> = { off: 'all', all: 'one', one: 'off' };

const DEFAULT_FADE_MS = 700;
const FADE_STEP_MS = 40;
const PROBE_TIMEOUT_MS = 8000;

/**
 * What was cued when the tab last had it, so a reload mid-service comes back to
 * the same track at the same place rather than to an empty transport.
 *
 * Per-machine, and deliberately not in the database: which laptop is playing
 * the bed is not something the session's other screens have any business
 * knowing, and a local file's bytes never leave this browser anyway.
 */
const RESUME_KEY = 'studioAudioResume';

interface Resume {
  id: string;
  seconds: number;
}

/**
 * Read through an external store rather than an effect, the way the preview
 * panel reads its mode: the server has nothing to say about what this browser
 * was playing, so it renders the empty transport and the client corrects it in
 * the same commit instead of a paint later.
 */
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
      // Non-critical.
    }

    resumeListeners.forEach(listener => listener());
  },
};

/**
 * Move the playhead as soon as there is enough of the track to move it. A
 * `currentTime` written straight after `src` is dropped on the floor, because
 * the element has no idea yet how long the thing is.
 */
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
  /** One list in the order it is dragged into: null is All tracks. */
  trackList: (libraryId: string | null) => Track[];
  moveTrack: (id: string, beforeId: string | null, libraryId: string | null) => Promise<void>;
  setTrackCategory: (id: string, categoryId: string | null) => Promise<void>;
  addCategory: (name: string) => Promise<void>;
  removeCategory: (id: string) => Promise<void>;
  /** Drop a library in front of another, or at the end when `beforeId` is null. */
  moveCategory: (id: string, beforeId: string | null) => Promise<void>;


  /** `from` is the library the track was started out of: null is All tracks. */
  play: (track: Track, from?: string | null) => void;
  playTrack: (track: Track, from?: string | null) => void;
  togglePlay: () => void;
  stop: () => void;
  seek: (seconds: number) => void;
  setVolume: (value: number) => void;
  /** Off → the whole library → this track → off, the way a player cycles it. */
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

/**
 * The console's music.
 *
 * One `<audio>` element for the page, because two overlapping tracks in a
 * service is always a mistake. A track is either a URL or a file on this
 * machine; the file's bytes stay in IndexedDB and never reach a server, so the
 * row in the database is metadata only and a track whose file is on the other
 * laptop shows as unavailable rather than silently failing to play.
 */
export const AudioProvider = ({ initial, children }: { initial: AudioInitial; children: ReactNode }) => {
  const db = useMemo(() => supabase(), []);
  const element = useRef<HTMLAudioElement>(null);
  const fadeTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const objectUrls = useRef(new Map<string, string>());
  const probed = useRef(new Set<string>());
  // The last whole second written, so a running track is not a write per frame.
  const rememberedAt = useRef(-1);
  // The library the current track was started out of, which is the list the
  // one after it comes from. Null is All tracks.
  const startedFrom = useRef<string | null>(null);
  // The highest position handed out, so a new track lands at the end rather
  // than in front of everything the operator has already arranged.
  const lastPosition = useRef(Math.max(0, ...initial.tracks.map(track => track.position)));
  // The same, for the libraries: a new one is made at the bottom of the list
  // rather than in the middle of an order the operator has already arranged.
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

  /** Keep the tab's own note of what is cued and where it has got to. */
  const remember = useCallback((track: Track | null, seconds: number) => {
    rememberedAt.current = Math.floor(seconds);
    resumeStore.set(track ? { id: track.id, seconds } : null);
  }, []);

  // Whatever was cued when this tab was last open. It stands in for the current
  // track until something is actually played, so a reload mid-service comes
  // back to the same track at the same place — stopped, because a browser will
  // not let a page make a sound it was not asked to, and a refresh that
  // restarts the bed at full volume is worse than one that waits for a click.
  const stored = useSyncExternalStore(resumeStore.subscribe, resumeStore.get, resumeStore.getServer);
  const cued = chosen === null && stored ? (tracks.find(track => track.id === stored.id) ?? null) : null;

  const current = chosen ?? cued;
  const position = cued ? (stored?.seconds ?? 0) : played;
  // The length the library already knows, so the scrubber reads right on a
  // track the element has not loaded a byte of yet.
  const duration = cued ? (cued.durationMs ?? 0) / 1000 : ran;

    // Which local files this machine actually holds. A library row can outlive
  // the browser it was added on, and the operator needs to see which.
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
    // Recomputed only when the library changes, not on every render.
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

  /** Ramp the element's volume, or cut when the operator has fades turned off. */
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

  /** Where a track's audio actually comes from on this machine. */
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

        // Only a track picked up from the last session starts anywhere but at
        // its beginning; once anything has been played this page is the
        // authority on where it is.
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

    // The transport goes at the click; only the sound is allowed its ramp.
    // Holding the bar open for the length of the fade left the operator looking
    // at controls for a track they had already dismissed.
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

    // The button answers the click, not the fade: the state flips now and the
    // ramp runs behind it. Waiting for the fade meant a transport that looked
    // broken for up to five seconds.
    if (playing) {
      setPlaying(false);

      fadeTo(0, () => audio.pause());
      return;
    }

    // Resuming an element that has lost its source — the blob URL went with a
    // reload, or an earlier load errored — silently rejects and leaves the
    // button stuck showing Play. Reload the track instead of pretending.
    if (!audio.src || audio.error) {
      play(current);
      return;
    }

    setPlaying(true);

    audio
      .play()
      .then(() => fadeTo(volume))
      .catch(() => {
        // A rejection here is nearly always the autoplay policy or a source
        // that has gone away; starting the track over covers both.
        setPlaying(false);
        play(current);
      });
  }, [current, fadeTo, play, playing, volume]);

  // Probe durations in the background so the library can show lengths without
  // the operator having to play every track to find the two-minute one.
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

        // A zero is a failed read, not a zero-length track — never cache it.
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

      // A rejected insert used to leave the operator staring at a library that
      // simply never grew. Say so instead.
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

  /**
   * One list, in the order the operator dragged it into: All tracks, or one of
   * their libraries. A library keeps an order of its own, so arranging a
   * running order inside it leaves All tracks exactly as it was.
   */
  const trackList = useCallback<AudioValue['trackList']>(
    libraryId =>
      libraryId === null
        ? [...tracks].sort((a, b) => a.position - b.position)
        : tracks
            .filter(track => (track.categoryId ?? null) === libraryId)
            .sort((a, b) => a.libraryPosition - b.libraryPosition),
    [tracks],
  );

  /**
   * The libraries in the operator's own order. Sorted here rather than at every
   * place that lists them, so the Audio tab and the console rail can never
   * disagree about which library comes first.
   */
  const categories = useMemo(
    () => [...libraries].sort((a, b) => a.position - b.position || a.name.localeCompare(b.name)),
    [libraries],
  );

  /**
   * Drop a library in front of another, or at the end when `beforeId` is null.
   * Only the libraries whose place actually changed are written — the same
   * bargain `moveTrack` makes, so dragging the last one to the top is not a
   * round trip per row in between.
   */
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

  /**
   * Drop a track in front of another, or at the end when `beforeId` is null.
   * Only the list being looked at is renumbered — and only the rows whose place
   * in it actually moved are written.
   */
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

  /**
   * What follows a track that has just run out: the next one in the library it
   * was started from, wrapping round to the top.
   *
   * Tracks this machine does not hold are stepped over rather than played into
   * an error — a library can name files that live on the other laptop, and
   * stopping dead at one of them mid-service is the thing the mode exists to
   * prevent. The list is walked round to the track itself, so a library of one
   * repeats rather than falling silent.
   */
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
        // Filed at the end of its new library, which is where a track dropped
        // onto one is expected to land.
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

        // Nothing is loaded yet on a track restored from a reload, so the scrub
        // moves the point it will start from rather than being swallowed.
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
      // Mute rides on the element rather than the volume slider, so unmuting
      // returns to exactly the level the operator had set.
      toggleMute: () => setMuted(current => !current),
      setFadeMs: next => setFadeMsState(Math.min(5000, Math.max(0, next))),
    }),
    [
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

          // Once a second is plenty to come back to, and spares the disk a
          // write on every frame the element paints.
          if (current && Math.floor(seconds) !== rememberedAt.current) remember(current, seconds);
        }}
        onDurationChange={event => setRan(event.currentTarget.duration || 0)}
        onEnded={() => {
          // A track that has run out comes back at its start, not at its end.
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
