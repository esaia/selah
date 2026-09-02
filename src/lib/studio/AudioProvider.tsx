'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
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
}

export interface Category {
  id: string;
  name: string;
}

const DEFAULT_FADE_MS = 700;
const FADE_STEP_MS = 40;
const PROBE_TIMEOUT_MS = 8000;

interface AudioValue {
  tracks: Track[];
  categories: Category[];
  current: Track | null;
  playing: boolean;
  position: number;
  duration: number;
  volume: number;
  loop: boolean;
  muted: boolean;
  fadeMs: number;
  missing: Set<string>;
  error: string;

  addUrlTrack: (input: { title: string; src: string }) => Promise<void>;
  addLocalFiles: (files: Iterable<File>) => Promise<Track[]>;
  removeTrack: (id: string) => Promise<void>;
  setTrackCategory: (id: string, categoryId: string | null) => Promise<void>;
  addCategory: (name: string) => Promise<void>;
  removeCategory: (id: string) => Promise<void>;


  play: (track: Track) => void;
  playTrack: (track: Track) => void;
  togglePlay: () => void;
  stop: () => void;
  seek: (seconds: number) => void;
  setVolume: (value: number) => void;
  setLoop: (value: boolean) => void;
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

  const [tracks, setTracks] = useState<Track[]>(initial.tracks);
  const [categories, setCategories] = useState<Category[]>(initial.categories);
  const [current, setCurrent] = useState<Track | null>(null);
  const [playing, setPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(0.8);
  const [loop, setLoop] = useState(false);
  const [muted, setMuted] = useState(false);
  const [fadeMs, setFadeMsState] = useState(DEFAULT_FADE_MS);
  const [missing, setMissing] = useState<Set<string>>(new Set());
  const [error, setError] = useState('');

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
    (track: Track) => {
      const audio = element.current;

      if (!audio) return;

      setError('');

      void (async () => {
        const source = await sourceFor(track);

        if (!source) {
          setError(`“${track.title}” is on another computer.`);
          return;
        }

        audio.src = source;
        audio.volume = fadeMs === 0 ? volume : 0;
        setCurrent(track);

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
    [fadeMs, fadeTo, sourceFor, volume],
  );

  const stop = useCallback(() => {
    const audio = element.current;

    if (!audio) return;

    // The transport goes at the click; only the sound is allowed its ramp.
    // Holding the bar open for the length of the fade left the operator looking
    // at controls for a track they had already dismissed.
    setCurrent(null);
    setPlaying(false);

    fadeTo(0, () => {
      audio.pause();
      audio.currentTime = 0;
    });
  }, [fadeTo]);

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
      const { data } = await db
        .from('audio_tracks')
        .insert({ user_id: initial.userId, kind: 'url', title, artist: 'Added by URL', src })
        .select()
        .single();

      if (data) {
        setTracks(current => [
          ...current,
          { id: data.id, title: data.title, artist: data.artist, src: data.src, categoryId: data.category_id },
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
        const { data } = await db
          .from('audio_tracks')
          .insert({
            user_id: initial.userId,
            kind: 'local',
            title: titleFromName(record.name),
            artist: 'On this computer',
            local_id: record.id,
            size: record.size,
          })
          .select()
          .single();

        if (data) {
          const track: Track = { id: data.id, title: data.title, artist: data.artist, localId: data.local_id };

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
      setCurrent(current => (current?.id === id ? null : current));
    },
    [db],
  );

  const value = useMemo<AudioValue>(
    () => ({
      tracks,
      categories,
      current,
      playing,
      position,
      duration,
      volume,
      loop,
      muted,
      fadeMs,
      missing,
      error,
      addUrlTrack,
      addLocalFiles,
      removeTrack,
      setTrackCategory: async (id, categoryId) => {
        await db.from('audio_tracks').update({ category_id: categoryId }).eq('id', id);
        setTracks(current => current.map(track => (track.id === id ? { ...track, categoryId } : track)));
      },
      addCategory: async name => {
        const { data } = await db
          .from('audio_categories')
          .insert({ user_id: initial.userId, name })
          .select()
          .single();

        if (data) setCategories(current => [...current, { id: data.id, name: data.name }]);
      },
      removeCategory: async id => {
        await db.from('audio_categories').delete().eq('id', id);
        setCategories(current => current.filter(category => category.id !== id));
      },
      play,
      playTrack: track => (current?.id === track.id ? togglePlay() : play(track)),
      togglePlay,
      stop,
      seek: seconds => {
        if (element.current) element.current.currentTime = seconds;
      },
      setVolume: next => {
        setVolumeState(next);

        if (element.current && !fadeTimer.current) element.current.volume = next;
      },
      setLoop,
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
      loop,
      missing,
      muted,
      play,
      playing,
      position,
      removeTrack,
      stop,
      togglePlay,
      tracks,
      volume,
    ],
  );

  return (
    <AudioContext.Provider value={value}>
      {children}

      <audio
        ref={element}
        loop={loop}
        muted={muted}
        onTimeUpdate={event => setPosition(event.currentTarget.currentTime)}
        onDurationChange={event => setDuration(event.currentTarget.duration || 0)}
        onEnded={() => setPlaying(false)}
        onError={() => setError('That track could not be played.')}
      />
    </AudioContext.Provider>
  );
};
