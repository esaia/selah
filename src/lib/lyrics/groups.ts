/**
 * What part of the song a slide is: verse, chorus, bridge, tag.
 *
 * ProPresenter's own vocabulary, because it is the one every worship leader in
 * the room already speaks — "take it from the bridge" has to mean something the
 * operator can find without reading four slides to work out which is which.
 *
 * A group is stored as a plain string on the slide rather than as an id into a
 * table. It survives an export, a paste and a name nobody here thought of
 * ("Vamp 2", "Nino"), and the colour is derived from the name rather than
 * chosen alongside it — two slides marked Chorus are the same colour because
 * they say the same word, and never drift apart.
 */

/** The families, in the order the picker offers them. */
const FAMILIES = [
  { match: 'prechorus', color: '#ec4899' },
  { match: 'pre-chorus', color: '#ec4899' },
  { match: 'verse', color: '#3b82f6' },
  { match: 'chorus', color: '#e11d48' },
  { match: 'bridge', color: '#8b5cf6' },
  { match: 'tag', color: '#f97316' },
  { match: 'intro', color: '#ca8a04' },
  { match: 'ending', color: '#ca8a04' },
  { match: 'outro', color: '#ca8a04' },
  { match: 'interlude', color: '#22c55e' },
  { match: 'vamp', color: '#22c55e' },
  { match: 'turnaround', color: '#22c55e' },
  { match: 'instrumental', color: '#22c55e' },
  { match: 'blank', color: '#111827' },
];

/** Anything the families do not know, marked but not guessed at. */
const OTHER = '#64748b';

/**
 * The ink a group is drawn in.
 *
 * Matched on the front of the name so the numbered ones come out the same
 * colour as the family — Verse 1 and Verse 4 are both blue, which is what makes
 * a column of stripes readable at a glance. Pre-chorus is checked before
 * chorus, or every pre-chorus in the world would come out red.
 */
export const colorOf = (group: string): string => {
  const name = group.trim().toLowerCase();

  return FAMILIES.find(family => name.startsWith(family.match))?.color ?? OTHER;
};

/** What the picker offers, as ProPresenter offers it. */
export const GROUPS = [
  'Verse',
  'Verse 1',
  'Verse 2',
  'Verse 3',
  'Verse 4',
  'Chorus',
  'Chorus 1',
  'Chorus 2',
  'PreChorus',
  'Bridge',
  'Bridge 2',
  'Tag',
  'Intro',
  'Interlude',
  'Vamp',
  'Turnaround',
  'Ending',
  'Outro',
  'Blank',
];

/** `verse 1` typed by hand, as `Verse 1` on the card. */
const tidy = (name: string): string => {
  const trimmed = name.trim().replace(/\s+/g, ' ');
  const known = GROUPS.find(group => group.toLowerCase() === trimmed.toLowerCase());

  return known ?? trimmed;
};

/**
 * The group a header line names, or nothing if the line is words to sing.
 *
 * Every lyric sheet worth importing marks its sections, and all of them do it
 * one of two ways: in brackets, as Genius and Ultimate Guitar write it, or with
 * a colon on a line of its own, as a chord chart does. Whatever follows a colon
 * inside the brackets is who sings it, which is a credit rather than a section,
 * so it is dropped.
 */
export const headerOf = (line: string): string | null => {
  const trimmed = line.trim();

  const bracketed = trimmed.match(/^[[(]([^\]),]{1,60})[\])]$/);
  const named = bracketed?.[1] ?? trimmed.match(/^([A-Za-z][A-Za-z-]{1,14}\s?\d{0,2}):$/)?.[1];

  if (!named) return null;

  // "Verse 1: Charity Gayle" is one section sung by one person, not two.
  const section = named.split(':')[0].trim();

  return section ? tidy(section) : null;
};

/**
 * A lyric sheet as its sections.
 *
 * The header lines come out of the words — nobody wants "[Chorus]" on the
 * projector — and become the group the slides under them carry. Anything
 * before the first header belongs to no section, which is the honest answer
 * for a sheet that has none.
 */
export const sectionsOf = (text: string): { group: string; text: string }[] => {
  const sections: { group: string; text: string }[] = [{ group: '', text: '' }];

  for (const line of text.split('\n')) {
    const header = headerOf(line);

    if (header) {
      sections.push({ group: header, text: '' });
      continue;
    }

    const last = sections[sections.length - 1];
    last.text = last.text ? `${last.text}\n${line}` : line;
  }

  return sections.filter(section => section.text.trim().length > 0);
};

/**
 * The words, without whatever the page put above them.
 *
 * A lyrics site wraps the sheet in furniture — a contributor count, the title
 * again with the word "Lyrics" after it — and it arrives as the first two
 * slides of an import, which is two slides the operator deletes by hand every
 * single time. Where a sheet marks its sections, anything above the first
 * marker is that furniture. Where it marks none, nothing is dropped: there is
 * no way to tell a preamble from the first verse, and losing a verse is far
 * worse than keeping a line nobody wanted.
 */
export const withoutPreamble = (text: string): string => {
  const lines = text.split('\n');
  const first = lines.findIndex(line => headerOf(line));

  return first > 0 ? lines.slice(first).join('\n') : text;
};
