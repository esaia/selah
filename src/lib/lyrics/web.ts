/**
 * Reading lyrics out of a page that was written for a browser.
 *
 * None of the four sources the console searches has an API that returns words:
 * Genius' own API answers with metadata and says so in its terms, Ultimate
 * Guitar hides a JSON blob inside an attribute, Letras answers a search
 * autocomplete and nothing else, and Hymnary exports a list as CSV. So the
 * words come out of markup, and the tidying-up is the same in every case.
 *
 * Everything here is pure and tested, for the reason the psalm mapping is: a
 * selector that has drifted should show up as a wrong verse in a test rather
 * than as an empty song at ten to eleven on a Sunday.
 */

const ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
};

/** Named and numeric character references, as a page hands them over. */
export const decodeEntities = (text: string): string =>
  text
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&([a-z]+);/gi, (whole, name: string) => ENTITIES[name.toLowerCase()] ?? whole);

/**
 * A fragment of HTML as the words it holds.
 *
 * Line breaks are the point: `<br>` and the end of a block are where a lyric
 * sheet's own lines are, and losing them turns a verse into a paragraph. Runs
 * of blank lines collapse to one, because a blank line is what
 * `slidesFrom` breaks slides on and three of them would mean two empty slides.
 */
export const textFromHtml = (html: string): string =>
  decodeEntities(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<br\s*\/?>/gi, '\n')
      // A block ends a verse; one opening inside another only ends the line —
      // Genius wraps an annotated line in a container of its own, and treating
      // that as a verse break would split a verse wherever someone annotated it.
      .replace(/<\/(p|div|h\d|li)>/gi, '\n\n')
      .replace(/<(p|div|h\d|li)\b[^>]*>/gi, '\n')
      .replace(/<[^>]*>/g, ''),
  )
    .replace(/\r\n?/g, '\n')
    .split('\n')
    // A hymnal numbers its verses in the margin; the number is not a lyric.
    .map(line => line.replace(/^\s*\d+\s{2,}/, '').trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

/**
 * The insides of every element whose opening tag matches `opening`, run
 * together as one lyric sheet.
 *
 * Depth is counted rather than matched with a lazy `</div>`, because a lyric
 * container has containers of its own — Genius wraps annotated lines in their
 * own element, and stopping at the first closing tag takes the first line of a
 * verse and leaves the rest of the song on the page.
 */
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

/**
 * A CSV export as rows of fields.
 *
 * Hymnary's own export, so the shape is narrow: comma separated, quotes around
 * anything holding one, and a doubled quote for a literal. Written out rather
 * than split on commas because a hymn title with a comma in it is common and
 * splitting would shift every column after it.
 */
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
      // A row ends once, whichever line ending the file uses.
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
