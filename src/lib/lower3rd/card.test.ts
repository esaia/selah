import { describe, expect, it } from 'vitest';

import {
  asCard,
  asCardRun,
  asDraft,
  cardFromRow,
  DEFAULT_HOLD_MS,
  DEFAULT_TEMPLATE,
  fireCard,
  isLiveCard,
  isShowing,
  isSaved,
  MAX_HOLD_MS,
  MIN_HOLD_MS,
  newCard,
  PINNED,
  progressOf,
  remainingOf,
  withSkew,
} from './card';

const card = newCard({ id: 'c1', title: 'Nathan Jager', subtitle: 'Students Pastor' });

describe('reading a card back', () => {
  it('refuses a card with no name', () => {
    expect(asCard({ title: '' })).toBeNull();
    expect(asCard({ title: '   ' })).toBeNull();
    expect(asCard(null)).toBeNull();
    expect(asCard('Nathan')).toBeNull();
  });

  it('trims what it keeps', () => {
    expect(asCard({ title: '  Nathan  ', subtitle: '  Pastor ' })).toMatchObject({
      title: 'Nathan',
      subtitle: 'Pastor',
    });
  });

  it('falls back to a design that exists', () => {
    expect(asCard({ title: 'Nathan', template: 'no-such-design' })?.template).toBe(DEFAULT_TEMPLATE);
    expect(asCard({ title: 'Nathan', template: 'bracket' })?.template).toBe('bracket');
  });
});

describe('reading a run back', () => {
  it('holds a hold inside its range', () => {
    expect(asCardRun({ card, holdMs: 500 })?.holdMs).toBe(MIN_HOLD_MS);
    expect(asCardRun({ card, holdMs: 999_999 })?.holdMs).toBe(MAX_HOLD_MS);
    expect(asCardRun({ card, holdMs: -1 })?.holdMs).toBe(DEFAULT_HOLD_MS);
  });

  it('leaves a pinned card pinned', () => {
    expect(asCardRun({ card, holdMs: PINNED })?.holdMs).toBe(PINNED);
  });

  it('is null when the card is', () => {
    expect(asCardRun({ card: { title: '' } })).toBeNull();
    expect(asCardRun(null)).toBeNull();
  });
});

describe('a saved person', () => {
  const row = { id: 'c1', title: 'Nathan', subtitle: '', template: 'plate', position: 0 };

  it('is a name and a role, read back off a row', () => {
    expect(cardFromRow({ ...row, subtitle: 'Students Pastor' })).toMatchObject({
      id: 'c1',
      title: 'Nathan',
      subtitle: 'Students Pastor',
      position: 0,
    });
    expect(cardFromRow({ ...row, template: 'gone' }).template).toBe(DEFAULT_TEMPLATE);
    expect(cardFromRow({ ...row, subtitle: null, position: null }).subtitle).toBe('');
  });

  it('holds for whatever the console is set to', () => {
    expect(fireCard(cardFromRow(row)).holdMs).toBe(DEFAULT_HOLD_MS);
    expect(fireCard(cardFromRow(row), 20_000).holdMs).toBe(20_000);
  });
});

describe('the form, read back after a reload', () => {
  it('keeps the design and the hold that were chosen', () => {
    const draft = asDraft({ title: 'Nathan', subtitle: 'Pastor', template: 'rule', holdMs: 15_000 });

    expect(draft).toMatchObject({ title: 'Nathan', subtitle: 'Pastor', template: 'rule', holdMs: 15_000 });
  });

  it('allows an empty name', () => {
    expect(asDraft({ title: '', template: 'plate' })).toMatchObject({ title: '', template: 'plate' });
    expect(asDraft(null)).toMatchObject({ title: '', template: DEFAULT_TEMPLATE, holdMs: DEFAULT_HOLD_MS });
  });

  it('stays the person it was opened on', () => {
    expect(asDraft({ id: 'c1', title: 'Nathan' }).id).toBe('c1');
  });
});

describe('the hold', () => {
  const now = 1_000_000;

  it('counts down from when it fired', () => {
    const run = fireCard(card, 8000, now);

    expect(remainingOf(run, now)).toBe(8000);
    expect(remainingOf(run, now + 3000)).toBe(3000 + 2000);
    expect(remainingOf(run, now + 8000)).toBe(0);
    expect(remainingOf(run, now + 99_999)).toBe(0);
  });

  it('shows a card for exactly its hold', () => {
    const run = fireCard(card, 8000, now);

    expect(isShowing(run, now)).toBe(true);
    expect(isShowing(run, now + 7999)).toBe(true);
    expect(isShowing(run, now + 8000)).toBe(false);
  });

  it('never takes a pinned card away', () => {
    const run = fireCard(card, PINNED, now);

    expect(remainingOf(run, now + 99_999_999)).toBe(Infinity);
    expect(isShowing(run, now + 99_999_999)).toBe(true);
  });

  it('shows nothing when nothing is up', () => {
    expect(isShowing(null)).toBe(false);
    expect(remainingOf(null)).toBe(0);
  });

  it('gives a late joiner the remainder', () => {
    const run = fireCard(card, 8000, now);

    expect(remainingOf(run, now + 5000)).toBe(3000);
  });
});

describe('the bar that drains', () => {
  const now = 1_000_000;

  it('empties over the hold', () => {
    const run = fireCard(card, 8000, now);

    expect(progressOf(run, now)).toBe(1);
    expect(progressOf(run, now + 4000)).toBe(0.5);
    expect(progressOf(run, now + 8000)).toBe(0);
    expect(progressOf(run, now + 99_999)).toBe(0);
  });

  it('stays full for a pinned card', () => {
    expect(progressOf(fireCard(card, PINNED, now), now + 99_999_999)).toBe(1);
  });

  it('is empty when nothing is up', () => {
    expect(progressOf(null)).toBe(0);
  });
});

describe('clock skew', () => {
  it('shifts the start by the difference between two clocks', () => {
    const run = { ...fireCard(card, 8000, 1000), sentAt: 1000 };

    expect(remainingOf(withSkew(run, 4000), 4000)).toBe(8000);
  });

  it('ignores a stale stamp', () => {
    const run = { ...fireCard(card, 8000, 1000), sentAt: 1000 };
    const late = withSkew(run, 1000 + 60_000);

    expect(late?.firedAt).toBe(1000);
    expect(isShowing(late, 1000 + 60_000)).toBe(false);
  });

  it('leaves an unsent run alone', () => {
    const run = fireCard(card, 8000, 1000);

    expect(withSkew(run, 5000)).toBe(run);
    expect(withSkew(null)).toBeNull();
  });
});

describe('which card is live', () => {
  const now = 1_000_000;

  it('is the one that fired, while it holds', () => {
    const run = fireCard(card, 8000, now);
    const other = newCard({ id: 'c2', title: 'Someone Else' });

    expect(isLiveCard(run, card, now)).toBe(true);
    expect(isLiveCard(run, other, now)).toBe(false);
    expect(isLiveCard(run, card, now + 9000)).toBe(false);
    expect(isLiveCard(null, card, now)).toBe(false);
  });
});

describe('ids', () => {
  it('tells a saved card from a new one', () => {
    expect(isSaved('3f8b2c1a-4d5e-6f70-8192-a3b4c5d6e7f8')).toBe(true);
    expect(isSaved(newCard().id)).toBe(false);
  });

  it('never repeats within a session', () => {
    expect(newCard().id).not.toBe(newCard().id);
  });
});
