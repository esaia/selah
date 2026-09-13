'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { langSpecsOf, psalmSchemeOf, versionValueOf, type CustomTranslation } from '@/lib/bible/custom';
import type { ArchiveEntry } from '@/lib/bible/import/archives';
import { fetchArchiveEntry, parseBibleFiles } from '@/lib/bible/import/files';
import { batched, rowsOf } from '@/lib/bible/import/rows';
import { detectPsalms } from '@/lib/bible/import/psalms';
import { bookNamesOf, verseCountOf, type ParsedBible } from '@/lib/bible/import/types';
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
  isCustomLang,
  MAX_LANGS,
  registerLangs,
  specOf,
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

import { allows, allowsList } from '@/lib/billing/entitlements';
import { limitMessage, PlanLimitError, planLimitKey, type LimitKey } from '@/lib/billing/limits';

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

export interface Billing {
  status: string;
  renewsAt: string | null;
  ending: boolean;
}

export interface TranslationInto {
  lang: Lang;
  langLabel?: string;
  label?: string;
  psalms?: 'lxx' | 'masoretic';
}

export interface StudioInitial {
  session: StudioSession;
  email: string;
  avatarUrl: string | null;
  isAdmin: boolean;
  isGuest: boolean;
  settings: SettingsRow;
  translations: CustomTranslation[];
  workspace: {
    blocks: Block[];
    live: Live;
    activeSongId: string | null;
    open: OpenList | null;
    tab: Tab;
    cardSize: number;
    cardDraft: unknown;
  };
  songs: Song[];
  libraries: SongLibrary[];
  playlists: SongPlaylist[];
  cards: NameCard[];
  card: unknown;
  blackout: unknown;
  showData: ShowData;
  nextShowData: ShowData;
  timer: TimerState;
  plan: string;
  billing: Billing;
  claimedSpots: number;
}

interface StudioValue {
  session: StudioSession;
  email: string;
  avatarUrl: string | null;
  isAdmin: boolean;
  isGuest: boolean;
  plan: string;
  billing: Billing;
  claimedSpots: number;
  room: (key: LimitKey, adding?: number, current?: number) => boolean;
  usage: Partial<Record<LimitKey, number>>;
  limitNotice: string | null;
  dismissLimit: () => void;
  noteLimit: (key: LimitKey) => void;

  settings: Settings;
  update: (patch: Partial<Settings>) => void;
  setLangOrder: (order: Lang[]) => void;
  setAdminLang: (lang: Lang) => void;
  addLang: (lang: Lang) => void;
  removeLang: (lang: Lang) => void;
  translations: CustomTranslation[];
  importTranslation: (files: Iterable<File>, into: TranslationInto) => Promise<void>;
  importFromArchive: (entries: ArchiveEntry[], into: TranslationInto) => Promise<void>;
  removeTranslation: (id: string) => Promise<void>;
  importing: { done: number; total: number; label: string; from: number; of: number } | null;
  setLocalBackground: (file: LocalFileMeta | null) => void;

  blocks: Block[];
  live: Live;
  loading: boolean;

  addPassage: (request: { book: number; chapter: number; from?: number | null; to?: number | null }) => Promise<Block | null>;
  extendBlock: (id: string, side: 'start' | 'end', span?: 'verse' | 'chapter') => Promise<void>;
  removeGroup: (id: string, groupIndex: number) => Promise<void>;
  joinGroup: (id: string, groupIndex: number) => void;
  splitGroup: (id: string, groupIndex: number) => void;
  removeBlock: (id: string) => void;
  moveBlock: (id: string, direction: number) => void;
  moveBlockTo: (id: string, insertIndex: number) => void;
  orderBlocks: (ids: string[]) => void;
  toggleBlockCollapsed: (id: string) => void;
  setAllCollapsed: (collapsed: boolean) => void;
  clearBlocks: () => void;
  refreshBlocks: () => Promise<void>;

  goLive: (blockId: string, verseIndex: number) => void;
  selectVerse: (blockId: string, verseIndex: number) => void;
  stepLive: (direction: number) => void;
  clearProjector: () => void;

  cards: NameCard[];
  cardRun: CardRun | null;
  cardDraft: CardDraft;
  setCardDraft: (updater: (draft: CardDraft) => CardDraft) => void;
  showCard: (card: NameCard, holdMs?: number) => void;
  clearCard: () => void;
  saveCard: (card: NameCard) => Promise<void>;
  removeCard: (id: string) => Promise<void>;

  songs: Song[];
  activeSongId: string | null;
  songCue: { id: string; at: number } | null;
  selectedSlides: Set<string>;
  setSelectedSlides: Dispatch<SetStateAction<Set<string>>>;
  setActiveSongId: (id: string | null) => void;

  libraries: SongLibrary[];
  playlists: SongPlaylist[];
  open: OpenList;
  openList: (open: OpenList) => void;
  addLibrary: (name: string) => Promise<void>;
  addPlaylist: (name: string) => Promise<void>;
  renameList: (open: OpenList, name: string) => Promise<void>;
  removeList: (open: OpenList) => Promise<void>;
  orderLists: (kind: OpenList['kind'], ids: string[]) => Promise<void>;
  moveSongsToLibrary: (songIds: string[], libraryId: string) => Promise<void>;
  placeInPlaylist: (playlistId: string, songIds: string[], index: number) => Promise<void>;
  orderPlaylist: (playlistId: string, songIds: string[]) => Promise<void>;
  removeFromPlaylist: (playlistId: string, songIds: string[]) => Promise<void>;

  importSongs: (songs: Song[], intoNewLibrary?: string) => Promise<void>;
  saveSong: (song: Song) => Promise<Song | undefined>;
  reorderSlides: (song: Song, ids: string[]) => Promise<void>;
  setSongLangs: (song: Song) => Promise<void>;
  removeSlide: (song: Song, slideId: string) => Promise<void>;
  removeSlides: (song: Song, slideIds: string[]) => Promise<void>;
  pasteSlides: (song: Song, afterSlideId: string, slides: Omit<SongSlide, 'id'>[]) => Promise<void>;
  removeSongs: (ids: string[]) => Promise<void>;
  publishLyrics: (song: Song, slideIndex: number) => void;
  selectLyric: (song: Song, slideIndex: number) => void;

  showData: ShowData;
  nextShowData: ShowData;

  timer: TimerState;
  updateTimer: (updater: (state: TimerState) => TimerState) => void;

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

  const [limitNotice, setLimitNotice] = useState<string | null>(null);

  const noteLimit = useCallback((key: LimitKey) => setLimitNotice(limitMessage(key)), []);

  const refuse = useCallback((key: LimitKey): never => {
    noteLimit(key);

    throw new PlanLimitError(key);
  }, [noteLimit]);

  const failed = useCallback((error: { message: string }) => {
    const key = planLimitKey(error.message);

    if (!key) return new Error(error.message);

    setLimitNotice(limitMessage(key));

    return new PlanLimitError(key);
  }, []);

  const [translations, setTranslations] = useState<CustomTranslation[]>(initial.translations);

  useMemo(() => registerLangs(langSpecsOf(translations)), [translations]);
  const [importing, setImporting] = useState<StudioValue['importing']>(null);
  const [settings, setSettings] = useState<Settings>(() => fromRow(initial.settings, initial.translations));
  const [workspace, setWorkspace] = useState<Workspace>({
    blocks: initial.workspace.blocks,
    live: initial.workspace.live,
  });
  const workspaceRef = useRef(workspace);

  useEffect(() => {
    workspaceRef.current = workspace;
  }, [workspace]);

  const settingsRef = useRef(settings);

  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  const [songs, setSongs] = useState<Song[]>(initial.songs);

  const songsRef = useRef(songs);

  useEffect(() => {
    songsRef.current = songs;
  }, [songs]);
  const [activeSongId, setActiveSong] = useState<string | null>(initial.workspace.activeSongId);

  const [songCue, setSongCue] = useState<{ id: string; at: number } | null>(null);

  const [selectedSlides, setSelectedSlides] = useState<Set<string>>(new Set());

  const setActiveSongId = useCallback<StudioValue['setActiveSongId']>(id => {
    setActiveSong(id);

    if (id) setSongCue(current => ({ id, at: (current?.at ?? 0) + 1 }));
  }, []);
  const [libraries, setLibraries] = useState<SongLibrary[]>(initial.libraries);
  const [playlists, setPlaylists] = useState<SongPlaylist[]>(initial.playlists);

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

  const [cards, setCards] = useState<NameCard[]>(initial.cards);
  const [cardRun, setCardRun] = useState<CardRun | null>(() => withCardSkew(asCardRun(initial.card)));

  const [blackout, setBlackout] = useState<Blackout>(() => asBlackout(initial.blackout));
  const [cardDraft, setDraft] = useState<CardDraft>(() => asDraft(initial.workspace.cardDraft));

  const setCardDraft = useCallback<StudioValue['setCardDraft']>(updater => setDraft(updater), []);

  const { blocks, live } = workspace;

  const channelRef = useRef<LiveChannel | null>(null);

  const wireStyle = useMemo(
    () => ({
      projector: projectorStyle(settings, translations),
      stream: streamStyle(settings, translations),
      streamLang: streamLangOf(settings),
      stageLang: stageLangOf(settings),
    }),
    [settings, translations],
  );

  const showRef = useRef<ShowData>(showData);

  const pushedRef = useRef(JSON.stringify([initial.showData, initial.nextShowData]));

  useEffect(() => {
    showRef.current = showData;
  }, [showData]);

  const nextRef = useRef<ShowData>(initial.nextShowData);

  useEffect(() => {
    nextRef.current = nextShowData;
  }, [nextShowData]);

  const timerRef = useRef<TimerState>(timer);

  useEffect(() => {
    timerRef.current = timer;
  }, [timer]);

  const cardRef = useRef<CardRun | null>(cardRun);

  useEffect(() => {
    cardRef.current = cardRun;
  }, [cardRun]);

  const blackoutRef = useRef<Blackout>(blackout);

  useEffect(() => {
    blackoutRef.current = blackout;
  }, [blackout]);

  const payloadOf = useCallback(
    (slide: ShowData, next: ShowData, run: TimerState): SlidePayload => ({
      showData: slide,
      next,
      style: wireStyle.stream,
      projector: wireStyle.projector,
      streamLang: wireStyle.streamLang,
      stageLang: wireStyle.stageLang,
      timer: { ...run, sentAt: Date.now() },
      card: cardRef.current && { ...cardRef.current, sentAt: Date.now() },
      blackout: blackoutRef.current,
    }),
    [wireStyle],
  );

  const styleSettled = useRef(false);

  useEffect(() => {
    const channel = openLiveChannel(initial.session.outputKey, 'console');
    channelRef.current = channel;

    const offPresence = channel.onPresence(setPeers);

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

  const pushShow = useCallback(
    (payload: ShowData, next: ShowData = emptyShowData()) => {
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

  useEffect(() => {
    if (!timer.running) return;

    const action = finishAction(timer);
    const ends = action ? finishesAt(timer) : null;

    if (!action || ends === null) return;

    const wait = setTimeout(() => {
      setTimer(current =>
        !current.running
          ? current
          : action.kind === 'start'
            ? startRun(armTimer(current, action.timer.id))
            : clearOutputs(current),
      );
    }, Math.max(0, ends - Date.now()));

    return () => clearTimeout(wait);
  }, [timer]);

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
      const saved = hasRealId(card.id) ? { id: card.id } : {};

      if (!saved.id && !allows(initial.plan, initial.isGuest, 'name_cards', cards.length)) refuse('name_cards');

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

      if (error) throw failed(error);
      if (!data) return;

      const written = cardFromRow(data);

      setCards(current => {
        const without = current.filter(item => item.id !== written.id);

        return [...without, written].sort((a, b) => a.position - b.position || a.title.localeCompare(b.title));
      });
    },
    [cards.length, db, failed, initial.plan, initial.isGuest, initial.settings.user_id, refuse],
  );

  const removeCard = useCallback<StudioValue['removeCard']>(
    async id => {
      const { error } = await db.from('name_cards').delete().eq('id', id);

      if (error) throw failed(error);

      setCards(current => current.filter(card => card.id !== id));

      if (cardRef.current?.card.id === id) publishCard(null);
    },
    [db, failed, publishCard],
  );

  const updateTimer = useCallback<StudioValue['updateTimer']>(updater => {
    setTimer(current => {
      const next = asTimerState(updater(current));

      return JSON.stringify(next) === JSON.stringify(current) ? current : next;
    });
  }, []);

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

  const setLangOrder = useCallback((order: Lang[]) => {
    setSettings(current => (order.length === current.langOrder.length ? { ...current, langOrder: order } : current));
  }, []);

  const setAdminLang = useCallback((lang: Lang) => {
    setSettings(current =>
      current.adminLang === lang
        ? current
        : {
            ...current,
            adminLang: lang,
            adminVersion: current.versions[lang] || defaultVersionOf(lang),
          },
    );
  }, []);

  const addLang = useCallback(
    (lang: Lang) => {
      const order = settingsRef.current.langOrder;

      if (order.includes(lang) || order.length >= MAX_LANGS) return;

      if (!allows(initial.plan, initial.isGuest, 'languages', order.length)) {
        setLimitNotice(limitMessage('languages'));
        return;
      }

      setSettings(current => ({
        ...current,
        langOrder: [...current.langOrder, lang],
        enabled: { ...current.enabled, [lang]: true },
        versions: { ...current.versions, [lang]: current.versions[lang] || defaultVersionOf(lang) },
      }));
    },
    [initial.plan, initial.isGuest],
  );

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

  const storeTranslation = useCallback(
    async (bible: ParsedBible, { lang, langLabel, label, psalms }: TranslationInto, from = 0, of = 1) => {
      const id = crypto.randomUUID();
      const own = isCustomLang(lang);
      const rows = rowsOf(bible, lang, id);
      const translation: CustomTranslation = {
        id,
        lang,
        label: (label || bible.name || 'Uploaded translation').trim(),
        psalms: psalms ?? detectPsalms(bible) ?? specOf(lang).psalms,
        langLabel: own ? (langLabel || 'Added language').trim() : undefined,
        bookNames: own ? (bookNamesOf(bible, specOf(REQUIRED_LANG).names) ?? undefined) : undefined,
      };

      const step = (done: number) => setImporting({ done, total: rows.length, label: translation.label, from, of });

      step(0);

      const { error } = await db.from('bible_translations').insert({
        id,
        user_id: initial.settings.user_id,
        lang: translation.lang,
        label: translation.label,
        psalms: translation.psalms,
        lang_label: translation.langLabel ?? null,
        book_names: translation.bookNames ?? null,
        format: bible.format,
        books: bible.books.length,
        verse_count: verseCountOf(bible),
      });

      if (error) throw failed(error);

      try {
        let done = 0;

        for (const batch of batched(rows)) {
          const { error: chapters } = await db.from('bible_translation_text').insert(batch);

          if (chapters) throw failed(chapters);

          done += batch.length;
          step(done);
        }
      } catch (error) {
        await db.from('bible_translations').delete().eq('id', id);
        throw error;
      }

      setTranslations(current => [...current, translation]);
    },
    [db, failed, initial.settings.user_id],
  );

  const importTranslation = useCallback<StudioValue['importTranslation']>(
    async (files, into) => {
      if (!allows(initial.plan, initial.isGuest, 'translations', translations.length)) refuse('translations');

      setImporting({ done: 0, total: 0, label: '', from: 0, of: 1 });

      try {
        const bible = await parseBibleFiles(files);

        if (!bible || bible.books.length === 0) {
          throw new Error('No Bible was found in that. Zefania, OpenSong, USX, OSIS and Beblia files are read.');
        }

        await storeTranslation(bible, into);
      } finally {
        setImporting(null);
      }
    },
    [initial.plan, initial.isGuest, refuse, storeTranslation, translations.length],
  );

  const importFromArchive = useCallback<StudioValue['importFromArchive']>(
    async (entries, into) => {
      setImporting({ done: 0, total: 0, label: entries[0]?.name ?? '', from: 0, of: entries.length });

      try {
        for (const [index, entry] of entries.entries()) {
          if (!allows(initial.plan, initial.isGuest, 'translations', translations.length + index)) refuse('translations');

          setImporting({ done: 0, total: 0, label: entry.name, from: index, of: entries.length });

          const bible = await fetchArchiveEntry(entry);

          if (!bible || bible.books.length === 0) throw new Error(`Nothing readable came back for ${entry.name}.`);

          await storeTranslation(bible, { ...into, label: into.label || entry.name }, index, entries.length);
        }
      } finally {
        setImporting(null);
      }
    },
    [initial.plan, initial.isGuest, refuse, storeTranslation, translations.length],
  );

  const removeTranslation = useCallback<StudioValue['removeTranslation']>(
    async id => {
      const { error } = await db.from('bible_translations').delete().eq('id', id);

      if (error) throw failed(error);

      const gone = versionValueOf({ id });

      setTranslations(current => current.filter(translation => translation.id !== id));
      setSettings(current => ({
        ...current,
        adminVersion:
          current.adminVersion === gone ? defaultVersionOf(current.adminLang) : current.adminVersion,
        versions: Object.fromEntries(
          Object.entries(current.versions).map(([lang, version]) => [
            lang,
            version === gone ? defaultVersionOf(lang as Lang) : version,
          ]),
        ),
      }));
    },
    [db, failed],
  );

  const setLocalBackground = useCallback((file: LocalFileMeta | null) => {
    setSettings(current =>
      file
        ? { ...current, localImage: file, theme: LOCAL_THEME }
        : { ...current, localImage: null, theme: current.theme === LOCAL_THEME ? DEFAULT_THEME : current.theme },
    );
  }, []);

  const targets = useMemo((): Target[] => {
    const langs = new Set<Lang>(settings.langOrder.filter(lang => settings.enabled[lang]));
    langs.add(settings.adminLang);

    return [...langs].map(lang => {
      const version = settings.enabled[lang] ? settings.versions[lang] : settings.adminVersion;

      return { lang, version, psalms: psalmSchemeOf(lang, version, translations) };
    });
  }, [
    settings.adminVersion,
    settings.enabled,
    settings.langOrder,
    settings.versions,
    settings.adminLang,
    translations,
  ]);

  const addPassage = useCallback<StudioValue['addPassage']>(
    async ({ book, chapter, from = null, to = null }) => {
      if (!allows(initial.plan, initial.isGuest, 'passages', workspaceRef.current.blocks.length)) refuse('passages');

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

        setWorkspace(current => ({ ...current, blocks: [block, ...current.blocks] }));

        return block;
      } finally {
        setLoading(false);
      }
    },
    [client, initial.plan, initial.isGuest, refuse, settings.adminLang, targets],
  );

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

  const settingsKey = `${settings.adminLang}|${settings.adminVersion}|${settings.langOrder
    .map(lang => `${lang}:${settings.enabled[lang] ? 1 : 0}:${settings.versions[lang]}`)
    .join('|')}`;
  const lastSettingsKey = useRef(settingsKey);

  useEffect(() => {
    if (lastSettingsKey.current === settingsKey) return;

    lastSettingsKey.current = settingsKey;
    void refreshBlocks();
  }, [refreshBlocks, settingsKey]);

  const publish = useCallback(
    (block: Block, groupIndex: number) => {
      pushShow(slideOf(block, groupIndex, settings.enabled), slideOf(block, groupIndex + 1, settings.enabled));

      setWorkspace(current => ({ ...current, live: { blockId: block.id, verseIndex: groupIndex } }));
    },
    [pushShow, settings.enabled],
  );

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

  const filing = open.kind === 'library' && open.id ? open.id : homeOf(libraries);

  const importSongs = useCallback<StudioValue['importSongs']>(
    async (imported, intoNewLibrary) => {
      if (imported.length === 0) return;

      const known = new Set(songs.map(song => song.title.toLowerCase()));
      const fresh = imported.filter(song => !known.has(song.title.toLowerCase())).length;

      if (!allows(initial.plan, initial.isGuest, 'songs', songs.length, fresh)) refuse('songs');

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

      if (error) throw failed(error);
      if (!data) return;

      setSongs(current => {
        const byTitle = new Map(current.map(song => [song.title.toLowerCase(), song]));

        data.forEach(row => byTitle.set(row.title.toLowerCase(), songFromRow(row)));

        return [...byTitle.values()].sort((a, b) => a.title.localeCompare(b.title));
      });
    },
    [db, failed, filing, initial.plan, initial.isGuest, initial.settings.user_id, libraries, refuse, songs],
  );

  const saveSong = useCallback<StudioValue['saveSong']>(
    async song => {
      const saved = /^[0-9a-f-]{36}$/i.test(song.id) ? { id: song.id } : {};

      if (!saved.id && !songs.some(item => item.title.toLowerCase() === song.title.toLowerCase())) {
        if (!allows(initial.plan, initial.isGuest, 'songs', songs.length)) refuse('songs');
      }

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

      if (error?.code === '23505') throw new Error(`A song called “${song.title}” is already in the library.`);
      if (error) throw failed(error);
      if (!data) return;

      const written = songFromRow(data);

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

      setWorkspace(current => {
        if (current.live?.kind !== 'lyrics' || current.live.songId !== song.id) return current;

        return current.live.slideIndex < song.slides.length ? current : { ...current, live: null };
      });

      return written;
    },
    [db, failed, filing, initial.plan, initial.isGuest, initial.settings.user_id, refuse, songs],
  );

  const setSongLangs = useCallback<StudioValue['setSongLangs']>(
    async next => {
      const before = songsRef.current.find(song => song.id === next.id);

      setSongs(current => current.map(song => (song.id === next.id ? next : song)));

      try {
        await saveSong(next);
      } catch (failure) {
        if (before) setSongs(current => current.map(song => (song.id === before.id ? before : song)));

        throw failure;
      }
    },
    [saveSong],
  );

  const reorderSlides = useCallback<StudioValue['reorderSlides']>(
    async (song, ids) => {
      const byId = new Map(song.slides.map(slide => [slide.id, slide]));
      const slides = ids.map(id => byId.get(id)).filter((slide): slide is SongSlide => Boolean(slide));

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
        setSongs(current => current.map(item => (item.id === song.id ? song : item)));
      }
    },
    [live, publishLyrics, saveSong],
  );

  const removeSlide = useCallback<StudioValue['removeSlide']>(
    async (song, slideId) => {
      const slides = song.slides.filter(slide => slide.id !== slideId);

      if (slides.length === song.slides.length || slides.length === 0) return;

      const trimmed: Song = { ...song, slides };
      const onScreen =
        live?.kind === 'lyrics' && live.songId === song.id ? song.slides[live.slideIndex]?.id : null;

      setSongs(current => current.map(item => (item.id === song.id ? trimmed : item)));

      if (onScreen) {
        const at = slides.findIndex(slide => slide.id === onScreen);

        if (at >= 0) publishLyrics(trimmed, at);
        else clearProjector();
      }

      try {
        await saveSong(trimmed);
      } catch {
        setSongs(current => current.map(item => (item.id === song.id ? song : item)));
      }
    },
    [clearProjector, live, publishLyrics, saveSong],
  );

  const removeSlides = useCallback<StudioValue['removeSlides']>(
    async (song, slideIds) => {
      const drop = new Set(slideIds);
      const slides = song.slides.filter(slide => !drop.has(slide.id));

      if (slides.length === song.slides.length || slides.length === 0) return;

      const trimmed: Song = { ...song, slides };
      const onScreen =
        live?.kind === 'lyrics' && live.songId === song.id ? song.slides[live.slideIndex]?.id : null;

      setSongs(current => current.map(item => (item.id === song.id ? trimmed : item)));

      if (onScreen) {
        const at = slides.findIndex(slide => slide.id === onScreen);

        if (at >= 0) publishLyrics(trimmed, at);
        else clearProjector();
      }

      try {
        await saveSong(trimmed);
      } catch {
        setSongs(current => current.map(item => (item.id === song.id ? song : item)));
      }
    },
    [clearProjector, live, publishLyrics, saveSong],
  );

  const pasteSlides = useCallback<StudioValue['pasteSlides']>(
    async (song, afterSlideId, clips) => {
      const at = song.slides.findIndex(item => item.id === afterSlideId);

      if (at < 0 || clips.length === 0) return;

      const pasted: SongSlide[] = clips.map(clip => ({ ...clip, id: crypto.randomUUID() }));
      const slides = [...song.slides.slice(0, at + 1), ...pasted, ...song.slides.slice(at + 1)];
      const inserted: Song = { ...song, slides };

      setSongs(current => current.map(item => (item.id === song.id ? inserted : item)));

      if (live?.kind === 'lyrics' && live.songId === song.id && live.slideIndex > at) {
        setWorkspace(current =>
          current.live?.kind === 'lyrics' && current.live.songId === song.id
            ? { ...current, live: { ...current.live, slideIndex: current.live.slideIndex + pasted.length } }
            : current,
        );
      }

      try {
        await saveSong(inserted);
      } catch {
        setSongs(current => current.map(item => (item.id === song.id ? song : item)));
      }
    },
    [live, saveSong],
  );

  const removeSongs = useCallback<StudioValue['removeSongs']>(
    async ids => {
      if (ids.length === 0) return;

      await db.from('songs').delete().in('id', ids);

      setSongs(current => current.filter(song => !ids.includes(song.id)));
      setActiveSong(current => (current && ids.includes(current) ? null : current));

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

  const addLibrary = useCallback<StudioValue['addLibrary']>(
    async name => {
      const { data, error } = await db
        .from('song_libraries')
        .insert({ user_id: initial.settings.user_id, name, position: libraries.length })
        .select('id, name')
        .single();

      if (error) throw failed(error);
      if (!data) return;

      setLibraries(current => [...current, data]);
      setOpenList({ kind: 'library', id: data.id });
    },
    [db, failed, initial.settings.user_id, libraries.length],
  );

  const addPlaylist = useCallback<StudioValue['addPlaylist']>(
    async name => {
      if (!allows(initial.plan, initial.isGuest, 'playlists', playlists.length)) refuse('playlists');

      const { data, error } = await db
        .from('song_playlists')
        .insert({ user_id: initial.settings.user_id, name, songs: [], position: playlists.length })
        .select('id, name, songs')
        .single();

      if (error) throw failed(error);
      if (!data) return;

      setPlaylists(current => [...current, { id: data.id, name: data.name, songs: [] }]);
      setOpenList({ kind: 'playlist', id: data.id });
    },
    [db, failed, initial.plan, initial.isGuest, initial.settings.user_id, playlists.length, refuse],
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

  const writePlaylist = useCallback(
    async (playlistId: string, songIds: string[]) => {
      let before: string[] | null = null;

      setPlaylists(current =>
        current.map(list => {
          if (list.id !== playlistId) return list;

          before = list.songs;

          return { ...list, songs: songIds };
        }),
      );

      const { error } = await db.from('song_playlists').update({ songs: songIds }).eq('id', playlistId);

      if (!error) return;

      const restored = before;

      setPlaylists(current =>
        current.map(list => (list.id === playlistId && restored ? { ...list, songs: restored } : list)),
      );

      throw failed(error);
    },
    [db, failed],
  );

  const placeInPlaylist = useCallback<StudioValue['placeInPlaylist']>(
    async (playlistId, songIds, index) => {
      const list = playlists.find(item => item.id === playlistId);

      if (!list || songIds.length === 0) return;

      const landing = list.songs.filter(id => !songIds.includes(id)).length + songIds.length;

      if (!allowsList(initial.plan, initial.isGuest, 'songs_per_playlist', landing, list.songs.length)) {
        refuse('songs_per_playlist');
      }

      const without = list.songs.filter(id => !songIds.includes(id));
      const above = list.songs.filter((id, at) => songIds.includes(id) && at < index).length;

      without.splice(Math.max(0, Math.min(index - above, without.length)), 0, ...songIds);

      await writePlaylist(playlistId, without);
    },
    [initial.plan, initial.isGuest, playlists, refuse, writePlaylist],
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

  const counts = useMemo<Partial<Record<LimitKey, number>>>(
    () => ({
      sessions: 1,
      passages: blocks.length,
      songs: songs.length,
      libraries: libraries.length,
      playlists: playlists.length,
      songs_per_playlist: playlists.reduce((most, list) => Math.max(most, list.songs.length), 0),
      name_cards: cards.length,
      languages: settings.langOrder.length,
      custom_fonts: settings.customFonts.length,
      custom_templates: settings.customTemplates.length,
      translations: translations.length,
    }),
    [blocks.length, cards.length, libraries.length, playlists, settings, songs.length, translations.length],
  );

  const room = useCallback<StudioValue['room']>(
    (key, adding = 1, current) => allows(initial.plan, initial.isGuest, key, current ?? counts[key] ?? 0, adding),
    [counts, initial.plan, initial.isGuest],
  );

  const value = useMemo<StudioValue>(
    () => ({
      session: initial.session,
      email: initial.email,
      avatarUrl: initial.avatarUrl,
      isAdmin: initial.isAdmin,
      isGuest: initial.isGuest,
      plan: initial.plan,
      billing: initial.billing,
      claimedSpots: initial.claimedSpots,
      room,
      usage: counts,
      limitNotice,
      dismissLimit: () => setLimitNotice(null),
      noteLimit,
      settings,
      update,
      setLangOrder,
      setAdminLang,
      addLang,
      removeLang,
      translations,
      importTranslation,
      importFromArchive,
      removeTranslation,
      importing,
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
      selectedSlides,
      setSelectedSlides,
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
      removeSlides,
      pasteSlides,
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
      selectedSlides,
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
      initial.avatarUrl,
      initial.isAdmin,
      initial.isGuest,
      initial.billing,
      initial.claimedSpots,
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
      counts,
      limitNotice,
      noteLimit,
      regroupCards,
      room,
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
      translations,
      importTranslation,
      importFromArchive,
      removeTranslation,
      importing,
      removeSongs,
      saveSong,
      reorderSlides,
      setSongLangs,
      removeSlide,
      removeSlides,
      pasteSlides,
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
