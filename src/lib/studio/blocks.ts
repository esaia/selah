import { emptyShowData, groupVerses, type Block, type Lang, type Live, type ShowData } from '@/lib/types';

export interface Workspace {
  blocks: Block[];
  live: Live;
}

const withBlock = (workspace: Workspace, id: string, map: (block: Block) => Block): Workspace => ({
  ...workspace,
  blocks: workspace.blocks.map(block => (block.id === id ? map(block) : block)),
});

const pointsAt = (live: Live, id: string): live is { blockId: string; verseIndex: number } =>
  Boolean(live && live.kind !== 'lyrics' && live.blockId === id);

export const extensionVerse = (block: Block, side: 'start' | 'end'): number | null => {
  if (!block.verses?.length) return null;

  const added = side === 'start' ? block.verses[0] - 1 : block.verses[block.verses.length - 1] + 1;

  if (added < 1 || (block.chapterLength && added > block.chapterLength)) return null;

  return added;
};

export const extensionSpan = (block: Block, side: 'start' | 'end'): number[] => {
  const edge = extensionVerse(block, side);

  if (edge === null) return [];

  if (side === 'start') return Array.from({ length: edge }, (_, index) => index + 1);

  if (!block.chapterLength) return [edge];

  return Array.from({ length: block.chapterLength - edge + 1 }, (_, index) => edge + index);
};

export const planExtension = (
  block: Block,
  side: 'start' | 'end',
  live: Live,
  span: 'verse' | 'chapter' = 'verse',
) => {
  const edge = extensionVerse(block, side);
  const added = span === 'chapter' ? extensionSpan(block, side) : edge === null ? [] : [edge];

  if (added.length === 0) return null;

  const cards = added.map(verse => [verse]);

  return {
    verses: side === 'start' ? [...added, ...block.verses] : [...block.verses, ...added],
    groups: side === 'start' ? [...cards, ...block.groups] : [...block.groups, ...cards],
    live:
      side === 'start' && pointsAt(live, block.id)
        ? { ...live, verseIndex: live.verseIndex + added.length }
        : live,
  };
};

export const planTrim = (block: Block, groupIndex: number) => {
  if (!block.groups?.[groupIndex]) return undefined;

  const groups = block.groups.slice(0, groupIndex);
  const kept = new Set(groups.flat());
  const verses = block.verses.filter(verse => kept.has(verse));

  return verses.length === 0 ? null : { verses, groups };
};

export const planDropFirst = (block: Block, live: Live) => {
  if (!block.groups?.length) return undefined;

  const groups = block.groups.slice(1);

  if (groups.length === 0) return null;

  const kept = new Set(groups.flat());

  return {
    verses: block.verses.filter(verse => kept.has(verse)),
    groups,
    live: pointsAt(live, block.id)
      ? live.verseIndex === 0
        ? null
        : { ...live, verseIndex: live.verseIndex - 1 }
      : live,
  };
};

export const joinGroup = (workspace: Workspace, id: string, groupIndex: number): Workspace => {
  const next = withBlock(workspace, id, block => {
    if (groupIndex >= block.groups.length - 1) return block;

    const groups = [...block.groups];
    groups.splice(groupIndex, 2, [...groups[groupIndex], ...groups[groupIndex + 1]]);
    return { ...block, groups };
  });

  return {
    ...next,
    live:
      pointsAt(workspace.live, id) && workspace.live.verseIndex > groupIndex
        ? { ...workspace.live, verseIndex: workspace.live.verseIndex - 1 }
        : workspace.live,
  };
};

export const splitGroup = (workspace: Workspace, id: string, groupIndex: number): Workspace => {
  const added = (workspace.blocks.find(block => block.id === id)?.groups[groupIndex] ?? []).length - 1;

  const next = withBlock(workspace, id, block => {
    if ((block.groups[groupIndex] ?? []).length < 2) return block;

    const groups = [...block.groups];
    groups.splice(groupIndex, 1, ...groups[groupIndex].map(verse => [verse]));
    return { ...block, groups };
  });

  return {
    ...next,
    live:
      added > 0 && pointsAt(workspace.live, id) && workspace.live.verseIndex > groupIndex
        ? { ...workspace.live, verseIndex: workspace.live.verseIndex + added }
        : workspace.live,
  };
};

export const liveGroup = ({ blocks, live }: Workspace): number[] | null => {
  if (!live || live.kind === 'lyrics') return null;

  return blocks.find(block => block.id === live.blockId)?.groups[live.verseIndex] ?? null;
};

export const removeBlock = (workspace: Workspace, id: string): Workspace => ({
  blocks: workspace.blocks.filter(block => block.id !== id),
  live: pointsAt(workspace.live, id) ? null : workspace.live,
});

export const moveBlockTo = (workspace: Workspace, id: string, insertIndex: number): Workspace => {
  const from = workspace.blocks.findIndex(block => block.id === id);

  if (from === -1) return workspace;

  const blocks = [...workspace.blocks];
  const [moved] = blocks.splice(from, 1);
  const target = from < insertIndex ? insertIndex - 1 : insertIndex;

  blocks.splice(Math.max(0, Math.min(target, blocks.length)), 0, moved);

  return { ...workspace, blocks };
};

export const orderBlocks = (workspace: Workspace, ids: string[]): Workspace => {
  const known = new Set(ids);

  return {
    ...workspace,
    blocks: [
      ...ids.map(id => workspace.blocks.find(block => block.id === id)).filter((block): block is Block => Boolean(block)),
      ...workspace.blocks.filter(block => !known.has(block.id)),
    ],
  };
};

export const moveBlock = (workspace: Workspace, id: string, direction: number): Workspace => {
  const index = workspace.blocks.findIndex(block => block.id === id);
  const target = index + direction;

  if (index === -1 || target < 0 || target >= workspace.blocks.length) return workspace;

  const blocks = [...workspace.blocks];
  [blocks[index], blocks[target]] = [blocks[target], blocks[index]];

  return { ...workspace, blocks };
};

export const setCollapsed = (workspace: Workspace, collapsed: boolean): Workspace => ({
  ...workspace,
  blocks: workspace.blocks.map(block => ({ ...block, collapsed })),
});

export const toggleCollapsed = (workspace: Workspace, id: string): Workspace =>
  withBlock(workspace, id, block => ({ ...block, collapsed: !block.collapsed }));

export const regroup = (groups: number[][] | undefined, verses: number[]): number[][] =>
  (groups ?? verses.map(verse => [verse]))
    .map(group => group.filter(verse => verses.includes(verse)))
    .filter(group => group.length > 0);

export const stepWithin = (block: Block | undefined, live: Live, direction: number): number | null => {
  if (!live || live.kind === 'lyrics' || !block) return null;

  const next = live.verseIndex + direction;

  return next < 0 || next >= (block.groups?.length ?? 0) ? null : next;
};

export const slideOf = (
  block: Block | undefined,
  groupIndex: number,
  enabled: Partial<Record<Lang, boolean>>,
): ShowData => {
  const group = block?.groups?.[groupIndex];

  if (!block || !group) return emptyShowData();

  return Object.fromEntries(
    Object.keys(enabled)
      .filter((lang): lang is Lang => Boolean(enabled[lang as Lang]))
      .map(lang => [lang, groupVerses(block, lang, group)]),
  );
};
