
const ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
};

export const decodeEntities = (text: string): string =>
  text
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&([a-z]+);/gi, (whole, name: string) => ENTITIES[name.toLowerCase()] ?? whole);

export const textFromHtml = (html: string): string =>
  decodeEntities(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/(p|div|h\d|li)>/gi, '\n\n')
      .replace(/<(p|div|h\d|li)\b[^>]*>/gi, '\n')
      .replace(/<[^>]*>/g, ''),
  )
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map(line => line.replace(/^\s*\d+\s{2,}/, '').trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

export const lyricsIn = (html: string, opening: RegExp): string => {
  const finder = new RegExp(opening.source, opening.flags.includes('g') ? opening.flags : `${opening.flags}g`);
  const parts: string[] = [];

  for (const match of html.matchAll(finder)) {
    const from = match.index + match[0].length;
    const tags = /<(\/?)div\b/gi;

    tags.lastIndex = from;

    let depth = 1;
    let to = html.length;

    for (let tag = tags.exec(html); tag; tag = tags.exec(html)) {
      depth += tag[1] ? -1 : 1;

      if (depth === 0) {
        to = tag.index;
        break;
      }
    }

    parts.push(textFromHtml(html.slice(from, to)));
  }

  return parts.filter(Boolean).join('\n\n').trim();
};

export const csvRows = (text: string): string[][] => {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;

  for (let at = 0; at < text.length; at += 1) {
    const char = text[at];

    if (quoted) {
      if (char !== '"') {
        field += char;
      } else if (text[at + 1] === '"') {
        field += '"';
        at += 1;
      } else {
        quoted = false;
      }

      continue;
    }

    if (char === '"') {
      quoted = true;
    } else if (char === ',') {
      row.push(field);
      field = '';
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && text[at + 1] === '\n') at += 1;

      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += char;
    }
  }

  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }

  return rows.filter(entry => entry.some(value => value.trim()));
};
