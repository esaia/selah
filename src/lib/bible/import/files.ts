import JSZip from 'jszip';

import { entriesOf, titleOf, treeUrl, type Archive, type ArchiveEntry, type TreeNode } from '@/lib/bible/import/archives';
import { mergeBibles, parseBibleXml } from '@/lib/bible/import/parse';
import type { ParsedBible } from '@/lib/bible/import/types';

const READABLE = /\.(xml|usx|usfx|osis)$/i;

const isZip = (name: string) => /\.zip$/i.test(name);

const textOf = async (file: Blob) => {
  const text = await file.text();

  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
};

export const parseBibleFiles = async (files: Iterable<File>): Promise<ParsedBible | null> => {
  const parts: ParsedBible[] = [];

  for (const file of files) {
    if (isZip(file.name)) {
      const zip = await JSZip.loadAsync(file);
      const entries = Object.values(zip.files).filter(entry => !entry.dir && READABLE.test(entry.name));

      for (const entry of entries) {
        const parsed = parseBibleXml(await entry.async('text'));

        if (parsed) parts.push(parsed);
      }

      continue;
    }

    if (!READABLE.test(file.name)) continue;

    const parsed = parseBibleXml(await textOf(file));

    if (parsed) parts.push(parsed);
  }

  const merged = mergeBibles(parts);

  if (!merged) return null;

  const first = [...files][0];

  return merged.name ? merged : { ...merged, name: first ? titleOf(first.name) : '' };
};

export const listArchive = async (archive: Archive): Promise<ArchiveEntry[]> => {
  const response = await fetch(treeUrl(archive), { headers: { accept: 'application/vnd.github+json' } });

  if (!response.ok) {
    throw new Error(
      response.status === 403
        ? 'GitHub is not answering right now — it allows a limited number of listings an hour. Try again later, or download the file yourself.'
        : `Could not read ${archive.name} (${response.status}).`,
    );
  }

  const body = (await response.json()) as { tree?: TreeNode[] };

  return entriesOf(archive, body.tree ?? []);
};

export const fetchArchiveEntry = async (entry: ArchiveEntry): Promise<ParsedBible | null> => {
  const response = await fetch(entry.url);

  if (!response.ok) throw new Error(`Could not download ${entry.name} (${response.status}).`);

  return parseBibleXml(await response.text());
};
