
export interface Archive {
  id: string;
  name: string;
  repo: string;
  branch: string;
  formats: string;
  note: string;
  home: string;
  layout: 'flat' | 'by-language';
}

export const ARCHIVES: Archive[] = [
  {
    id: 'beblia',
    name: 'Beblia',
    repo: 'Beblia/Holy-Bible-XML-Format',
    branch: 'master',
    formats: 'Beblia XML',
    note: 'Over a thousand whole Bibles, named by language.',
    home: 'https://github.com/Beblia/Holy-Bible-XML-Format',
    layout: 'flat',
  },
  {
    id: 'gratis',
    name: 'gratis-bible',
    repo: 'gratis-bible/bible',
    branch: 'master',
    formats: 'OSIS',
    note: 'Public-domain and freely licensed translations, filed by language.',
    home: 'https://github.com/gratis-bible/bible',
    layout: 'by-language',
  },
];

export const archiveById = (id: string): Archive | null => ARCHIVES.find(archive => archive.id === id) ?? null;

export interface ArchiveEntry {
  path: string;
  name: string;
  group: string;
  bytes: number;
  url: string;
}

export const treeUrl = (archive: Archive) =>
  `https://api.github.com/repos/${archive.repo}/git/trees/${archive.branch}?recursive=1`;

export const rawUrl = (archive: Archive, path: string) =>
  `https://raw.githubusercontent.com/${archive.repo}/${archive.branch}/${path}`;

export const titleOf = (path: string): string => {
  const file = path.split('/').pop() ?? path;
  const stem = file.replace(/\.[a-z]+$/i, '').replace(/Bible$/i, '');

  return (
    stem
      .replace(/[_-]+/g, ' ')
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/([A-Za-z])(\d)/g, '$1 $2')
      .replace(/(\d)([A-Za-z])/g, '$1 $2')
      .replace(/\s+/g, ' ')
      .trim() || stem
  );
};

export const languageOf = (code: string): string => {
  try {
    return new Intl.DisplayNames(['en'], { type: 'language' }).of(code) ?? code;
  } catch {
    return code;
  }
};

export interface TreeNode {
  path?: string;
  type?: string;
  size?: number;
}

const READABLE = /\.(xml|usx|osis)$/i;

export const entriesOf = (archive: Archive, tree: TreeNode[]): ArchiveEntry[] => {
  const files = tree.filter(
    node => node.type === 'blob' && typeof node.path === 'string' && READABLE.test(node.path),
  );

  return files
    .map(node => {
      const path = node.path as string;
      const parts = path.split('/');
      const nested = parts.length > 1;

      return {
        path,
        name: titleOf(path),
        group: archive.layout === 'by-language' && nested ? languageOf(parts[0]) : '',
        bytes: node.size ?? 0,
        url: rawUrl(archive, path),
      };
    })
    .filter(entry => (archive.layout === 'by-language' ? entry.group !== '' : !entry.path.includes('/')))
    .sort((a, b) => a.group.localeCompare(b.group) || a.name.localeCompare(b.name));
};

const normalize = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();

export const entryMatches = (entry: ArchiveEntry, search: string): boolean => {
  const needle = normalize(search);

  if (!needle) return true;

  const haystack = normalize(`${entry.group} ${entry.name} ${entry.path}`);

  return needle.split(/\s+/).every(word => haystack.includes(word));
};

export const sizeOf = (bytes: number): string =>
  bytes >= 1_000_000 ? `${Math.round(bytes / 100_000) / 10} MB` : `${Math.max(1, Math.round(bytes / 1000))} KB`;
