import { describe, expect, it } from 'vitest';

import type { Frame } from '@/lib/projector/template';

import {
  alignTo,
  angleFrom,
  clampToFrame,
  EDGES,
  HANDLES,
  MIN_H,
  MIN_W,
  moveBy,
  normalizeAngle,
  resizeBy,
  snapAngle,
  snapTo,
  unrotate,
} from './canvas';

const box = (over: Partial<Frame> = {}): Frame => ({ x: 0.2, y: 0.2, w: 0.4, h: 0.3, ...over });

const round = (frame: Frame) =>
  Object.fromEntries(Object.entries(frame).map(([key, value]) => [key, Math.round(value * 1e6) / 1e6]));

describe('moveBy', () => {
  it('shifts the box and leaves its size alone', () => {
    expect(moveBy(box(), 0.1, -0.05)).toEqual({ x: 0.30000000000000004, y: 0.15000000000000002, w: 0.4, h: 0.3 });
  });
});

describe('resizeBy', () => {
  it('moves only the edges the grip names', () => {
    expect(round(resizeBy(box(), 'e', 0.1, 0.1))).toEqual({ x: 0.2, y: 0.2, w: 0.5, h: 0.3 });
    expect(round(resizeBy(box(), 's', 0.1, 0.1))).toEqual({ x: 0.2, y: 0.2, w: 0.4, h: 0.4 });
    expect(round(resizeBy(box(), 'w', 0.1, 0.1))).toEqual({ x: 0.3, y: 0.2, w: 0.3, h: 0.3 });
    expect(round(resizeBy(box(), 'n', 0.1, 0.1))).toEqual({ x: 0.2, y: 0.3, w: 0.4, h: 0.2 });
  });

  it('moves two edges from a corner', () => {
    expect(round(resizeBy(box(), 'se', 0.1, 0.1))).toEqual({ x: 0.2, y: 0.2, w: 0.5, h: 0.4 });
    expect(round(resizeBy(box(), 'nw', 0.1, 0.1))).toEqual({ x: 0.3, y: 0.3, w: 0.3, h: 0.2 });
  });

  it('leaves the opposite edge exactly where it was', () => {
    for (const handle of HANDLES) {
      const before = box();
      const after = resizeBy(before, handle, -0.9, -0.9);

      if (!handle.includes('w')) expect(after.x).toBeCloseTo(before.x);
      if (!handle.includes('n')) expect(after.y).toBeCloseTo(before.y);
      if (!handle.includes('e')) expect(after.x + after.w).toBeCloseTo(before.x + before.w);
      if (!handle.includes('s')) expect(after.y + after.h).toBeCloseTo(before.y + before.h);
    }
  });

  it('pins at the minimum rather than turning the box inside out', () => {
    for (const handle of HANDLES) {
      const after = resizeBy(box(), handle, -5, -5);

      expect(after.w).toBeGreaterThanOrEqual(MIN_W - 1e-9);
      expect(after.h).toBeGreaterThanOrEqual(MIN_H - 1e-9);
    }

    expect(round(resizeBy(box(), 'w', 5, 0))).toEqual({ x: 0.6 - MIN_W, y: 0.2, w: MIN_W, h: 0.3 });
  });
});

describe('clampToFrame', () => {
  it('lets a box hang off the edge', () => {
    expect(clampToFrame(box({ x: -0.1 })).x).toBe(-0.1);
  });

  it('will not let its centre leave the screen', () => {
    expect(clampToFrame(box({ x: -0.9 })).x).toBeCloseTo(-0.2);
    expect(clampToFrame(box({ x: 1.5 })).x).toBeCloseTo(0.8);
    expect(clampToFrame(box({ y: -0.9 })).y).toBeCloseTo(-0.15);
    expect(clampToFrame(box({ y: 1.5 })).y).toBeCloseTo(0.85);
  });

  it('keeps a full-bleed picture where it was put', () => {
    const bleed = { x: -0.05, y: -0.05, w: 1.1, h: 1.1 };

    expect(clampToFrame(bleed)).toEqual(bleed);
  });
});

describe('snapTo', () => {
  it('pulls a near miss onto the centre of the screen', () => {
    const near = { x: 0.297, y: 0.4, w: 0.4, h: 0.2 };
    const { frame, guides } = snapTo(near, []);

    expect(frame.x).toBeCloseTo(0.3);
    expect(guides).toContainEqual({ axis: 'x', at: 0.5 });
  });

  it('lines a box up with another one', () => {
    const other = { x: 0.1, y: 0.1, w: 0.2, h: 0.2 };
    const { frame } = snapTo({ x: 0.104, y: 0.5, w: 0.4, h: 0.1 }, [other]);

    expect(frame.x).toBeCloseTo(0.1);
  });

  it('leaves a drag that was not trying to line up alone', () => {
    const near = { x: 0.37, y: 0.41, w: 0.4, h: 0.2 };

    expect(snapTo(near, [])).toEqual({ frame: near, guides: [] });
  });

  it('never changes the size', () => {
    const { frame } = snapTo({ x: 0.297, y: 0.003, w: 0.4, h: 0.2 }, []);

    expect(frame.w).toBe(0.4);
    expect(frame.h).toBe(0.2);
  });
});

describe('alignTo', () => {
  it('sends a box flush to each edge of the slide', () => {
    expect(alignTo(box(), 'left').x).toBe(0);
    expect(alignTo(box(), 'right').x).toBeCloseTo(0.6);
    expect(alignTo(box(), 'top').y).toBe(0);
    expect(alignTo(box(), 'bottom').y).toBeCloseTo(0.7);
  });

  it('centres it on either axis', () => {
    expect(alignTo(box(), 'hcenter').x).toBeCloseTo(0.3);
    expect(alignTo(box(), 'vmiddle').y).toBeCloseTo(0.35);
  });

  it('moves the box without ever resizing it, and touches one axis only', () => {
    for (const edge of EDGES) {
      const after = alignTo(box(), edge);

      expect(after.w).toBe(0.4);
      expect(after.h).toBe(0.3);

      if (['left', 'hcenter', 'right'].includes(edge)) expect(after.y).toBe(box().y);
      else expect(after.x).toBe(box().x);
    }
  });

  it('leaves a box already there exactly where it is', () => {
    const centred = alignTo(alignTo(box(), 'hcenter'), 'vmiddle');

    expect(alignTo(alignTo(centred, 'hcenter'), 'vmiddle')).toEqual(centred);
  });

  it('keeps a full-bleed picture off both edges rather than pulling it in', () => {
    const bleed = { x: -0.05, y: -0.05, w: 1.1, h: 1.1 };

    expect(alignTo(bleed, 'hcenter').x).toBeCloseTo(-0.05);
  });
});

describe('normalizeAngle', () => {
  it('folds any turn into (-180, 180]', () => {
    expect(normalizeAngle(0)).toBe(0);
    expect(normalizeAngle(90)).toBe(90);
    expect(normalizeAngle(370)).toBe(10);
    expect(normalizeAngle(-370)).toBe(-10);
    expect(normalizeAngle(540)).toBe(180);
  });

  it('reads a half turn the positive way round, so a readout does not flicker', () => {
    expect(normalizeAngle(-180)).toBe(180);
    expect(normalizeAngle(180)).toBe(180);
  });
});

describe('snapAngle', () => {
  it('rounds to the nearest fifteen degrees', () => {
    expect(snapAngle(7)).toBe(0);
    expect(snapAngle(8)).toBe(15);
    expect(snapAngle(-38)).toBe(-45);
    expect(snapAngle(359)).toBe(0);
  });
});

describe('angleFrom', () => {
  it('reads zero straight up and turns clockwise', () => {
    expect(angleFrom(0, 0, 0, -10)).toBe(0);
    expect(angleFrom(0, 0, 10, 0)).toBe(90);
    expect(angleFrom(0, 0, 0, 10)).toBe(180);
    expect(angleFrom(0, 0, -10, 0)).toBe(-90);
  });
});

describe('unrotate', () => {
  it('leaves an unturned box alone', () => {
    expect(unrotate(3, 4, 0)).toEqual({ dx: 3, dy: 4 });
  });

  it('reads a drag along the box’s own axes once it is turned', () => {
    const { dx, dy } = unrotate(0, 10, 90);

    expect(dx).toBeCloseTo(10);
    expect(dy).toBeCloseTo(0);
  });

  it('undoes itself when turned back', () => {
    const once = unrotate(7, -3, 37);
    const back = unrotate(once.dx, once.dy, -37);

    expect(back.dx).toBeCloseTo(7);
    expect(back.dy).toBeCloseTo(-3);
  });
});
