import { MAX_LANGS } from '../bible/languages';
import { THEMES } from '../projector/themes';

import { FREE_LIMITS, LIMIT_LABELS, type LimitKey } from './limits';

export const LIMIT_GROUPS: { title: string; keys: LimitKey[] }[] = [
  { title: 'Scripture', keys: ['passages', 'languages', 'translations'] },
  { title: 'Songs', keys: ['songs', 'songs_per_playlist', 'playlists'] },
  { title: 'Music', keys: ['audio_tracks', 'audio_categories'] },
  { title: 'The stream, and your own look', keys: ['name_cards', 'custom_templates', 'custom_fonts'] },
  { title: 'Sessions', keys: ['sessions'] },
];

export const LIMIT_NOTES: Record<LimitKey, string> = {
  passages: 'Bible passages open in the console at once, each broken into verses and ready to send.',
  translations: 'Upload a Bible of your own and read it under one of the languages we already carry.',
  languages: 'Show translations together on the same slide so your church can read in more than one language.',
  songs: 'Keep your song lyrics in LlamaPresenter, typed in or imported from a ProPresenter export.',
  songs_per_playlist: 'Choose how many songs can be in a single running order for a service.',
  playlists: 'Create a running order for each service or event.',
  audio_tracks: 'Play your own music files directly from the console.',
  audio_categories: 'Keep your music organized into separate libraries for different services or teams.',
  name_cards: 'Show speaker names and titles on your livestream.',
  custom_templates: 'Create your own designs for verses and lyrics instead of using only the built-in templates.',
  custom_fonts: 'Use your own fonts in your presentation templates.',
  sessions: 'Run more than one service or presentation at the same time.',
};

export const proLimitValue = (key: LimitKey) => (key === 'languages' ? String(MAX_LANGS) : 'Unlimited');

export const freeLimitValue = (key: LimitKey) =>
  FREE_LIMITS[key] === 0 ? 'Pro only' : String(FREE_LIMITS[key]);

export const INCLUDED = [
  {
    title: 'The Bible',
    items: [
      'Every translation we support',
      'Every other language too, from a Bible you add yourself',
      'Side-by-side languages on one slide',
      'Search by reference or by the words of a verse',
      'Psalms split the way each translation splits them',
    ],
  },
  {
    title: 'Screens',
    items: [
      'A projector output for the room',
      'A stage display for your team',
      'A transparent lower third for OBS, vMix, or another streaming tool',
      'A countdown timer for the room or stage',
      'As many screens as you need, each with its own link',
    ],
  },
  {
    title: 'Running the service',
    items: [
      'Control it from your phone, from anywhere in the room',
      'Songs, verses, and announcements in one running order',
      'Name cards for whoever is speaking',
      'Built-in backgrounds and your own pictures and videos',
      'Your own music, played from the console',
    ],
  },
  {
    title: 'Your account',
    items: [
      'No card required to start',
      'Your work stays yours if you stop paying',
      'Cancel from the console whenever you need',
      'Runs in a browser on Windows, macOS, Linux, ChromeOS, and more',
    ],
  },
];

export type PlanCell = true | false | string;

export interface ComparisonRow {
  label: string;
  one?: string;
  note?: string;
  free: PlanCell;
  pro: PlanCell;
}

export interface ComparisonGroup {
  title: string;
  rows: ComparisonRow[];
}

const limitRow = (key: LimitKey): ComparisonRow => ({
  label: LIMIT_LABELS[key].many,
  one: LIMIT_LABELS[key].one,
  note: LIMIT_NOTES[key],
  free: FREE_LIMITS[key] === 0 ? false : String(FREE_LIMITS[key]),
  pro: proLimitValue(key),
});

export const COMPARISON: ComparisonGroup[] = [
  {
    title: 'The Bible on the screen',
    rows: [
      { label: 'Every translation we hold', free: true, pro: true },
      {
        label: 'Bibles in any other language, added from a public archive',
        note: 'Over a thousand of them, in hundreds of languages, with nothing to download or upload.',
        free: true,
        pro: true,
      },
      { label: 'Search by reference, or by the words of a verse', free: true, pro: true },
      { label: 'Psalms split the way each translation splits them', free: true, pro: true },
      limitRow('languages'),
      limitRow('passages'),
      limitRow('translations'),
    ],
  },
  {
    title: 'Screens and outputs',
    rows: [
      { label: 'Projector output for the room', free: true, pro: true },
      { label: 'Stage display for your team', free: true, pro: true },
      { label: 'Transparent lower third for OBS or vMix', free: true, pro: true },
      { label: 'Countdown timer on any screen', free: true, pro: true },
      { label: 'As many screens as you need, each with its own link', free: true, pro: true },
      { label: 'No account needed on the projector machine', free: true, pro: true },
    ],
  },
  {
    title: 'Songs and the running order',
    rows: [
      { label: 'Type lyrics in, or import a ProPresenter export', free: true, pro: true },
      limitRow('songs'),
      limitRow('songs_per_playlist'),
      limitRow('playlists'),
    ],
  },
  {
    title: 'Backgrounds and music',
    rows: [
      { label: `${THEMES.length} built-in backgrounds`, free: true, pro: true },
      { label: 'Your own pictures and videos', note: 'Kept on your own machine, never uploaded.', free: true, pro: true },
      limitRow('audio_tracks'),
      limitRow('audio_categories'),
    ],
  },
  {
    title: 'Your stream, and your own look',
    rows: [
      limitRow('name_cards'),
      limitRow('custom_templates'),
      limitRow('custom_fonts'),
    ],
  },
  {
    title: 'Running the service',
    rows: [
      { label: 'Control it from your phone, anywhere in the room', free: true, pro: true },
      limitRow('sessions'),
    ],
  },
  {
    title: 'Your account',
    rows: [
      { label: 'No card required to start', free: true, pro: true },
      { label: 'Your work stays yours if you stop paying', free: true, pro: true },
      { label: 'Cancel from the console, in two clicks', free: true, pro: true },
      { label: 'Runs in a browser on Windows, macOS, Linux and ChromeOS', free: true, pro: true },
    ],
  },
];
