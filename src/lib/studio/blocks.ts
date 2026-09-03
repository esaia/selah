import { LANGS, emptyShowData, groupVerses, type Block, type Lang, type Live, type ShowData } from '@/lib/types';

/**
 * Pure operations on the passage list.
 *
 * These are the parts where an off-by-one silently shows the wrong verse: the
 * live pointer is an index into a block's `groups`, so anything that inserts,
 * merges or drops a group has to move the pointer with it. Kept out of the
 * provider so they can be tested without a browser, a session or a network.
 */

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

/** Which verse number a block would gain on either end, or null at the edges. */
export const extensionVerse = (block: Block, side: 'start' | 'end'): number | null => {
  if (!block.verses?.length) return null;

  const added = side === 'start' ? block.verses[0] - 1 : block.verses[block.verses.length - 1] + 1;

  if (added < 1 || (block.chapterLength && added > block.chapterLength)) return null;

  return added;
};

/**
 * Where an extension leaves the block. The verses themselves still have to be
 * fetched — this only decides the shape and moves the live pointer, because
 * prepending shifts every card along by one.
 */
export const planExtension = (block: Block, side: 'start' | 'end', live: Live) => {
  const added = extensionVerse(block, side);

  if (added === null) return null;

  return {
    verses: side === 'start' ? [added, ...block.verses] : [...block.verses, added],
    groups: side === 'start' ? [[added], ...block.groups] : [...block.groups, [added]],
    live:
      side === 'start' && pointsAt(live, block.id) ? { ...live, verseIndex: live.verseIndex + 1 } : live,
  };
};

/**
 * Trim a block at a card: everything from `groupIndex` on is dropped. Returns
 * null when the block would be left empty, which the caller reads as "delete".
 */
export const planTrim = (block: Block, groupIndex: number) => {
  if (!block.groups?.[groupIndex]) return undefined;

  const groups = block.groups.slice(0, groupIndex);
  const kept = new Set(groups.flat());
  const verses = block.verses.filter(verse => kept.has(verse));

  return verses.length === 0 ? null : { verses, groups };
};

/** Merge a card with the one after it, so both verses show on one slide. */
export const joinGroup = (workspace: Workspace, id: string, groupIndex: number): Workspace => {
  const next = withBlock(workspace, id, block => {
    if (groupIndex >= block.groups.length - 1) return block;

    const groups = [...block.groups];
    groups.splice(groupIndex, 2, [...groups[groupIndex], ...groups[groupIndex + 1]]);
    return { ...block, groups };
  });

  // One card fewer before the pointer means the pointer moves back with it.
  return {
    ...next,
    live:
      pointsAt(workspace.live, id) && workspace.live.verseIndex > groupIndex
        ? { ...workspace.live, verseIndex: workspace.live.verseIndex - 1 }
        : workspace.live,
  };
};

/** Break a joined card back into one card per verse. */
export const splitGroup = (workspace: Workspace, id: string, groupIndex: number): Workspace => {
  const added = (workspace.blocks.find(block => block.id === id)?.groups[groupIndex] ?? []).length - 1;

  const next = withBlock(workspace, id, block => {
    if ((block.groups[groupIndex] ?? []).length < 2) return block;

    const groups = [...block.groups];
    groups.splice(groupIndex, 1, ...groups[groupIndex].map(verse => [verse]));
    return { ...block, groups };
  });

  // The cards the split added push everything after them along.
  return {
    ...next,
    live:
      added > 0 && pointsAt(workspace.live, id) && workspace.live.verseIndex > groupIndex
        ? { ...workspace.live, verseIndex: workspace.live.verseIndex + added }
        : workspace.live,
  };
};

/** The verses on the card that is live, or null when no verse card is. */
export const liveGroup = ({ blocks, live }: Workspace): number[] | null => {
  if (!live || live.kind === 'lyrics') return null;

  return blocks.find(block => block.id === live.blockId)?.groups[live.verseIndex] ?? null;
};

export const removeBlock = (workspace: Workspace, id: string): Workspace => ({
  blocks: workspace.blocks.filter(block => block.id !== id),
  live: pointsAt(workspace.live, id) ? null : workspace.live,
});

/** Reorder by dropping: `insertIndex` is the slot the block should land in. */
export const moveBlockTo = (workspace: Workspace, id: string, insertIndex: number): Workspace => {
  const from = workspace.blocks.findIndex(block => block.id === id);

  if (from === -1) return workspace;

  const blocks = [...workspace.blocks];
  const [moved] = blocks.splice(from, 1);
  // Removing the block first shifts every later slot down by one.
  const target = from < insertIndex ? insertIndex - 1 : insertIndex;

  blocks.splice(Math.max(0, Math.min(target, blocks.length)), 0, moved);

  return { ...workspace, blocks };
};

/**
 * The whole running order at once, as a drag leaves it. Ids the drag never saw
 * — a passage searched on another console while one was in the air — keep their
 * place at the end rather than dropping out of the workspace.
 */
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

/**
 * Regroup after a refetch: a verse that no longer exists in the translation is
 * dropped from its card, and a card left empty disappears.
 */
export const regroup = (groups: number[][] | undefined, verses: number[]): number[][] =>
  (groups ?? verses.map(verse => [verse]))
    .map(group => group.filter(verse => verses.includes(verse)))
    .filter(group => group.length > 0);

/** The next slide in the given direction, or null at either end of the block. */
export const stepWithin = (block: Block | undefined, live: Live, direction: number): number | null => {
  if (!live || live.kind === 'lyrics' || !block) return null;

  const next = live.verseIndex + direction;

  return next < 0 || next >= (block.groups?.length ?? 0) ? null : next;
};

/**
 * One card of a block as an output would receive it: the armed languages
 * filled in, the rest left empty.
 *
 * A card index off either end gives an empty slide rather than nothing, which
 * is what lets the caller ask for `groupIndex + 1` without a guard — the stage
 * display's "up next" box is blank at the end of a block, and that is the
 * honest answer, not an error.
 */
export const slideOf = (
  block: Block | undefined,
  groupIndex: number,
  enabled: Record<Lang, boolean>,
): ShowData => {
  const group = block?.groups?.[groupIndex];

  if (!block || !group) return emptyShowData();

  return {
    ...emptyShowData(),
    ...Object.fromEntries(LANGS.map(lang => [lang, enabled[lang] ? groupVerses(block, lang, group) : []])),
  } as ShowData;
};
