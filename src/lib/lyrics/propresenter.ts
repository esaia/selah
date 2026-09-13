import JSZip from 'jszip';

import type { Song } from '@/lib/types';

const rtfBlobs = (latin1: string): string[] => {
  const found: string[] = [];
  const marker = /\{\\rtf/g;
  let match = marker.exec(latin1);

  while (match) {
    let depth = 0;

    for (let i = match.index; i < latin1.length; i += 1) {
      const char = latin1[i];

      if (char === '{') {
        depth += 1;
      } else if (char === '}') {
        depth -= 1;

        if (depth === 0) {
          found.push(latin1.slice(match.index, i + 1));
          marker.lastIndex = i + 1;
          break;
        }
      }
    }

    match = marker.exec(latin1);
  }

  return found;
};

const CONTROL_WORD = /^\\([a-zA-Z]+)(-?\d+)? ?/;
const UNICODE_ESCAPE = /^\\u(-?\d+) ?/;
const HEX_ESCAPE = /^\\'([0-9a-fA-F]{2})/;

const MARKUP_GROUPS = new Set([
  'fonttbl',
  'colortbl',
  'stylesheet',
  'listtable',
  'listoverridetable',
  'info',
  'filetbl',
  'revtbl',
  'generator',
  'xmlnstbl',
  'pntext',
]);

export const rtfToText = (rtf: string): string => {
  const out: string[] = [];

  let depth = 0;
  let skipping: number | null = null;
  let fresh = false;

  let uc = 1;

  const keeping = () => skipping === null;

  let i = 0;

  while (i < rtf.length) {
    const char = rtf[i];

    if (char === '{') {
      depth += 1;
      fresh = true;
      i += 1;
      continue;
    }

    if (char === '}') {
      depth -= 1;

      if (skipping !== null && depth < skipping) skipping = null;

      fresh = false;
      i += 1;
      continue;
    }

    if (char === '\\') {
      const rest = rtf.slice(i, i + 24);

      if (rest[1] === '*') {
        if (fresh && keeping()) skipping = depth;

        i += 2;
        fresh = false;
        continue;
      }

      const unicode = UNICODE_ESCAPE.exec(rest);

      if (unicode) {
        const code = Number(unicode[1]);

        if (keeping()) out.push(String.fromCharCode(code < 0 ? code + 65536 : code));

        i += unicode[0].length;
        i = skipReplacement(rtf, i, uc);
        fresh = false;
        continue;
      }

      const hex = HEX_ESCAPE.exec(rest);

      if (hex) {
        if (keeping()) out.push(String.fromCharCode(parseInt(hex[1], 16)));

        i += hex[0].length;
        fresh = false;
        continue;
      }

      const word = CONTROL_WORD.exec(rest);

      if (word) {
        if (word[1] === 'uc') {
          uc = Math.max(0, Number(word[2] ?? 1));
        } else if (fresh && MARKUP_GROUPS.has(word[1])) {
          if (keeping()) skipping = depth;
        } else if (keeping() && (word[1] === 'par' || word[1] === 'line')) {
          out.push('\n');
        }

        i += word[0].length;
        fresh = false;
        continue;
      }

      if (keeping()) out.push(rtf[i + 1] || '');

      i += 2;
      fresh = false;
      continue;
    }

    if (keeping()) out.push(char);

    i += 1;
    fresh = false;
  }

  return out
    .join('')
    .split('\n')
    .map(line => line.trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
};

const skipReplacement = (rtf: string, start: number, uc: number): number => {
  let i = start;

  for (let taken = 0; taken < uc && i < rtf.length; taken += 1) {
    if (rtf[i] === '\\') {
      const hex = HEX_ESCAPE.exec(rtf.slice(i, i + 4));

      if (hex) {
        i += hex[0].length;
        continue;
      }

      const word = CONTROL_WORD.exec(rtf.slice(i, i + 24));

      if (word) break;

      i += 2;
      continue;
    }

    if (rtf[i] === '{' || rtf[i] === '}') break;

    i += 1;
  }

  return i;
};

const decodeLatin1 = (buffer: ArrayBuffer): string => {
  const bytes = new Uint8Array(buffer);
  let out = '';

  for (let i = 0; i < bytes.length; i += 0x8000) {
    out += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }

  return out;
};

const slug = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/(^-|-$)/g, '');

export const parseProDocument = (buffer: ArrayBuffer, filename: string): Song => {
  const title = filename.replace(/\.pro$/i, '');
  const seen = new Set();

  const slides = rtfBlobs(decodeLatin1(buffer))
    .map(blob => rtfToText(blob))
    .filter(text => text.length > 0)
    .map((text, index) => ({ id: `${slug(title) || 'song'}-${index}`, text }));

  const unique = slides.filter(slide => {
    const key = `${slide.text}`;

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });

  return {
    id: `${slug(title) || 'song'}-${buffer.byteLength}`,
    title,
    slides: unique,
  };
};

const isPro = (name: string) => /\.pro$/i.test(name) && !name.startsWith('__MACOSX');

export const parseProBundle = async (file: Blob): Promise<Song[]> => {
  const zip = await JSZip.loadAsync(file);
  const entries = Object.values(zip.files).filter(entry => !entry.dir && isPro(entry.name));

  const songs = await Promise.all(
    entries.map(async entry => {
      const buffer = await entry.async('arraybuffer');
      return parseProDocument(buffer, entry.name.split('/').pop() ?? entry.name);
    }),
  );

  return songs.filter(song => song.slides.length > 0).sort((a, b) => a.title.localeCompare(b.title));
};

export const parseDroppedFiles = async (files: Iterable<File>): Promise<Song[]> => {
  const songs: Song[] = [];

  for (const file of files) {
    if (/\.(proBundle|zip)$/i.test(file.name)) {
      songs.push(...(await parseProBundle(file)));
    } else if (isPro(file.name)) {
      const buffer = await file.arrayBuffer();
      const song = parseProDocument(buffer, file.name);

      if (song.slides.length > 0) {
        songs.push(song);
      }
    }
  }

  return songs;
};
