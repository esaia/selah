import { describe, expect, it } from 'vitest';

import type { Block, Live } from '@/lib/types';

import { joinGroup, moveBlockTo, planExtension, planTrim, regroup, splitGroup, stepWithin } from './blocks';

const block = (overrides: Partial<Block> = {}): Block => ({
  id: 'b1',
  book: 47,
  chapter: 3,
  from: 16,
  to: 18,
  adminLang: 'geo',
  versions: {},
  chapterLength: 36,
  verses: [16, 17, 18],
  groups: [[16], [17], [18]],
  data: { geo: [], eng: [], rus: [] },
  ...overrides,
});

const live = (verseIndex: number): Live => ({ blockId: 'b1', verseIndex });

describe('planExtension', () => {
  it('prepends a verse and walks the live pointer along with it', () => {
    const plan = planExtension(block(), 'start', live(0));

    expect(plan?.verses).toEqual([15, 16, 17, 18]);
    expect(plan?.groups).toEqual([[15], [16], [17], [18]]);
    expect(plan?.live).toEqual({ blockId: 'b1', verseIndex: 1 });
  });

  it('appends without moving the pointer', () => {
    const plan = planExtension(block(), 'end', live(2));

    expect(plan?.verses).toEqual([16, 17, 18, 19]);
    expect(plan?.live).toEqual({ blockId: 'b1', verseIndex: 2 });
  });

  it('refuses to run off either end of the chapter', () => {
    expect(planExtension(block({ verses: [1], groups: [[1]] }), 'start', null)).toBeNull();
    expect(planExtension(block({ verses: [36], groups: [[36]] }), 'end', null)).toBeNull();
  });

  it('leaves a lyrics pointer alone', () => {
    const lyrics: Live = { kind: 'lyrics', songId: 's1', slideIndex: 2 };

    expect(planExtension(block(), 'start', lyrics)?.live).toBe(lyrics);
  });
});

describe('planTrim', () => {
  it('drops every card from the cut point on', () => {
    expect(planTrim(block(), 1)).toEqual({ verses: [16], groups: [[16]] });
  });

  it('reports an emptied block as a deletion', () => {
    expect(planTrim(block(), 0)).toBeNull();
  });

  it('ignores a card that is not there', () => {
    expect(planTrim(block(), 9)).toBeUndefined();
  });
});

describe('joinGroup', () => {
  it('merges a card with the one after it', () => {
    const next = joinGroup({ blocks: [block()], live: null }, 'b1', 0);

    expect(next.blocks[0].groups).toEqual([[16, 17], [18]]);
  });

  it('pulls a later live pointer back by one', () => {
    expect(joinGroup({ blocks: [block()], live: live(2) }, 'b1', 0).live).toEqual({ blockId: 'b1', verseIndex: 1 });
  });

  it('leaves a pointer at or before the join alone', () => {
    expect(joinGroup({ blocks: [block()], live: live(0) }, 'b1', 0).live).toEqual({ blockId: 'b1', verseIndex: 0 });
  });

  it('does nothing on the last card', () => {
    const next = joinGroup({ blocks: [block()], live: null }, 'b1', 2);

    expect(next.blocks[0].groups).toEqual([[16], [17], [18]]);
  });
});

describe('splitGroup', () => {
  it('breaks a joined card back into one card per verse', () => {
    const joined = block({ groups: [[16, 17], [18]] });
    const next = splitGroup({ blocks: [joined], live: null }, 'b1', 0);

    expect(next.blocks[0].groups).toEqual([[16], [17], [18]]);
  });

  it('leaves a single-verse card alone', () => {
    const next = splitGroup({ blocks: [block()], live: null }, 'b1', 0);

    expect(next.blocks[0].groups).toEqual([[16], [17], [18]]);
  });

  it('pushes a later live pointer along by the cards the split added', () => {
    const joined = block({ groups: [[16, 17], [18]] });

    expect(splitGroup({ blocks: [joined], live: live(1) }, 'b1', 0).live).toEqual({ blockId: 'b1', verseIndex: 2 });
  });

  it('leaves a pointer at the split alone', () => {
    const joined = block({ groups: [[16, 17], [18]] });

    expect(splitGroup({ blocks: [joined], live: live(0) }, 'b1', 0).live).toEqual({ blockId: 'b1', verseIndex: 0 });
  });
});

describe('moveBlockTo', () => {
  const three = [block({ id: 'a' }), block({ id: 'b' }), block({ id: 'c' })];
  const ids = (blocks: Block[]) => blocks.map(item => item.id);

  it('corrects for the gap the block leaves behind when moving down', () => {
    expect(ids(moveBlockTo({ blocks: three, live: null }, 'a', 2).blocks)).toEqual(['b', 'a', 'c']);
  });

  it('drops into the slot as given when moving up', () => {
    expect(ids(moveBlockTo({ blocks: three, live: null }, 'c', 0).blocks)).toEqual(['c', 'a', 'b']);
  });

  it('clamps past the end', () => {
    expect(ids(moveBlockTo({ blocks: three, live: null }, 'a', 9).blocks)).toEqual(['b', 'c', 'a']);
  });
});

describe('regroup', () => {
  it('drops verses a translation no longer has, and empties with them', () => {
    expect(regroup([[16, 17], [18]], [16, 18])).toEqual([[16], [18]]);
    expect(regroup([[17]], [16, 18])).toEqual([]);
  });

  it('defaults to one card per verse', () => {
    expect(regroup(undefined, [1, 2])).toEqual([[1], [2]]);
  });
});

describe('stepWithin', () => {
  it('stops at both ends rather than wrapping', () => {
    expect(stepWithin(block(), live(2), 1)).toBeNull();
    expect(stepWithin(block(), live(0), -1)).toBeNull();
    expect(stepWithin(block(), live(0), 1)).toBe(1);
  });
});
