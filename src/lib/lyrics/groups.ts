
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

const OTHER = '#64748b';

export const colorOf = (group: string): string => {
  const name = group.trim().toLowerCase();

  return FAMILIES.find(family => name.startsWith(family.match))?.color ?? OTHER;
};

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

const tidy = (name: string): string => {
  const trimmed = name.trim().replace(/\s+/g, ' ');
  const known = GROUPS.find(group => group.toLowerCase() === trimmed.toLowerCase());

  return known ?? trimmed;
};

export const headerOf = (line: string): string | null => {
  const trimmed = line.trim();

  const bracketed = trimmed.match(/^[[(]([^\]),]{1,60})[\])]$/);
  const named = bracketed?.[1] ?? trimmed.match(/^([A-Za-z][A-Za-z-]{1,14}\s?\d{0,2}):$/)?.[1];

  if (!named) return null;

  const section = named.split(':')[0].trim();

  return section ? tidy(section) : null;
};

const CHORD_SYMBOL =
  /^[A-G](?:#|b)?(?:maj7|maj9|maj|min7|min|m7|m9|m11|m13|m6|m|sus2|sus4|sus|add9|add11|add2|dim7|dim|aug|6|7|9|11|13)?(?:\/[A-G](?:#|b)?)?$/;
const CHORD_MARKER = /^(?:N\.?C\.?|%|x\d+|\(x\d+\))$/i;
const isChordToken = (token: string): boolean => CHORD_MARKER.test(token) || CHORD_SYMBOL.test(token);

export const isChordLine = (line: string): boolean => {
  const tokens = line.trim().split(/\s+/).filter(Boolean);

  return tokens.length > 0 && tokens.every(isChordToken);
};

const isCapoLine = (line: string): boolean => /^(with\s+)?capo\b|^no\s+capo\b/i.test(line.trim());

export const sectionsOf = (text: string): { group: string; text: string }[] => {
  const sections: { group: string; text: string }[] = [{ group: '', text: '' }];

  for (const line of text.split('\n')) {
    const header = headerOf(line);

    if (header) {
      sections.push({ group: header, text: '' });
      continue;
    }

    if (isChordLine(line) || isCapoLine(line)) continue;

    const last = sections[sections.length - 1];
    last.text = last.text ? `${last.text}\n${line}` : line;
  }

  return sections.filter(section => section.text.trim().length > 0);
};

export const withoutPreamble = (text: string): string => {
  const lines = text.split('\n');
  const first = lines.findIndex(line => headerOf(line));

  return first > 0 ? lines.slice(first).join('\n') : text;
};
