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
import { useQueryClient } from '@tanstack/react-query';

import { loadChapterCount, loadPassage, loadVerseCount, type Target } from '@/lib/bible/loadPassage';
import { asBlackout, toggleScreen, type Blackout, type Screen } from '@/lib/live/blackout';
import { openLiveChannel, type LiveChannel } from '@/lib/live/channel';
import type { SignalTransport, SlidePayload } from '@/lib/live/protocol';
import { loadLocalFile } from '@/lib/media/localMedia';
import { serveAssets } from '@/lib/media/peerAssets';
import { LOCAL_THEME } from '@/lib/projector/themes';
import {
  asCardRun,
  asDraft,
  cardFromRow,
  DEFAULT_HOLD_MS,
  fireCard,
  isSaved as hasRealId,
  remainingOf,
  withSkew as withCardSkew,
  type CardDraft,
  type CardRun,
  type NameCard,
} from '@/lib/lower3rd/card';
import {
  armTimer,
  asTimerState,
  clearOutputs,
  finishAction,
  finishesAt,
  startRun,
  type TimerState,
} from '@/lib/timer/model';
import { supabase } from '@/lib/supabase/client';
import { save } from '@/lib/supabase/save';
import {
  defaultVersionOf,
  emptyShowData,
  MAX_LANGS,
  REQUIRED_LANG,
  type Block,
  type Lang,
  type Live,
  type LocalFileMeta,
  type ShowData,
  type Song,
  type SongSlide,
} from '@/lib/types';

import {
  joinGroup as joinGroupIn,
  liveGroup,
  moveBlock as moveBlockIn,
  moveBlockTo as moveBlockToIn,
  orderBlocks as orderBlocksIn,
  planExtension,
  planTrim,
  regroup,
  removeBlock as removeBlockIn,
  setCollapsed,
  slideOf,
  splitGroup as splitGroupIn,
  stepWithin,
  toggleCollapsed,
  type Workspace,
} from './blocks';
import {
  fromRow,
  projectorStyle,
  stageLangOf,
  streamLangOf,
  streamStyle,
  toRow,
  type Settings,
  type SettingsRow,
} from './settings';
import { useDebouncedSave } from './useDebouncedSave';

export type Tab = 'bible' | 'audio' | 'lyrics' | 'lower3rd' | 'stage';

export interface StudioSession {
  id: string;
  name: string;
  outputKey: string;
}

export interface StudioInitial {
  session: StudioSession;
  settings: SettingsRow;
  workspace: {
    blocks: Block[];
    live: Live;
    setlist: string[];
    activeSongId: string | null;
    songScope: SongScope;
    tab: Tab;
    cardSize: number;
    /** The name-card form as the operator left it, unvalidated. */
    cardDraft: unknown;
  };
  songs: Song[];
  /** The people the operator has saved, and who is on the stream right now. */
  cards: NameCard[];
  card: unknown;
  /** Which screens were black when the console was last open. */
  blackout: unknown;
  showData: ShowData;
  nextShowData: ShowData;
  timer: TimerState;
  plan: string;
}

/** Which list a song was opened from, and so what the workspace shows. */
export type SongScope = 'setlist' | 'library';

interface StudioValue {
  session: StudioSession;
  plan: string;

  settings: Settings;
  update: (patch: Partial<Settings>) => void;
  setLangOrder: (order: Lang[]) => void;
  addLang: (lang: Lang) => void;
  removeLang: (lang: Lang) => void;
  setLocalBackground: (file: LocalFileMeta | null) => void;

  blocks: Block[];
  live: Live;
  loading: boolean;

  addPassage: (request: { book: number; chapter: number; from?: number | null; to?: number | null }) => Promise<Block | null>;
  extendBlock: (id: string, side: 'start' | 'end') => Promise<void>;
  removeGroup: (id: string, groupIndex: number) => Promise<void>;
  joinGroup: (id: string, groupIndex: number) => void;
  splitGroup: (id: string, groupIndex: number) => void;
  removeBlock: (id: string) => void;
  moveBlock: (id: string, direction: number) => void;
  moveBlockTo: (id: string, insertIndex: number) => void;
  /** The whole running order at once, as a drag leaves it. */
  orderBlocks: (ids: string[]) => void;
  toggleBlockCollapsed: (id: string) => void;
  setAllCollapsed: (collapsed: boolean) => void;
  clearBlocks: () => void;
  refreshBlocks: () => Promise<void>;

  goLive: (blockId: string, verseIndex: number) => void;
  selectVerse: (blockId: string, verseIndex: number) => void;
  stepLive: (direction: number) => void;
  clearProjector: () => void;

  /** Saved name cards, who is on the stream, and the form being filled in. */
  cards: NameCard[];
  cardRun: CardRun | null;
  /**
   * The card being written, and with it the design and hold every strap uses.
   *
   * It lives here rather than in the panel because it is saved with the rest
   * of the workspace: a look chosen before the service is still chosen after a
   * reload.
   */
  cardDraft: CardDraft;
  setCardDraft: (updater: (draft: CardDraft) => CardDraft) => void;
  showCard: (card: NameCard, holdMs?: number) => void;
  clearCard: () => void;
  saveCard: (card: NameCard) => Promise<void>;
  removeCard: (id: string) => Promise<void>;

  songs: Song[];
  activeSongId: string | null;
  /**
   * Open a song. `from` says which list it was picked out of, because that is
   * what the workspace shows: a song picked off the playlist is one item of a
   * running order the operator is working through, and one picked out of the
   * library is the only thing they asked to see.
   */
  setActiveSongId: (id: string | null, from?: SongScope) => void;
  songScope: SongScope;
  setlist: string[];
  importSongs: (songs: Song[]) => Promise<void>;
  /** Writes the song and hands back the row, whose id is the database's, not the draft's. */
  saveSong: (song: Song) => Promise<Song | undefined>;
  reorderSlides: (song: Song, ids: string[]) => Promise<void>;
  removeSong: (id: string) => Promise<void>;
  clearSongs: () => Promise<void>;
  placeInSetlist: (songId: string, index: number) => void;
  /** The whole running order at once, as a drag leaves it. */
  orderSetlist: (songIds: string[]) => void;
  removeFromSetlist: (songId: string) => void;
  clearSetlist: () => void;
  publishLyrics: (song: Song, slideIndex: number) => void;
  selectLyric: (song: Song, slideIndex: number) => void;

  showData: ShowData;
  /** What the stage display has been told is coming after it. */
  nextShowData: ShowData;

  timer: TimerState;
  /**
   * Every timer edit goes through here, which is what lets the transport
   * helpers in `lib/timer/model` stay pure functions of the whole state.
   */
  updateTimer: (updater: (state: TimerState) => TimerState) => void;

  /** Which screens are black, and the key that takes one there and back. */
  blackout: Blackout;
  toggleBlackout: (screen: Screen) => void;

  tab: Tab;
  setTab: (tab: Tab) => void;
  cardSize: number;
  setCardSize: (size: number) => void;
  peers: Record<'console' | 'show' | 'lower3rd' | 'stage', number>;

  loadChapterCount: (query: { book: number; lang: Lang; version?: string }) => Promise<number>;
  loadVerseCount: (query: { book: number; chapter: number; lang: Lang; version?: string }) => Promise<number>;
}

const StudioContext = createContext<StudioValue | null>(null);

export const useStudio = () => {
  const value = useContext(StudioContext);

  if (!value) throw new Error('useStudio must be used inside StudioProvider');

  return value;
};

export const StudioProvider = ({ initial, children }: { initial: StudioInitial; children: ReactNode }) => {
  const client = useQueryClient();
  const db = useMemo(() => supabase(), []);

  const [settings, setSettings] = useState<Settings>(() => fromRow(initial.settings));
  const [workspace, setWorkspace] = useState<Workspace>({
    blocks: initial.workspace.blocks,
    live: initial.workspace.live,
  });
  const [songs, setSongs] = useState<Song[]>(initial.songs);
  const [setlist, setSetlist] = useState<string[]>(initial.workspace.setlist);
  const [activeSongId, setActiveSong] = useState<string | null>(initial.workspace.activeSongId);
  const [songScope, setSongScope] = useState<SongScope>(initial.workspace.songScope);

  const setActiveSongId = useCallback<StudioValue['setActiveSongId']>((id, from = 'library') => {
    setActiveSong(id);
    setSongScope(from);
  }, []);
  const [tab, setTab] = useState<Tab>(initial.workspace.tab);
  const [cardSize, setCardSize] = useState(initial.workspace.cardSize);
  const [loading, setLoading] = useState(false);
  const [showData, setShowData] = useState<ShowData>(initial.showData);
  const [nextShowData, setNextShowData] = useState<ShowData>(initial.nextShowData);
  const [timer, setTimer] = useState<TimerState>(() => asTimerState(initial.timer));
  const [peers, setPeers] = useState({ console: 0, show: 0, lower3rd: 0, stage: 0 });

  // The people the operator has saved, and which of them is on the stream.
  // `cardRun` is deliberately not part of `workspace`: a name card is laid
  // over the live slide rather than being one, so it must not travel with the
  // block list or clear when the projector clears.
  const [cards, setCards] = useState<NameCard[]>(initial.cards);
  const [cardRun, setCardRun] = useState<CardRun | null>(() => withCardSkew(asCardRun(initial.card)));

  // Which screens are dark. Not part of `showData`: blacking a projector does
  // not take the verse off it, and the slide the console is holding has to be
  // the slide that comes back when the key is pressed again.
  const [blackout, setBlackout] = useState<Blackout>(() => asBlackout(initial.blackout));
  const [cardDraft, setDraft] = useState<CardDraft>(() => asDraft(initial.workspace.cardDraft));

  const setCardDraft = useCallback<StudioValue['setCardDraft']>(updater => setDraft(updater), []);

  const { blocks, live } = workspace;

  // ------------------------------------------------------------ live channel

  const channelRef = useRef<LiveChannel | null>(null);

  // The look the outputs must be told about, derived rather than mirrored: it
  // is a pure function of the settings and is needed on every push.
  const wireStyle = useMemo(
    () => ({
      projector: projectorStyle(settings),
      stream: streamStyle(settings),
      streamLang: streamLangOf(settings),
      stageLang: stageLangOf(settings),
    }),
    [settings],
  );

  // The last slide pushed. Held in a ref because a look change has to re-send
  // it without making the slide itself a dependency of that effect — that would
  // push twice for every verse.
  const showRef = useRef<ShowData>(showData);

  // What that push actually carried, as a string. The armed-language effect
  // below compares the slide it would send against this, so a push it has
  // already made — or one `publish` made a moment earlier — is not made twice.
  const pushedRef = useRef(JSON.stringify([initial.showData, initial.nextShowData]));

  useEffect(() => {
    showRef.current = showData;
  }, [showData]);

  // The same, for what is coming next. The console's stage preview draws it,
  // and the look and timer effects re-send it, which is why it is both.
  const nextRef = useRef<ShowData>(initial.nextShowData);

  useEffect(() => {
    nextRef.current = nextShowData;
  }, [nextShowData]);

  // The timer travels with the slide, so a new verse or a look change carries
  // the run along with it and an output never has to ask for it.
  const timerRef = useRef<TimerState>(timer);

  useEffect(() => {
    timerRef.current = timer;
  }, [timer]);

  // The name card on the stream, held in a ref for the same reason: every push
  // carries it, and none of them should be a dependency of the others.
  const cardRef = useRef<CardRun | null>(cardRun);

  useEffect(() => {
    cardRef.current = cardRun;
  }, [cardRun]);

  // And the dark screens, for the same reason: every push carries them, so a
  // new verse cannot light a screen the operator has blacked.
  const blackoutRef = useRef<Blackout>(blackout);

  useEffect(() => {
    blackoutRef.current = blackout;
  }, [blackout]);

  /**
   * One payload, built in one place.
   *
   * `sentAt` is stamped here rather than kept in the timer state: a clock
   * reading changes every millisecond, and holding one in state would mean a
   * save and a render for a number nothing reads except at the moment it
   * lands. The outputs use it to correct for the clock skew between machines.
   */
  const payloadOf = useCallback(
    (slide: ShowData, next: ShowData, run: TimerState): SlidePayload => ({
      showData: slide,
      next,
      style: wireStyle.stream,
      projector: wireStyle.projector,
      streamLang: wireStyle.streamLang,
      stageLang: wireStyle.stageLang,
      timer: { ...run, sentAt: Date.now() },
      // Whoever is on the stream overlay right now. Read from a ref for the
      // same reason the timer is: a slide change must carry the card along
      // unchanged rather than take it down.
      card: cardRef.current && { ...cardRef.current, sentAt: Date.now() },
      blackout: blackoutRef.current,
    }),
    [wireStyle],
  );

  // The look effect below re-sends the current slide whenever the style
  // changes. On mount there is no change to announce — and publishing then
  // would overwrite the session's stored slide with whatever this console had
  // loaded, which is how reopening the console blanked a live projector.
  const styleSettled = useRef(false);

  useEffect(() => {
    const channel = openLiveChannel(initial.session.outputKey, 'console');
    channelRef.current = channel;

    const offPresence = channel.onPresence(setPeers);

    // This console serves its own backgrounds to any projector that asks. The
    // bytes go peer to peer; only the handshake rides the channel.
    const transport: SignalTransport = {
      peerId: channel.peerId,
      send: channel.sendSignal,
      subscribe: channel.onSignal,
    };
    const offAssets = serveAssets(loadLocalFile, transport);

    return () => {
      offPresence();
      offAssets();
      channel.close();
      channelRef.current = null;
    };
  }, [initial.session.outputKey]);

  /**
   * The single point that puts a slide on the outputs.
   *
   * It writes the session's state row first — that is what a projector reads
   * when it joins or reloads — then broadcasts, which is what makes the change
   * instant for the outputs already watching.
   */
  const pushShow = useCallback(
    (payload: ShowData, next: ShowData = emptyShowData()) => {
      setShowData(payload);
      showRef.current = payload;
      setNextShowData(next);
      nextRef.current = next;

      pushedRef.current = JSON.stringify([payload, next]);

      channelRef.current?.publishSlide(payloadOf(payload, next, timerRef.current));

      void save(
        db.from('session_state').upsert({
          session_id: initial.session.id,
          show_data: payload,
          next_show_data: next,
          projector: wireStyle.projector,
          stream_style: wireStyle.stream,
          stream_lang: wireStyle.streamLang,
          stage_lang: wireStyle.stageLang,
          blackout: blackoutRef.current,
        }),
        'the live slide',
      );
    },
    [db, initial.session.id, payloadOf, wireStyle],
  );

  // A look change has to reach the outputs too — they cannot read the settings
  // row themselves, so the current slide is re-sent with the new style.
  useEffect(() => {
    if (!styleSettled.current) {
      styleSettled.current = true;
      return;
    }

    if (!channelRef.current) return;

    channelRef.current.publishSlide(payloadOf(showRef.current, nextRef.current, timerRef.current));

    void save(
      db.from('session_state').upsert({
        session_id: initial.session.id,
        show_data: showRef.current,
        next_show_data: nextRef.current,
        projector: wireStyle.projector,
        stream_style: wireStyle.stream,
        stream_lang: wireStyle.streamLang,
        stage_lang: wireStyle.stageLang,
      }),
      'the projector look',
    );
  }, [db, initial.session.id, payloadOf, wireStyle]);

  /**
   * The timer's own push.
   *
   * The broadcast is immediate, because an operator pressing start expects the
   * screen to move; the row is debounced, because renaming a timer is a
   * keystroke at a time and none of them is worth a round trip. Nothing here
   * fires per tick — an output counts the seconds itself, and only a change of
   * *shape* gets this far.
   */
  const timerSettled = useRef(false);

  useEffect(() => {
    if (!timerSettled.current) {
      timerSettled.current = true;
      return;
    }

    channelRef.current?.publishSlide(payloadOf(showRef.current, nextRef.current, timer));
  }, [payloadOf, timer]);

  useDebouncedSave(timer, next => {
    void save(db.from('session_state').update({ timer: next }).eq('session_id', initial.session.id), 'the stage timer');
  });

  /**
   * What happens when the armed run reaches zero: the item below it starts
   * itself, or the timer takes itself off the screens. Which of the two —
   * or neither — is `finishAction`, and this is the alarm that carries it out.
   *
   * Waited out rather than watched. The run already says when it will end, so
   * this is one timeout for the whole segment instead of a tick that has to be
   * running on every tab — and every edit to the run (a pause, a drag, ±1m)
   * re-runs the effect and moves the alarm with it.
   *
   * The console alone does this. It is the desk acting a little late, and an
   * output that started or cleared timers of its own would be a second one.
   */
  useEffect(() => {
    if (!timer.running) return;

    const action = finishAction(timer);
    const ends = action ? finishesAt(timer) : null;

    if (!action || ends === null) return;

    const wait = setTimeout(() => {
      setTimer(current =>
        // Stopped or cleared in the meantime: the alarm was set for a run that
        // is no longer going, and acting on it now would restart the desk.
        !current.running
          ? current
          : action.kind === 'start'
            ? startRun(armTimer(current, action.timer.id))
            : clearOutputs(current),
      );
    }, Math.max(0, ends - Date.now()));

    return () => clearTimeout(wait);
  }, [timer]);

  // ------------------------------------------------------------ name cards

  /**
   * A card's own push.
   *
   * It publishes the slide unchanged and lets the card ride along in the
   * payload, which is what keeps the projector and the stage untouched: they
   * receive the same verse they already had, and only the stream overlay finds
   * something new to draw.
   */
  const publishCard = useCallback(
    (run: CardRun | null) => {
      setCardRun(run);
      cardRef.current = run;

      channelRef.current?.publishSlide(payloadOf(showRef.current, nextRef.current, timerRef.current));

      void save(
        db.from('session_state').update({ card: run }).eq('session_id', initial.session.id),
        'the name card',
      );
    },
    [db, initial.session.id, payloadOf],
  );

  const showCard = useCallback<StudioValue['showCard']>(
    (card, holdMs = DEFAULT_HOLD_MS) => publishCard(fireCard(card, holdMs)),
    [publishCard],
  );

  const clearCard = useCallback(() => publishCard(null), [publishCard]);

  // ------------------------------------------------------------ blackout

  /**
   * The Audience and Stage keys.
   *
   * Published the way a card is: the slide goes out unchanged and the flag
   * rides along with it, so the output that was told to go black is the only
   * one that finds anything new. The row is written too, because a projector
   * that reloads while the room is dark must come back dark rather than light
   * the wall up mid-prayer.
   */
  const toggleBlackout = useCallback<StudioValue['toggleBlackout']>(
    screen => {
      const next = toggleScreen(blackoutRef.current, screen);

      setBlackout(next);
      blackoutRef.current = next;

      channelRef.current?.publishSlide(payloadOf(showRef.current, nextRef.current, timerRef.current));

      void save(
        db.from('session_state').update({ blackout: next }).eq('session_id', initial.session.id),
        'the blackout',
      );
    },
    [db, initial.session.id, payloadOf],
  );

  /**
   * Taking a finished card down.
   *
   * The overlays already stop drawing one whose hold has run out — they count
   * from their own clocks, which is the whole point of sending `firedAt`
   * instead of a countdown. This is only the console catching up with them, so
   * the panel stops calling the card live and the stored row does not keep a
   * card that is long gone. Waited out rather than polled, for the same reason
   * the linked timers above are.
   */
  useEffect(() => {
    const left = remainingOf(cardRun);

    if (!cardRun || left === Infinity) return;

    const wait = setTimeout(() => {
      setCardRun(null);
      cardRef.current = null;

      void save(
        db.from('session_state').update({ card: null }).eq('session_id', initial.session.id),
        'the name card',
      );
    }, left);

    return () => clearTimeout(wait);
  }, [cardRun, db, initial.session.id]);

  const saveCard = useCallback<StudioValue['saveCard']>(
    async card => {
      // A card written in the console has a placeholder id until it is saved;
      // leaving it off lets Postgres mint the real one.
      const saved = hasRealId(card.id) ? { id: card.id } : {};

      const { data, error } = await db
        .from('name_cards')
        .upsert({
          ...saved,
          user_id: initial.settings.user_id,
          title: card.title,
          subtitle: card.subtitle,
          position: card.position,
        })
        .select()
        .single();

      if (error) throw new Error(error.message);
      if (!data) return;

      const written = cardFromRow(data);

      setCards(current => {
        const without = current.filter(item => item.id !== written.id);

        return [...without, written].sort((a, b) => a.position - b.position || a.title.localeCompare(b.title));
      });
    },
    [db, initial.settings.user_id],
  );

  const removeCard = useCallback<StudioValue['removeCard']>(
    async id => {
      const { error } = await db.from('name_cards').delete().eq('id', id);

      if (error) throw new Error(error.message);

      setCards(current => current.filter(card => card.id !== id));

      // A card taken out of the library while it is on the stream comes off it.
      if (cardRef.current?.card.id === id) publishCard(null);
    },
    [db, publishCard],
  );

  /** Normalised on the way out, so a hand-typed duration or a stale row can
   *  never reach an output half-formed. */
  const updateTimer = useCallback<StudioValue['updateTimer']>(updater => {
    setTimer(current => {
      const next = asTimerState(updater(current));

      return JSON.stringify(next) === JSON.stringify(current) ? current : next;
    });
  }, []);

  // ------------------------------------------------------------ persistence

  useDebouncedSave(settings, next => {
    void save(db.from('settings').update(toRow(next)).eq('user_id', initial.settings.user_id), 'your settings');
  });

  useDebouncedSave({ workspace, setlist, activeSongId, songScope, tab, cardSize, cardDraft }, state => {
    void save(
      db.from('session_workspace').upsert({
        session_id: initial.session.id,
        blocks: state.workspace.blocks,
        live: state.workspace.live,
        setlist: state.setlist,
        active_song_id: state.activeSongId,
        song_scope: state.songScope,
        tab: state.tab,
        card_size: state.cardSize,
        card_draft: state.cardDraft,
      }),
      'your workspace',
    );
  });

  const update = useCallback((patch: Partial<Settings>) => {
    setSettings(current => ({ ...current, ...patch }));
  }, []);

  /** The stacking order on the projector, as the operator dragged it. */
  const setLangOrder = useCallback((order: Lang[]) => {
    setSettings(current => (order.length === current.langOrder.length ? { ...current, langOrder: order } : current));
  }, []);

  /**
   * Put a language on the projector: armed, on its default translation, at the
   * bottom of the stack. Adding past the ceiling is a no-op rather than a
   * silent shuffle — the button that calls this is hidden by then anyway.
   */
  const addLang = useCallback((lang: Lang) => {
    setSettings(current =>
      current.langOrder.includes(lang) || current.langOrder.length >= MAX_LANGS
        ? current
        : {
            ...current,
            langOrder: [...current.langOrder, lang],
            enabled: { ...current.enabled, [lang]: true },
            versions: { ...current.versions, [lang]: current.versions[lang] || defaultVersionOf(lang) },
          },
    );
  }, []);

  /**
   * Take a language off. English stays whatever happens — it is what the
   * outputs fall back to. The stream and stage picks are left alone: they
   * already fall back to the first armed language, and keeping them means
   * adding the language back restores what it was set to.
   */
  const removeLang = useCallback((lang: Lang) => {
    setSettings(current => {
      if (lang === REQUIRED_LANG || !current.langOrder.includes(lang)) return current;

      const langOrder = current.langOrder.filter(entry => entry !== lang);
      const only = <T,>(kept: Partial<Record<Lang, T>>) =>
        Object.fromEntries(langOrder.map(entry => [entry, kept[entry]]).filter(([, value]) => value !== undefined));

      return {
        ...current,
        langOrder,
        enabled: only(current.enabled),
        versions: only(current.versions),
        adminLang: current.adminLang === lang ? langOrder[0] : current.adminLang,
        adminVersion:
          current.adminLang === lang
            ? current.versions[langOrder[0]] || defaultVersionOf(langOrder[0])
            : current.adminVersion,
      };
    });
  }, []);

  const setLocalBackground = useCallback((file: LocalFileMeta | null) => {
    setSettings(current =>
      file
        ? { ...current, localImage: file, theme: LOCAL_THEME }
        : { ...current, localImage: null, theme: current.theme === LOCAL_THEME ? '1' : current.theme },
    );
  }, []);

  // ------------------------------------------------------------ passages

  /**
   * Every language that has to be fetched: the armed ones plus the one being
   * browsed, each with the translation it is read in.
   *
   * A block holds one array per language, so a language can only carry one
   * translation at a time — there is no reading the KJV off the cards while
   * the WEB goes on the wall. When the language being browsed is also armed,
   * the armed row's choice is the one that counts: it is the translation the
   * room sees, and the cards are how the operator checks what the room sees.
   * `adminVersion` only decides for a language that is not on the projector at
   * all.
   *
   * Getting this backwards is what made the projector's own dropdown look
   * broken: picking a translation there changed nothing, because the browsing
   * language quietly overrode it.
   */
  const targets = useMemo((): Target[] => {
    const langs = new Set<Lang>(settings.langOrder.filter(lang => settings.enabled[lang]));
    langs.add(settings.adminLang);

    return [...langs].map(lang => ({
      lang,
      version: settings.enabled[lang] ? settings.versions[lang] : settings.adminVersion,
    }));
  }, [settings.adminVersion, settings.enabled, settings.langOrder, settings.versions, settings.adminLang]);

  const addPassage = useCallback<StudioValue['addPassage']>(
    async ({ book, chapter, from = null, to = null }) => {
      setLoading(true);

      try {
        const wanted = from ? Array.from({ length: (to || from) - from + 1 }, (_, i) => from + i) : undefined;
        const { data, chapterLength, verses } = await loadPassage(client, {
          book,
          chapter,
          verses: wanted,
          adminLang: settings.adminLang,
          targets,
        });

        if (verses.length === 0) return null;

        const block: Block = {
          id: `${book}-${chapter}-${Date.now()}`,
          book,
          chapter,
          from,
          to,
          adminLang: settings.adminLang,
          versions: Object.fromEntries(targets.map(target => [target.lang, target.version])),
          chapterLength,
          verses,
          groups: verses.map(verse => [verse]),
          data,
        };

        // Newest at the top: the operator adds the passage they are about to
        // use, and the list is read from the top down.
        setWorkspace(current => ({ ...current, blocks: [block, ...current.blocks] }));

        return block;
      } finally {
        setLoading(false);
      }
    },
    [client, settings.adminLang, targets],
  );

  /**
   * Refetch one block into a new shape — used by extending and trimming.
   *
   * The pointer moves in the same update as the shape, because `verseIndex` is
   * an index into `groups`: prepending shifts every card along by one, and a
   * render that had the new groups but the old index would be pointing at the
   * verse before the live one. That render pushes, so the preview and both
   * outputs crossfaded to a neighbouring verse and back for a change that put
   * nothing new on screen.
   */
  const reloadBlock = useCallback(
    async (block: Block, verses: number[], groups: number[][], moveLive: (live: Live) => Live = live => live) => {
      setLoading(true);

      try {
        const loaded = await loadPassage(client, {
          book: block.book,
          chapter: block.chapter,
          verses,
          adminLang: settings.adminLang,
          targets,
        });

        setWorkspace(current => ({
          ...current,
          live: moveLive(current.live),
          blocks: current.blocks.map(item =>
            item.id === block.id
              ? {
                  ...item,
                  chapterLength: loaded.chapterLength,
                  verses: loaded.verses,
                  groups: regroup(groups, loaded.verses),
                  adminLang: settings.adminLang,
                  versions: Object.fromEntries(targets.map(target => [target.lang, target.version])),
                  data: loaded.data,
                }
              : item,
          ),
        }));
      } finally {
        setLoading(false);
      }
    },
    [client, settings.adminLang, targets],
  );

  const extendBlock = useCallback<StudioValue['extendBlock']>(
    async (id, side) => {
      const block = blocks.find(item => item.id === id);

      if (!block) return;

      const plan = planExtension(block, side, live);

      if (!plan) return;

      await reloadBlock(block, plan.verses, plan.groups, () => plan.live);
    },
    [blocks, live, reloadBlock],
  );

  const removeGroup = useCallback<StudioValue['removeGroup']>(
    async (id, groupIndex) => {
      const block = blocks.find(item => item.id === id);

      if (!block) return;

      const plan = planTrim(block, groupIndex);

      if (plan === undefined) return;

      if (plan === null) {
        setWorkspace(current => removeBlockIn(current, id));
        return;
      }

      // Anything from the cut point on is gone, so a live pointer there clears.
      await reloadBlock(block, plan.verses, plan.groups, live =>
        live && live.kind !== 'lyrics' && live.blockId === id && live.verseIndex >= groupIndex ? null : live,
      );
    },
    [blocks, reloadBlock],
  );

  const refreshBlocks = useCallback(async () => {
    if (blocks.length === 0) return;

    setLoading(true);

    try {
      const refreshed = await Promise.all(
        blocks.map(async block => {
          const loaded = await loadPassage(client, {
            book: block.book,
            chapter: block.chapter,
            verses: block.verses,
            adminLang: settings.adminLang,
            targets,
          });

          return {
            ...block,
            chapterLength: loaded.chapterLength,
            verses: loaded.verses,
            groups: regroup(block.groups, loaded.verses),
            adminLang: settings.adminLang,
            versions: Object.fromEntries(targets.map(target => [target.lang, target.version])),
            data: loaded.data,
          };
        }),
      );

      setWorkspace(current => ({ ...current, blocks: refreshed }));
    } finally {
      setLoading(false);
    }
  }, [blocks, client, settings.adminLang, targets]);

  // Changing which languages are armed, or which translation any of them uses,
  // invalidates every open passage. Tracked as a string so re-fetching — which
  // replaces `blocks` — cannot retrigger it.
  const settingsKey = `${settings.adminLang}|${settings.adminVersion}|${settings.langOrder
    .map(lang => `${lang}:${settings.enabled[lang] ? 1 : 0}:${settings.versions[lang]}`)
    .join('|')}`;
  const lastSettingsKey = useRef(settingsKey);

  useEffect(() => {
    if (lastSettingsKey.current === settingsKey) return;

    lastSettingsKey.current = settingsKey;
    void refreshBlocks();
  }, [refreshBlocks, settingsKey]);

  // ------------------------------------------------------------ going live

  const publish = useCallback(
    (block: Block, groupIndex: number) => {
      // The card after this one goes with it, for the stage display. Off the
      // end of the block it comes back empty, which is what the screen should
      // say — the running order does not read on into the next passage.
      pushShow(slideOf(block, groupIndex, settings.enabled), slideOf(block, groupIndex + 1, settings.enabled));

      setWorkspace(current => ({ ...current, live: { blockId: block.id, verseIndex: groupIndex } }));
    },
    [pushShow, settings.enabled],
  );

  /**
   * Arming a language has to reach the card that is already on screen.
   *
   * The look effect re-sends the style, but the verses ride in the payload, so
   * a language switched on mid-service would not appear until the operator
   * moved to another card. This rebuilds the live slide from the block instead.
   *
   * Keyed on what the slide would be rather than on the settings, because
   * arming a language also triggers the re-fetch that gets its verses: the
   * toggle alone would push a slide with the language still empty, and this
   * way the push waits for the data and happens once.
   */
  const liveSlide = useMemo(() => {
    if (!live || live.kind === 'lyrics') return null;

    const block = blocks.find(item => item.id === live.blockId);

    return block
      ? [slideOf(block, live.verseIndex, settings.enabled), slideOf(block, live.verseIndex + 1, settings.enabled)]
      : null;
  }, [blocks, live, settings.enabled]);

  useEffect(() => {
    if (!liveSlide) return;

    const wanted = JSON.stringify(liveSlide);

    if (wanted === pushedRef.current) return;

    pushShow(liveSlide[0], liveSlide[1]);
  }, [liveSlide, pushShow]);

  /**
   * Join or split cards, and put the result on the outputs when the card that
   * changed is the one on screen. Regrouping only rewrites the workspace, so
   * without this the projector keeps the slide it was last handed — joining the
   * live verse with the next one left the single verse showing.
   */
  const regroupCards = useCallback(
    (operate: (workspace: Workspace, id: string, groupIndex: number) => Workspace, id: string, groupIndex: number) => {
      const before: Workspace = { blocks, live };
      const after = operate(before, id, groupIndex);

      setWorkspace(after);

      const wasLive = liveGroup(before);
      const nowLive = liveGroup(after);

      if (!nowLive || String(wasLive) === String(nowLive)) return;

      const block = after.blocks.find(item => item.id === id);

      if (block && after.live && after.live.kind !== 'lyrics') publish(block, after.live.verseIndex);
    },
    [blocks, live, publish],
  );

  const goLive = useCallback<StudioValue['goLive']>(
    (blockId, verseIndex) => {
      const block = blocks.find(item => item.id === blockId);

      if (block) publish(block, verseIndex);
    },
    [blocks, publish],
  );

  /** Clicking the card that is already live takes the projector back to black. */
  const clearProjector = useCallback(() => {
    pushShow(emptyShowData());
    setWorkspace(current => ({ ...current, live: null }));
  }, [pushShow]);

  const selectVerse = useCallback<StudioValue['selectVerse']>(
    (blockId, verseIndex) => {
      if (live && live.kind !== 'lyrics' && live.blockId === blockId && live.verseIndex === verseIndex) {
        clearProjector();
        return;
      }

      goLive(blockId, verseIndex);
    },
    [clearProjector, goLive, live],
  );

  const publishLyrics = useCallback<StudioValue['publishLyrics']>(
    (song, slideIndex) => {
      const slide = song.slides[slideIndex];

      if (!slide) return;

      const after = song.slides[slideIndex + 1];

      pushShow(
        { ...emptyShowData(), lyrics: { title: song.title, text: slide.text } },
        after ? { ...emptyShowData(), lyrics: { title: song.title, text: after.text } } : emptyShowData(),
      );
      setWorkspace(current => ({ ...current, live: { kind: 'lyrics', songId: song.id, slideIndex } }));
    },
    [pushShow],
  );

  const selectLyric = useCallback<StudioValue['selectLyric']>(
    (song, slideIndex) => {
      if (live?.kind === 'lyrics' && live.songId === song.id && live.slideIndex === slideIndex) {
        clearProjector();
        return;
      }

      publishLyrics(song, slideIndex);
    },
    [clearProjector, live, publishLyrics],
  );

  const stepLive = useCallback<StudioValue['stepLive']>(
    direction => {
      if (!live) return;

      if (live.kind === 'lyrics') {
        const song = songs.find(item => item.id === live.songId);
        const next = live.slideIndex + direction;

        if (song && next >= 0 && next < song.slides.length) publishLyrics(song, next);

        return;
      }

      const block = blocks.find(item => item.id === live.blockId);
      const next = stepWithin(block, live, direction);

      if (block && next !== null) publish(block, next);
    },
    [blocks, live, publish, publishLyrics, songs],
  );

  // ------------------------------------------------------------ songs

  const importSongs = useCallback<StudioValue['importSongs']>(
    async imported => {
      if (imported.length === 0) return;

      // A re-import replaces the song of the same title rather than doubling
      // it. The conflict target is `title_key`, the stored lowercase title,
      // because PostgREST cannot name an expression index.
      const { data, error } = await db
        .from('songs')
        .upsert(
          imported.map(song => ({
            user_id: initial.settings.user_id,
            title: song.title,
            slides: song.slides,
            source: song.source ?? 'propresenter',
          })),
          { onConflict: 'user_id,title_key' },
        )
        .select();

      if (error) throw new Error(error.message);
      if (!data) return;

      setSongs(current => {
        const byTitle = new Map(current.map(song => [song.title.toLowerCase(), song]));

        data.forEach(row =>
          byTitle.set(row.title.toLowerCase(), {
            id: row.id,
            title: row.title,
            slides: row.slides as Song['slides'],
            source: row.source,
          }),
        );

        return [...byTitle.values()].sort((a, b) => a.title.localeCompare(b.title));
      });
    },
    [db, initial.settings.user_id],
  );

  const saveSong = useCallback<StudioValue['saveSong']>(
    async song => {
      // A song written in the console has a placeholder id until it is saved;
      // leaving it off lets Postgres mint the real one.
      const saved = /^[0-9a-f-]{36}$/i.test(song.id) ? { id: song.id } : {};

      const { data, error } = await db
        .from('songs')
        .upsert({ ...saved, user_id: initial.settings.user_id, title: song.title, slides: song.slides })
        .select()
        .single();

      // One title per library is a unique index, and Postgres says so in its own
      // words. The operator gets ours.
      if (error?.code === '23505') throw new Error(`A song called “${song.title}” is already in the library.`);
      if (error) throw new Error(error.message);
      if (!data) return;

      const written: Song = { id: data.id, title: data.title, slides: data.slides as Song['slides'] };

      setSongs(current => {
        const without = current.filter(item => item.id !== written.id);

        return [...without, written].sort((a, b) => a.title.localeCompare(b.title));
      });

      // A slide that was live and has since been edited away clears the output.
      setWorkspace(current => {
        if (current.live?.kind !== 'lyrics' || current.live.songId !== song.id) return current;

        return current.live.slideIndex < song.slides.length ? current : { ...current, live: null };
      });

      return written;
    },
    [db, initial.settings.user_id],
  );

  /**
   * A song's slides in a new order, dragged on the cards themselves.
   *
   * Applied here first and written afterwards. The drag hands its order over on
   * release and forgets it — it is the list's order now, not the drag's — so
   * waiting for the round trip meant the cards fell back into the order they
   * were dragged out of and rearranged again a moment later, in front of the
   * operator, which reads as the words moving by themselves.
   *
   * The live pointer is an index into the list, so moving a card has to move
   * the pointer with the slide it names — exactly as a block operation does —
   * or the projector would keep the index and show whatever slid into it. The
   * slide is republished rather than merely repointed: its words have not
   * changed, but the one *after* it may have, and the stage display draws that.
   */
  const reorderSlides = useCallback<StudioValue['reorderSlides']>(
    async (song, ids) => {
      const byId = new Map(song.slides.map(slide => [slide.id, slide]));
      const slides = ids.map(id => byId.get(id)).filter((slide): slide is SongSlide => Boolean(slide));

      // A drag that arrived at a list this one does not recognise — a slide
      // deleted on another console mid-drag — is dropped rather than applied
      // half-way.
      if (slides.length !== song.slides.length) return;

      const moved: Song = { ...song, slides };
      const onScreen =
        live?.kind === 'lyrics' && live.songId === song.id ? song.slides[live.slideIndex]?.id : null;

      setSongs(current => current.map(item => (item.id === song.id ? moved : item)));

      if (onScreen) {
        const at = slides.findIndex(slide => slide.id === onScreen);

        if (at >= 0) publishLyrics(moved, at);
      }

      try {
        await saveSong(moved);
      } catch {
        // The order on screen is one nothing agreed to keep, so it goes back to
        // the one the database still holds rather than sitting there looking
        // saved.
        setSongs(current => current.map(item => (item.id === song.id ? song : item)));
      }
    },
    [live, publishLyrics, saveSong],
  );

  const removeSong = useCallback<StudioValue['removeSong']>(
    async id => {
      await db.from('songs').delete().eq('id', id);

      setSongs(current => current.filter(song => song.id !== id));
      setSetlist(current => current.filter(songId => songId !== id));
      setActiveSong(current => (current === id ? null : current));
      setWorkspace(current => ({
        ...current,
        live: current.live?.kind === 'lyrics' && current.live.songId === id ? null : current.live,
      }));
    },
    [db],
  );

  const placeInSetlist = useCallback<StudioValue['placeInSetlist']>((songId, index) => {
    setSetlist(current => {
      const from = current.indexOf(songId);
      const without = current.filter(id => id !== songId);
      // Removing it first shifts every later slot down by one.
      const target = from !== -1 && from < index ? index - 1 : index;

      without.splice(Math.max(0, Math.min(target, without.length)), 0, songId);

      return without;
    });
  }, []);

  // Ids the caller has not seen — a song added on another console mid-drag —
  // keep their place at the end rather than dropping out of the order.
  const orderSetlist = useCallback<StudioValue['orderSetlist']>(songIds => {
    setSetlist(current => [...songIds.filter(id => current.includes(id)), ...current.filter(id => !songIds.includes(id))]);
  }, []);

  const value = useMemo<StudioValue>(
    () => ({
      session: initial.session,
      plan: initial.plan,
      settings,
      update,
      setLangOrder,
      addLang,
      removeLang,
      setLocalBackground,
      blocks,
      live,
      loading,
      addPassage,
      extendBlock,
      removeGroup,
      joinGroup: (id, groupIndex) => regroupCards(joinGroupIn, id, groupIndex),
      splitGroup: (id, groupIndex) => regroupCards(splitGroupIn, id, groupIndex),
      removeBlock: id => setWorkspace(current => removeBlockIn(current, id)),
      moveBlock: (id, direction) => setWorkspace(current => moveBlockIn(current, id, direction)),
      moveBlockTo: (id, insertIndex) => setWorkspace(current => moveBlockToIn(current, id, insertIndex)),
      orderBlocks: ids => setWorkspace(current => orderBlocksIn(current, ids)),
      toggleBlockCollapsed: id => setWorkspace(current => toggleCollapsed(current, id)),
      setAllCollapsed: collapsed => setWorkspace(current => setCollapsed(current, collapsed)),
      clearBlocks: () => setWorkspace({ blocks: [], live: null }),
      refreshBlocks,
      goLive,
      selectVerse,
      stepLive,
      clearProjector,
      cards,
      cardRun,
      cardDraft,
      setCardDraft,
      blackout,
      toggleBlackout,
      showCard,
      clearCard,
      saveCard,
      removeCard,
      songs,
      activeSongId,
      setActiveSongId,
      songScope,
      setlist,
      importSongs,
      saveSong,
      reorderSlides,
      removeSong,
      clearSongs: async () => {
        await db.from('songs').delete().eq('user_id', initial.settings.user_id);

        setSongs([]);
        setSetlist([]);
        setActiveSong(null);
        setWorkspace(current => ({ ...current, live: current.live?.kind === 'lyrics' ? null : current.live }));
      },
      placeInSetlist,
      orderSetlist,
      removeFromSetlist: songId => setSetlist(current => current.filter(id => id !== songId)),
      clearSetlist: () => setSetlist([]),
      publishLyrics,
      selectLyric,
      showData,
      nextShowData,
      timer,
      updateTimer,
      tab,
      setTab,
      cardSize,
      setCardSize,
      peers,
      loadChapterCount: query => loadChapterCount(client, query),
      loadVerseCount: query => loadVerseCount(client, query),
    }),
    [
      activeSongId,
      setActiveSongId,
      songScope,
      addPassage,
      blackout,
      blocks,
      cardSize,
      cardDraft,
      cardRun,
      cards,
      clearCard,
      clearProjector,
      client,
      db,
      initial.settings.user_id,
      extendBlock,
      goLive,
      importSongs,
      initial.plan,
      initial.session,
      live,
      loading,
      peers,
      placeInSetlist,
      orderSetlist,
      publishLyrics,
      refreshBlocks,
      regroupCards,
      removeCard,
      removeGroup,
      saveCard,
      setCardDraft,
      setLangOrder,
      toggleBlackout,
      showCard,
      addLang,
      removeLang,
      removeSong,
      saveSong,
      reorderSlides,
      selectLyric,
      selectVerse,
      setLocalBackground,
      setlist,
      settings,
      showData,
      nextShowData,
      songs,
      stepLive,
      tab,
      timer,
      update,
      updateTimer,
    ],
  );

  return <StudioContext.Provider value={value}>{children}</StudioContext.Provider>;
};
