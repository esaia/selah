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
import { lyricsShowData, songFromRow, songLangsRow, syncSwitches } from '@/lib/lyrics/langs';
import { homeOf } from '@/lib/lyrics/lists';
import { keepSame } from '@/lib/projector/keepSame';
import { DEFAULT_THEME, LOCAL_THEME } from '@/lib/projector/themes';
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
  type OpenList,
  type ShowData,
  type Song,
  type SongLibrary,
  type SongPlaylist,
  type SongSlide,
} from '@/lib/types';

import {
  joinGroup as joinGroupIn,
  liveGroup,
  moveBlock as moveBlockIn,
  moveBlockTo as moveBlockToIn,
  orderBlocks as orderBlocksIn,
  planDropFirst,
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
  /** Who is signed in, so the console can say so. */
  email: string;
  settings: SettingsRow;
  workspace: {
    blocks: Block[];
    live: Live;
    activeSongId: string | null;
    /** The library or playlist the panel was showing, if it said. */
    open: OpenList | null;
    tab: Tab;
    cardSize: number;
    /** The name-card form as the operator left it, unvalidated. */
    cardDraft: unknown;
  };
  songs: Song[];
  libraries: SongLibrary[];
  playlists: SongPlaylist[];
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


interface StudioValue {
  session: StudioSession;
  email: string;
  plan: string;

  settings: Settings;
  update: (patch: Partial<Settings>) => void;
  setLangOrder: (order: Lang[]) => void;
  setAdminLang: (lang: Lang) => void;
  addLang: (lang: Lang) => void;
  removeLang: (lang: Lang) => void;
  setLocalBackground: (file: LocalFileMeta | null) => void;

  blocks: Block[];
  live: Live;
  loading: boolean;

  addPassage: (request: { book: number; chapter: number; from?: number | null; to?: number | null }) => Promise<Block | null>;
  /** One verse on that side, or the rest of the chapter when `span` says so. */
  extendBlock: (id: string, side: 'start' | 'end', span?: 'verse' | 'chapter') => Promise<void>;
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
  /** The song last asked for off the rail, which is what the panel scrolls to. */
  songCue: { id: string; at: number } | null;
  /**
   * Open a song. `from` says which list it was picked out of, because that is
   * what the workspace shows: a song picked off the playlist is one item of a
   * running order the operator is working through, and one picked out of the
   * library is the only thing they asked to see.
   */
  setActiveSongId: (id: string | null) => void;

  /**
   * The shelves and the running orders, and which of them the panel is showing.
   *
   * A library holds songs — one library each, so moving a song files it
   * somewhere else rather than copying it — and a playlist only names them in
   * an order, so deleting one takes the order and nothing else.
   */
  libraries: SongLibrary[];
  playlists: SongPlaylist[];
  open: OpenList;
  openList: (open: OpenList) => void;
  addLibrary: (name: string) => Promise<void>;
  addPlaylist: (name: string) => Promise<void>;
  renameList: (open: OpenList, name: string) => Promise<void>;
  removeList: (open: OpenList) => Promise<void>;
  orderLists: (kind: OpenList['kind'], ids: string[]) => Promise<void>;
  /**
   * File songs on another shelf; they leave the one they were on.
   *
   * These four take a list because the rail selects one: a Sunday's worth of
   * songs dragged onto a playlist is one act to the operator, and should be
   * one write rather than eleven.
   */
  moveSongsToLibrary: (songIds: string[], libraryId: string) => Promise<void>;
  /** Put songs at a place in a running order, moving any already on it. */
  placeInPlaylist: (playlistId: string, songIds: string[], index: number) => Promise<void>;
  orderPlaylist: (playlistId: string, songIds: string[]) => Promise<void>;
  removeFromPlaylist: (playlistId: string, songIds: string[]) => Promise<void>;

  /**
   * Bring songs in. Given a name, they arrive on a new library of their own —
   * a bundle is somebody's library already, and tipping it into the one on
   * screen mixes two collections that were never meant to be one.
   */
  importSongs: (songs: Song[], intoNewLibrary?: string) => Promise<void>;
  /** Writes the song and hands back the row, whose id is the database's, not the draft's. */
  saveSong: (song: Song) => Promise<Song | undefined>;
  reorderSlides: (song: Song, ids: string[]) => Promise<void>;
  /**
   * The song's languages as the rail leaves them — added, renamed, reordered,
   * switched off — written and, when that song is live, sent again.
   */
  setSongLangs: (song: Song) => Promise<void>;
  /** Drop one slide from a song, from the grid rather than the editor. */
  removeSlide: (song: Song, slideId: string) => Promise<void>;
  removeSongs: (ids: string[]) => Promise<void>;
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

  // Read by `saveSong` when it propagates a switch to the songs that share a
  // language name. A ref rather than a dependency: rebuilding that callback on
  // every song edit would rebuild half the console with it.
  const songsRef = useRef(songs);

  useEffect(() => {
    songsRef.current = songs;
  }, [songs]);
  const [activeSongId, setActiveSong] = useState<string | null>(initial.workspace.activeSongId);

  /**
   * The song the operator has just asked to see, and when they asked.
   *
   * Opening a song off the rail takes the panel to it; a slide going live only
   * lights its row. The two must not be the same signal — a running order is
   * laid out end to end, so a slide sent from the song after the one being
   * read would otherwise scroll the panel out from under the operator
   * mid-service. The count is what makes asking for the same song twice a
   * second request rather than no change at all.
   */
  const [songCue, setSongCue] = useState<{ id: string; at: number } | null>(null);

  const setActiveSongId = useCallback<StudioValue['setActiveSongId']>(id => {
    setActiveSong(id);

    if (id) setSongCue(current => ({ id, at: (current?.at ?? 0) + 1 }));
  }, []);
  const [libraries, setLibraries] = useState<SongLibrary[]>(initial.libraries);
  const [playlists, setPlaylists] = useState<SongPlaylist[]>(initial.playlists);

  // What the panel is showing. A row that names a list which has since been
  // deleted, and a console that has never said, both fall back to the first
  // library — the shelf every song already filed is on.
  const [openList, setOpenList] = useState<OpenList | null>(initial.workspace.open);

  const open = useMemo<OpenList>(() => {
    const named =
      openList?.kind === 'playlist'
        ? playlists.some(list => list.id === openList.id)
        : libraries.some(list => list.id === openList?.id);

    if (openList && named) return openList;
    if (libraries[0]) return { kind: 'library', id: libraries[0].id };
    if (playlists[0]) return { kind: 'playlist', id: playlists[0].id };

    return { kind: 'library', id: '' };
  }, [libraries, openList, playlists]);

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
      // A slide that says nothing new keeps its object, the way the outputs
      // keep theirs. The preview panel reads "a new slide has arrived" off the
      // reference, and re-sending the words already on screen — dragging the
      // cards around behind a live one, or a look change re-pushing it — would
      // otherwise crossfade the panel out and back for a change it does not
      // draw.
      const slide = keepSame(showRef.current, payload);
      const after = keepSame(nextRef.current, next);

      setShowData(slide);
      showRef.current = slide;
      setNextShowData(after);
      nextRef.current = after;

      pushedRef.current = JSON.stringify([slide, after]);

      channelRef.current?.publishSlide(payloadOf(slide, after, timerRef.current));

      void save(
        db.from('session_state').upsert({
          session_id: initial.session.id,
          show_data: slide,
          next_show_data: after,
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

  useDebouncedSave({ workspace, open, activeSongId, tab, cardSize, cardDraft }, state => {
    void save(
      db.from('session_workspace').upsert({
        session_id: initial.session.id,
        blocks: state.workspace.blocks,
        live: state.workspace.live,
        active_song_id: state.activeSongId,
        open_kind: state.open.kind,
        open_id: state.open.id || null,
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
   * Switch the language the cards are read in, carrying a translation that
   * belongs to it.
   *
   * `adminVersion` is a translation id, and an id means nothing outside its own
   * language — so it cannot survive a change of `adminLang` on its own. Left
   * alone it points at the previous language's translation, every verse 404s,
   * and the cards keep showing what they showed before while the dropdown
   * beside them displays its first option as though it were selected. Setting
   * both together is the only way the pair is ever meaningful.
   */
  const setAdminLang = useCallback((lang: Lang) => {
    setSettings(current =>
      current.adminLang === lang
        ? current
        : {
            ...current,
            adminLang: lang,
            // An armed language reads in whatever the projector carries; only
            // an unarmed one needs a browsing translation of its own.
            adminVersion: current.versions[lang] || defaultVersionOf(lang),
          },
    );
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
        : { ...current, localImage: null, theme: current.theme === LOCAL_THEME ? DEFAULT_THEME : current.theme },
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
    async (id, side, span = 'verse') => {
      const block = blocks.find(item => item.id === id);

      if (!block) return;

      const plan = planExtension(block, side, live, span);

      if (!plan) return;

      await reloadBlock(block, plan.verses, plan.groups, () => plan.live);
    },
    [blocks, live, reloadBlock],
  );

  const removeGroup = useCallback<StudioValue['removeGroup']>(
    async (id, groupIndex) => {
      const block = blocks.find(item => item.id === id);

      if (!block) return;

      const drop = () => setWorkspace(current => removeBlockIn(current, id));

      // The first card has nothing before it to keep, so its cut takes itself
      // and the passage starts one verse later: every card behind it slides
      // down one, and `planDropFirst` has already walked the live pointer back
      // with them.
      if (groupIndex === 0) {
        const plan = planDropFirst(block, live);

        if (plan === undefined) return;

        if (plan === null) {
          drop();
          return;
        }

        await reloadBlock(block, plan.verses, plan.groups, () => plan.live);
        return;
      }

      // Every other card takes the rest of the passage with it, so a pointer
      // at or past the cut has nothing left to point at.
      const plan = planTrim(block, groupIndex);

      if (plan === undefined) return;

      if (plan === null) {
        drop();
        return;
      }

      await reloadBlock(block, plan.verses, plan.groups, current =>
        current && current.kind !== 'lyrics' && current.blockId === id && current.verseIndex >= groupIndex
          ? null
          : current,
      );
    },
    [blocks, live, reloadBlock],
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
   * The same, for a song on the wall.
   *
   * Rebuilt from the song rather than from the pointer, so anything that
   * changes the song a slide belongs to — switching a language off, renaming
   * one, dragging one to the front, fixing a typo — reaches the outputs
   * without every one of those paths having to remember to send it. Which is
   * how a language switched off went on being sung: the send lived in the one
   * action, and any other way to the same change had no send of its own.
   */
  const liveLyric = useMemo(() => {
    if (live?.kind !== 'lyrics') return null;

    const song = songs.find(item => item.id === live.songId);
    const slide = song?.slides[live.slideIndex];

    if (!song || !slide) return null;

    const after = song.slides[live.slideIndex + 1];

    return [lyricsShowData(song, slide), after ? lyricsShowData(song, after) : emptyShowData()];
  }, [live, songs]);

  useEffect(() => {
    if (!liveLyric) return;

    const wanted = JSON.stringify(liveLyric);

    if (wanted === pushedRef.current) return;

    pushShow(liveLyric[0], liveLyric[1]);
  }, [liveLyric, pushShow]);

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

      pushShow(lyricsShowData(song, slide), after ? lyricsShowData(song, after) : emptyShowData());
      setWorkspace(current => ({ ...current, live: { kind: 'lyrics', songId: song.id, slideIndex } }));

      // A running order is laid out end to end, so the slide that went up may
      // belong to the song after the one the rail was lit on. Whatever is on
      // the wall is what the operator is working on, and the rail says so —
      // the row lights up, but the panel stays where they left it.
      setActiveSong(song.id);
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

  /**
   * Where a song written or imported right now belongs: the shelf the operator
   * is looking at, or the first one when they are looking at a running order.
   * Importing a Christmas bundle with Christmas open should not file it under
   * Library because that happens to be first.
   */
  const filing = open.kind === 'library' && open.id ? open.id : homeOf(libraries);

  const importSongs = useCallback<StudioValue['importSongs']>(
    async (imported, intoNewLibrary) => {
      if (imported.length === 0) return;

      // A shelf of its own, named after what was dropped. Two bundles of the
      // same name are two imports and get two shelves, because that is what
      // the operator did — the alternative is a silent merge.
      let shelf: string | undefined;

      if (intoNewLibrary) {
        const taken = libraries.filter(list => list.name === intoNewLibrary).length;
        const name = taken > 0 ? `${intoNewLibrary} ${taken + 1}` : intoNewLibrary;

        const { data } = await db
          .from('song_libraries')
          .insert({ user_id: initial.settings.user_id, name, position: libraries.length })
          .select('id, name')
          .single();

        if (data) {
          shelf = data.id;
          setLibraries(current => [...current, data]);
          setOpenList({ kind: 'library', id: data.id });
        }
      }

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
            langs: songLangsRow(song),
            library_id: shelf ?? song.libraryId ?? filing ?? null,
            source: song.source ?? 'propresenter',
          })),
          { onConflict: 'user_id,title_key' },
        )
        .select();

      if (error) throw new Error(error.message);
      if (!data) return;

      setSongs(current => {
        const byTitle = new Map(current.map(song => [song.title.toLowerCase(), song]));

        data.forEach(row => byTitle.set(row.title.toLowerCase(), songFromRow(row)));

        return [...byTitle.values()].sort((a, b) => a.title.localeCompare(b.title));
      });
    },
    [db, filing, initial.settings.user_id, libraries],
  );

  const saveSong = useCallback<StudioValue['saveSong']>(
    async song => {
      // A song written in the console has a placeholder id until it is saved;
      // leaving it off lets Postgres mint the real one.
      const saved = /^[0-9a-f-]{36}$/i.test(song.id) ? { id: song.id } : {};

      const { data, error } = await db
        .from('songs')
        .upsert({
          ...saved,
          user_id: initial.settings.user_id,
          title: song.title,
          slides: song.slides,
          langs: songLangsRow(song),
          library_id: song.libraryId ?? filing ?? null,
        })
        .select()
        .single();

      // One title per library is a unique index, and Postgres says so in its own
      // words. The operator gets ours.
      if (error?.code === '23505') throw new Error(`A song called “${song.title}” is already in the library.`);
      if (error) throw new Error(error.message);
      if (!data) return;

      const written = songFromRow(data);

      // A switch thrown here is thrown on every song that calls a language by
      // the same name: a bilingual service is a dozen songs with the same two
      // languages, and setting each of them by hand is the thing an operator
      // does eleven times and forgets on the twelfth. Only the switches
      // travel, and only to songs they would actually change.
      const alike = syncSwitches(songsRef.current, written);

      if (alike.length > 0) {
        setSongs(current =>
          current.map(item => alike.find(synced => synced.id === item.id) ?? item),
        );

        await Promise.all(
          alike.map(synced =>
            save(db.from('songs').update({ langs: songLangsRow(synced) }).eq('id', synced.id), 'the other songs'),
          ),
        );
      }

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
    [db, filing, initial.settings.user_id],
  );

  /**
   * A song's languages, changed while the song may be on the wall.
   *
   * Only a write: the effect above notices that the live song has changed and
   * sends the slide again, so a language switched off reaches the room without
   * waiting for the next slide.
   */
  const setSongLangs = useCallback<StudioValue['setSongLangs']>(
    async next => {
      const before = songsRef.current.find(song => song.id === next.id);

      // Moved here first, written second. A radio that waits for the round
      // trip before it moves reads as a control that did not take the click —
      // and this is a control the operator uses mid-service, where a beat of
      // "did that work?" is a beat spent looking at the console instead of the
      // room. The effect that watches `songs` sends the slide again, so the
      // wall follows the click at the same moment the rail does.
      setSongs(current => current.map(song => (song.id === next.id ? next : song)));

      try {
        await saveSong(next);
      } catch (failure) {
        // Nothing agreed to the change, so the rail goes back to what the
        // database still holds rather than showing a switch that is not set.
        if (before) setSongs(current => current.map(song => (song.id === before.id ? before : song)));

        throw failure;
      }
    },
    [saveSong],
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

  /**
   * One slide out of a song, taken from the card itself.
   *
   * The editor could already do this, but reaching a slide there is opening a
   * dialog, finding the row and coming back — and the operator is looking
   * straight at the card they mean. So the grid deletes the way ProPresenter's
   * does.
   *
   * The live pointer is an index into the list, so dropping a card ahead of it
   * has to move it: `saveSong` only clears a pointer that has run off the end,
   * which would leave slide 7 live and showing what used to be slide 8. The
   * slide is republished rather than merely repointed, because the stage
   * display draws the one *after* it and that has changed.
   */
  const removeSlide = useCallback<StudioValue['removeSlide']>(
    async (song, slideId) => {
      const slides = song.slides.filter(slide => slide.id !== slideId);

      // Not in this song, or the last one standing — a song with no slides is
      // a row the grid cannot draw and the editor is the place to empty one.
      if (slides.length === song.slides.length || slides.length === 0) return;

      const trimmed: Song = { ...song, slides };
      const onScreen =
        live?.kind === 'lyrics' && live.songId === song.id ? song.slides[live.slideIndex]?.id : null;

      setSongs(current => current.map(item => (item.id === song.id ? trimmed : item)));

      if (onScreen) {
        const at = slides.findIndex(slide => slide.id === onScreen);

        // The card that was on the projector is the one that just went.
        if (at >= 0) publishLyrics(trimmed, at);
        else clearProjector();
      }

      try {
        await saveSong(trimmed);
      } catch {
        // Nothing agreed to keep the shorter song, so the grid goes back to the
        // one the database still holds.
        setSongs(current => current.map(item => (item.id === song.id ? song : item)));
      }
    },
    [clearProjector, live, publishLyrics, saveSong],
  );

  const removeSongs = useCallback<StudioValue['removeSongs']>(
    async ids => {
      if (ids.length === 0) return;

      await db.from('songs').delete().in('id', ids);

      setSongs(current => current.filter(song => !ids.includes(song.id)));
      setActiveSong(current => (current && ids.includes(current) ? null : current));

      // A deleted song leaves every running order it was on. The lists are
      // rewritten locally and in the row, because a playlist naming a song
      // that no longer exists would keep a gap in the order for ever.
      setPlaylists(current =>
        current.map(list => {
          if (!list.songs.some(songId => ids.includes(songId))) return list;

          const songIds = list.songs.filter(songId => !ids.includes(songId));

          void save(db.from('song_playlists').update({ songs: songIds }).eq('id', list.id), 'the playlist');

          return { ...list, songs: songIds };
        }),
      );

      setWorkspace(current => ({
        ...current,
        live: current.live?.kind === 'lyrics' && ids.includes(current.live.songId) ? null : current.live,
      }));
    },
    [db],
  );

  /**
   * The lists themselves.
   *
   * Written straight through rather than debounced: naming a playlist or
   * filing a song is a deliberate act with a visible result, and the operator
   * who does it at 10:29 and closes the laptop should find it there at 10:30.
   * Local state moves first so the rail answers the click, and the write is
   * what the next console reads.
   */
  const addLibrary = useCallback<StudioValue['addLibrary']>(
    async name => {
      const { data, error } = await db
        .from('song_libraries')
        .insert({ user_id: initial.settings.user_id, name, position: libraries.length })
        .select('id, name')
        .single();

      if (error) throw new Error(error.message);
      if (!data) return;

      setLibraries(current => [...current, data]);
      setOpenList({ kind: 'library', id: data.id });
    },
    [db, initial.settings.user_id, libraries.length],
  );

  const addPlaylist = useCallback<StudioValue['addPlaylist']>(
    async name => {
      const { data, error } = await db
        .from('song_playlists')
        .insert({ user_id: initial.settings.user_id, name, songs: [], position: playlists.length })
        .select('id, name, songs')
        .single();

      if (error) throw new Error(error.message);
      if (!data) return;

      setPlaylists(current => [...current, { id: data.id, name: data.name, songs: [] }]);
      setOpenList({ kind: 'playlist', id: data.id });
    },
    [db, initial.settings.user_id, playlists.length],
  );

  const renameList = useCallback<StudioValue['renameList']>(
    async (list, name) => {
      const named = <T extends { id: string; name: string }>(current: T[]) =>
        current.map(item => (item.id === list.id ? { ...item, name } : item));

      if (list.kind === 'playlist') {
        setPlaylists(named);
        await save(db.from('song_playlists').update({ name }).eq('id', list.id), 'the name');
        return;
      }

      setLibraries(named);
      await save(db.from('song_libraries').update({ name }).eq('id', list.id), 'the name');
    },
    [db],
  );

  /**
   * A list dropped.
   *
   * A playlist takes only the order with it. A library would take its songs,
   * which is a library being deleted and a hundred songs going quietly with
   * it — so they are filed on the first library that remains instead, and the
   * last library cannot go at all, because then there would be nowhere to put
   * the next import.
   */
  const removeList = useCallback<StudioValue['removeList']>(
    async list => {
      if (list.kind === 'playlist') {
        setPlaylists(current => current.filter(item => item.id !== list.id));
        await save(db.from('song_playlists').delete().eq('id', list.id), 'the playlist');
        return;
      }

      const shelter = libraries.find(item => item.id !== list.id);

      if (!shelter) return;

      setSongs(current =>
        current.map(song => (song.libraryId === list.id ? { ...song, libraryId: shelter.id } : song)),
      );
      setLibraries(current => current.filter(item => item.id !== list.id));

      await save(
        db.from('songs').update({ library_id: shelter.id }).eq('library_id', list.id),
        'the songs that were on it',
      );
      await save(db.from('song_libraries').delete().eq('id', list.id), 'the library');
    },
    [db, libraries],
  );

  const orderLists = useCallback<StudioValue['orderLists']>(
    async (kind, ids) => {
      // A list made on another console mid-drag keeps its place on the end
      // rather than dropping out of the order.
      const sorted = <T extends { id: string }>(current: T[]) => [
        ...ids.map(id => current.find(item => item.id === id)).filter((item): item is T => Boolean(item)),
        ...current.filter(item => !ids.includes(item.id)),
      ];

      if (kind === 'playlist') {
        setPlaylists(sorted);
      } else {
        setLibraries(sorted);
      }

      await Promise.all(
        ids.map((id, position) =>
          save(
            db.from(kind === 'playlist' ? 'song_playlists' : 'song_libraries').update({ position }).eq('id', id),
            'the order',
          ),
        ),
      );
    },
    [db],
  );

  const moveSongsToLibrary = useCallback<StudioValue['moveSongsToLibrary']>(
    async (songIds, libraryId) => {
      if (songIds.length === 0) return;

      setSongs(current => current.map(song => (songIds.includes(song.id) ? { ...song, libraryId } : song)));

      await save(
        db.from('songs').update({ library_id: libraryId }).in('id', songIds),
        songIds.length > 1 ? 'the songs' : 'the song',
      );
    },
    [db],
  );

  /** One running order, rewritten whole — the shape a drag leaves it in. */
  const writePlaylist = useCallback(
    async (playlistId: string, songIds: string[]) => {
      setPlaylists(current =>
        current.map(list => (list.id === playlistId ? { ...list, songs: songIds } : list)),
      );

      await save(db.from('song_playlists').update({ songs: songIds }).eq('id', playlistId), 'the playlist');
    },
    [db],
  );

  const placeInPlaylist = useCallback<StudioValue['placeInPlaylist']>(
    async (playlistId, songIds, index) => {
      const list = playlists.find(item => item.id === playlistId);

      if (!list || songIds.length === 0) return;

      const without = list.songs.filter(id => !songIds.includes(id));
      // Taking them out first shifts every later slot down by one, so the drop
      // lands where the line was drawn rather than one place further on for
      // each song that was already above it.
      const above = list.songs.filter((id, at) => songIds.includes(id) && at < index).length;

      without.splice(Math.max(0, Math.min(index - above, without.length)), 0, ...songIds);

      await writePlaylist(playlistId, without);
    },
    [playlists, writePlaylist],
  );

  const orderPlaylist = useCallback<StudioValue['orderPlaylist']>(
    async (playlistId, songIds) => {
      const list = playlists.find(item => item.id === playlistId);

      if (!list) return;

      await writePlaylist(playlistId, [
        ...songIds.filter(id => list.songs.includes(id)),
        ...list.songs.filter(id => !songIds.includes(id)),
      ]);
    },
    [playlists, writePlaylist],
  );

  const removeFromPlaylist = useCallback<StudioValue['removeFromPlaylist']>(
    async (playlistId, songIds) => {
      const list = playlists.find(item => item.id === playlistId);

      if (!list) return;

      await writePlaylist(
        playlistId,
        list.songs.filter(id => !songIds.includes(id)),
      );
    },
    [playlists, writePlaylist],
  );

  const value = useMemo<StudioValue>(
    () => ({
      session: initial.session,
      email: initial.email,
      plan: initial.plan,
      settings,
      update,
      setLangOrder,
      setAdminLang,
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
      songCue,
      setActiveSongId,
      libraries,
      playlists,
      open,
      openList: setOpenList,
      addLibrary,
      addPlaylist,
      renameList,
      removeList,
      orderLists,
      moveSongsToLibrary,
      placeInPlaylist,
      orderPlaylist,
      removeFromPlaylist,
      importSongs,
      saveSong,
      reorderSlides,
      setSongLangs,
      removeSlide,
      removeSongs,
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
      songCue,
      setActiveSongId,
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
      extendBlock,
      goLive,
      importSongs,
      initial.email,
      initial.plan,
      initial.session,
      live,
      loading,
      peers,
      libraries,
      playlists,
      open,
      addLibrary,
      addPlaylist,
      renameList,
      removeList,
      orderLists,
      moveSongsToLibrary,
      placeInPlaylist,
      orderPlaylist,
      removeFromPlaylist,
      publishLyrics,
      refreshBlocks,
      regroupCards,
      removeCard,
      removeGroup,
      saveCard,
      setCardDraft,
      setLangOrder,
      setAdminLang,
      toggleBlackout,
      showCard,
      addLang,
      removeLang,
      removeSongs,
      saveSong,
      reorderSlides,
      setSongLangs,
      removeSlide,
      selectLyric,
      selectVerse,
      setLocalBackground,
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
