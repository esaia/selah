import { describe, expect, it } from 'vitest';

import { amend, canRedo, canUndo, commit, HISTORY_LIMIT, redo, start, undo } from './history';

const steps = (...values: string[]) => values.reduce((history, value) => commit(history, value), start('a'));

describe('start', () => {
  it('has nothing to undo or redo', () => {
    const history = start('a');

    expect(canUndo(history)).toBe(false);
    expect(canRedo(history)).toBe(false);
    expect(history.present).toBe('a');
  });
});

describe('commit', () => {
  it('stacks the old present behind the new one', () => {
    const history = steps('b', 'c');

    expect(history.present).toBe('c');
    expect(history.past).toEqual(['a', 'b']);
  });

  it('ignores a change to the value already on screen', () => {
    const history = steps('b');

    expect(commit(history, 'b')).toBe(history);
  });

  it('forgets the oldest steps rather than growing without limit', () => {
    let history = start(0);

    for (let step = 1; step <= HISTORY_LIMIT + 20; step += 1) history = commit(history, step);

    expect(history.past).toHaveLength(HISTORY_LIMIT);
    expect(history.past[0]).toBe(20);
    expect(history.present).toBe(HISTORY_LIMIT + 20);
  });
});

describe('undo and redo', () => {
  it('walks back and forward through the steps', () => {
    const history = steps('b', 'c');
    const back = undo(undo(history));

    expect(back.present).toBe('a');
    expect(canUndo(back)).toBe(false);
    expect(redo(back).present).toBe('b');
    expect(redo(redo(back)).present).toBe('c');
  });

  it('does nothing at either end', () => {
    const history = steps('b');

    expect(undo(undo(undo(history))).present).toBe('a');
    expect(redo(history)).toBe(history);
  });

  it('drops what was undone once a different turning is taken', () => {
    const history = commit(undo(steps('b', 'c')), 'd');

    expect(history.present).toBe('d');
    expect(canRedo(history)).toBe(false);
    expect(undo(history).present).toBe('b');
  });
});

describe('amend', () => {
  it('moves the present without stacking a step, so a drag is one undo', () => {
    const dragging = amend(amend(commit(start('a'), 'b1'), 'b2'), 'b3');

    expect(dragging.present).toBe('b3');
    expect(dragging.past).toEqual(['a']);
    expect(undo(dragging).present).toBe('a');
  });

  it('drops the redo stack too — it is still a change', () => {
    expect(canRedo(amend(undo(steps('b', 'c')), 'b2'))).toBe(false);
  });
});
