import { withoutPreamble } from './groups';
import { csvRows, lyricsIn, textFromHtml } from './web';

/**
 * Where the words come from.
 *
 * Four sources, searched at once and answering into one list, the way FreeShow
 * does it — because no one of them covers a Sunday. Genius and Ultimate Guitar
 * know the modern worship catalogue, Letras knows it in Portuguese and Spanish,
 * and Hymnary knows the hymnal, which is the half of a service the commercial
 * catalogues have never heard of.
 *
 * None of this runs in the browser: each source answers a page rather than an
 * API, none of them sends CORS headers, and the fetch carries a browser's own
 * User-Agent. The routes under `/api/lyrics` are the only callers.
 */
export const SOURCES = ['Genius', 'Ultimate Guitar', 'Letras', 'Hymnary'] as const;

export type LyricSource = (typeof SOURCES)[number];

export const isSource = (value: unknown): value is LyricSource =>
  SOURCES.includes(value as LyricSource);

/**
 * One candidate. `key` is how its own source is asked for the words again —
 * a URL for Genius and Ultimate Guitar, a path for Letras and Hymnary — and
 * every route that follows one checks it against the host it belongs to before
 * fetching it, so a key coming back through the client cannot point our server
 * at somewhere else.
 */
export interface LyricHit {
  source: LyricSource;
  key: string;
  title: string;
  artist: string;
  /**
   * Sleeve art, where the source has any. Two of the four do, and it is worth
   * carrying: an operator recognises the cover of what the band played on
   * Sunday faster than they read a row of near-identical titles. The two that
   * have none — a tab site and a hymnal — say so with an empty string rather
   * than with a placeholder of ours.
   */
  image: string;
}

/** As many candidates as one source contributes to the list. */
const PER_SOURCE = 3;

const TIMEOUT_MS = 10_000;

/** A browser's own, because two of these answer a bot with nothing. */
const BROWSER = {
  'user-agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'accept-language': 'en-US,en;q=0.9',
};

const getText = async (url: string): Promise<string> => {
  const response = await fetch(url, { headers: BROWSER, signal: AbortSignal.timeout(TIMEOUT_MS) });

  if (!response.ok) throw new Error(`${new URL(url).host} answered ${response.status}`);

  return response.text();
};

const getJson = async (url: string): Promise<unknown> => JSON.parse(await getText(url));

/* -- Genius ------------------------------------------------------------- */

/**
 * The search behind genius.com's own box. It answers JSON without a key, which
 * is what every unofficial client is really calling; the words themselves are
 * on the song page, because the documented API does not carry them.
 */
const searchGenius = async (query: string): Promise<LyricHit[]> => {
  const body = (await getJson(`https://genius.com/api/search/song?q=${encodeURIComponent(query)}`)) as {
    response?: { sections?: { hits?: { result?: Record<string, unknown> }[] }[] };
  };

  const hits = body.response?.sections?.flatMap(section => section.hits ?? []) ?? [];

  return hits
    .map(hit => hit.result)
    .filter((song): song is Record<string, unknown> => Boolean(song?.url))
    .slice(0, PER_SOURCE)
    .map(song => ({
      source: 'Genius' as const,
      key: String(song.url),
      title: String(song.title ?? ''),
      artist: String((song.primary_artist as { name?: string })?.name ?? ''),
      image: String(song.song_art_image_thumbnail_url ?? ''),
    }));
};

const getGenius = async (key: string): Promise<string> =>
  // Genius keeps its own page furniture inside the first container, above the
  // song's first marker, and it arrives as slides nobody asked for.
  withoutPreamble(lyricsIn(await getText(key), /<div[^>]+data-lyrics-container="true"[^>]*>/g));

/* -- Ultimate Guitar ---------------------------------------------------- */

/** The whole page state, JSON, in an attribute of an empty div. */
const ugStore = (html: string): Record<string, never> | null => {
  const found = html.match(/class=['"]js-store['"][^>]*data-content=['"]([^'"]+)['"]/);

  if (!found) return null;

  try {
    return JSON.parse(textFromHtml(found[1]));
  } catch {
    return null;
  }
};

const searchUltimateGuitar = async (query: string): Promise<LyricHit[]> => {
  // `type=300` is their own filter for lyric sheets rather than tablature.
  const html = await getText(
    `https://www.ultimate-guitar.com/search.php?title=${encodeURIComponent(query)}&type=300`,
  );

  const store = ugStore(html) as
    | { store?: { page?: { data?: { results?: Record<string, unknown>[] } } } }
    | null;

  return (store?.store?.page?.data?.results ?? [])
    .filter(result => String(result.type ?? '').toLowerCase() !== 'pro' && result.marketing_type === undefined)
    .filter(result => typeof result.tab_url === 'string')
    .slice(0, PER_SOURCE)
    .map(result => ({
      source: 'Ultimate Guitar' as const,
      key: String(result.tab_url),
      title: String(result.song_name ?? ''),
      artist: String(result.artist_name ?? ''),
      image: '',
    }));
};

const getUltimateGuitar = async (key: string): Promise<string> => {
  const store = ugStore(await getText(key)) as
    | { store?: { page?: { data?: { tab_view?: { wiki_tab?: { content?: string } } } } } }
    | null;

  const content = store?.store?.page?.data?.tab_view?.wiki_tab?.content ?? '';

  // Chord and tab markers: this is a lyric sheet with the guitar left in.
  return textFromHtml(content.replace(/\[\/?(ch|tab)\]/gi, '')).replace(/^[ \t]+/gm, '');
};

/* -- Letras ------------------------------------------------------------- */

/** Their search-as-you-type endpoint. JSON, wrapped in a callback. */
const searchLetras = async (query: string): Promise<LyricHit[]> => {
  const wrapped = await getText(`https://solr.sscdn.co/letras/m1/?q=${encodeURIComponent(query)}`);
  const opened = wrapped.indexOf('(');

  if (opened === -1) return [];

  const body = JSON.parse(wrapped.slice(opened + 1, wrapped.lastIndexOf(')'))) as {
    response?: { docs?: Record<string, unknown>[] };
  };

  return (body.response?.docs ?? [])
    .filter(doc => String(doc.id ?? '').startsWith('mus'))
    .slice(0, PER_SOURCE)
    .map(doc => ({
      source: 'Letras' as const,
      key: `${doc.dns}/${doc.url}`,
      title: String(doc.txt ?? ''),
      artist: String(doc.art ?? ''),
      image: String(doc.imgm ?? doc.img ?? ''),
    }));
};

const getLetras = async (key: string): Promise<string> =>
  lyricsIn(
    await getText(`https://www.letras.mus.br/${key}`),
    /<div[^>]+class=["'][^"']*lyric-original[^"']*["'][^>]*>/g,
  );

/* -- Hymnary ------------------------------------------------------------ */

/**
 * The one source that publishes a list on purpose: the search takes an export
 * parameter and answers CSV. Its columns are positional, so they are named here
 * rather than counted at the call site.
 */
const HYMNARY_TITLE = 0;
const HYMNARY_KEY = 4;
const HYMNARY_AUTHOR = 6;

const searchHymnary = async (query: string): Promise<LyricHit[]> => {
  const csv = await getText(
    `https://hymnary.org/search?qu=${encodeURIComponent(`tuneTitle:${query} media:text in:texts`)}&export=csv`,
  );

  return csvRows(csv)
    .slice(1)
    .filter(row => row.length > HYMNARY_AUTHOR && row[HYMNARY_KEY])
    .slice(0, PER_SOURCE)
    .map(row => ({
      source: 'Hymnary' as const,
      key: row[HYMNARY_KEY],
      title: row[HYMNARY_TITLE],
      artist: row[HYMNARY_AUTHOR],
      image: '',
    }));
};

const getHymnary = async (key: string): Promise<string> =>
  lyricsIn(
    await getText(`https://hymnary.org/text/${encodeURIComponent(key)}`),
    /<div[^>]+property=["']text["'][^>]*>/g,
  );

/* -- The four, together -------------------------------------------------- */

/**
 * Every source at once, in the order they came back within each.
 *
 * A source that is down, has changed its markup or simply has nothing
 * contributes an empty list and the search still answers: one of four being out
 * is a thinner list, not an error the operator has to read. Which sources
 * answered is what the Source column tells them.
 */
export const searchLyrics = async (query: string): Promise<LyricHit[]> => {
  const runs = [searchGenius(query), searchUltimateGuitar(query), searchLetras(query), searchHymnary(query)];
  const settled = await Promise.allSettled(runs);

  return settled.flatMap(result => (result.status === 'fulfilled' ? result.value : []));
};

/** Which host a key is allowed to name, so a key from the client cannot roam. */
const HOSTS: Record<LyricSource, string | null> = {
  Genius: 'genius.com',
  'Ultimate Guitar': 'ultimate-guitar.com',
  Letras: null,
  Hymnary: null,
};

/** A key that is a whole URL has to belong to the source that issued it. */
export const keyIsSound = (source: LyricSource, key: string): boolean => {
  const host = HOSTS[source];

  if (!host) return Boolean(key) && !key.includes('..') && !/^[a-z]+:/i.test(key);

  try {
    const url = new URL(key);

    return url.protocol === 'https:' && (url.hostname === host || url.hostname.endsWith(`.${host}`));
  } catch {
    return false;
  }
};

export const fetchLyrics = async (source: LyricSource, key: string): Promise<string> => {
  if (source === 'Genius') return getGenius(key);
  if (source === 'Ultimate Guitar') return getUltimateGuitar(key);
  if (source === 'Letras') return getLetras(key);

  return getHymnary(key);
};
