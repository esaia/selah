import { describe, expect, it } from 'vitest';

import { archiveById, ARCHIVES, entriesOf, entryMatches, sizeOf, titleOf, type TreeNode } from './archives';

const beblia = archiveById('beblia')!;
const gratis = archiveById('gratis')!;

describe('the archives', () => {
  it('are named once each and reachable by id', () => {
    expect(new Set(ARCHIVES.map(archive => archive.id)).size).toBe(ARCHIVES.length);
    expect(archiveById('nowhere')).toBeNull();
  });
});

describe('a filename as a name', () => {
  it('puts the spaces back', () => {
    expect(titleOf('AdilabadGondiBible.xml')).toBe('Adilabad Gondi');
    expect(titleOf('Albanian1872Bible.xml')).toBe('Albanian 1872');
    expect(titleOf('AfrikaansBible.xml')).toBe('Afrikaans');
  });

  it('reads a path down to its file', () => {
    expect(titleOf('en/kjv.xml')).toBe('kjv');
    expect(titleOf('ru/rst.xml')).toBe('rst');
  });
});

describe('a flat archive', () => {
  const tree: TreeNode[] = [
    { path: 'AfrikaansBible.xml', type: 'blob', size: 5_221_096 },
    { path: 'AcehBible.xml', type: 'blob', size: 6_380_704 },
    { path: '.gitattributes', type: 'blob', size: 20 },
    { path: 'docs', type: 'tree' },
    { path: 'docs/notes.xml', type: 'blob', size: 10 },
  ];

  const found = entriesOf(beblia, tree);

  it('takes the files it can read and no others', () => {
    expect(found.map(entry => entry.name)).toEqual(['Aceh', 'Afrikaans']);
  });

  it('points at the raw file on the archive’s own host', () => {
    expect(found[1].url).toBe(
      'https://raw.githubusercontent.com/Beblia/Holy-Bible-XML-Format/master/AfrikaansBible.xml',
    );
  });

  it('leaves anything filed below the top level alone', () => {
    expect(found.some(entry => entry.path.includes('/'))).toBe(false);
  });
});

describe('an archive filed by language', () => {
  const tree: TreeNode[] = [
    { path: 'README.md', type: 'blob', size: 100 },
    { path: 'notes.xml', type: 'blob', size: 100 },
    { path: 'ru/rst.xml', type: 'blob', size: 7_480_872 },
    { path: 'en/kjv.xml', type: 'blob', size: 5_512_182 },
  ];

  const found = entriesOf(gratis, tree);

  it('names the language rather than its code', () => {
    expect(found.map(entry => entry.group)).toEqual(['English', 'Russian']);
  });

  it('sorts by language, then by name', () => {
    expect(found.map(entry => entry.name)).toEqual(['kjv', 'rst']);
  });

  it('skips a file that is under no language at all', () => {
    expect(found.some(entry => entry.path === 'notes.xml')).toBe(false);
  });
});

describe('searching the list', () => {
  const entry = { path: 'ru/rst.xml', name: 'rst', group: 'Russian', bytes: 1, url: '' };

  it('matches the language as readily as the name', () => {
    expect(entryMatches(entry, 'russian')).toBe(true);
    expect(entryMatches(entry, 'rst')).toBe(true);
    expect(entryMatches(entry, '')).toBe(true);
  });

  it('needs every word to match, not any of them', () => {
    expect(entryMatches(entry, 'russian rst')).toBe(true);
    expect(entryMatches(entry, 'russian kjv')).toBe(false);
  });
});

describe('a size somebody can judge a download by', () => {
  it('is megabytes for a Bible and kilobytes for anything else', () => {
    expect(sizeOf(5_512_182)).toBe('5.5 MB');
    expect(sizeOf(24_000)).toBe('24 KB');
    expect(sizeOf(10)).toBe('1 KB');
  });
});
