import { describe, expect, it } from 'vitest';

import {
  asCard,
  asCardRun,
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
  remainingOf,
  withSkew,
} from './card';

const card = newCard({ id: 'c1', title: 'Nathan Jager', subtitle: 'Students Pastor' });

describe('reading a card back', () => {
  it('refuses a card with no name', () => {
    // Half a filled-in form must not reach a livestream as an empty strap.
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
    // These rows outlive the code that wrote them: a template renamed in a
    // later version must not render as unstyled text over live video.
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
    // Zero is not "too short", it is "stay until I take you down".
    expect(asCardRun({ card, holdMs: PINNED })?.holdMs).toBe(PINNED);
  });

  it('is null when the card is', () => {
    expect(asCardRun({ card: { title: '' } })).toBeNull();
    expect(asCardRun(null)).toBeNull();
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

  // The point of carrying `firedAt` rather than a countdown: an overlay that
  // joins halfway through a card gets the rest of it, not the whole thing.
  it('gives a late joiner the remainder', () => {
    const run = fireCard(card, 8000, now);

    expect(remainingOf(run, now + 5000)).toBe(3000);
  });
});

describe('clock skew', () => {
  it('shifts the start by the difference between two clocks', () => {
    const run = { ...fireCard(card, 8000, 1000), sentAt: 1000 };

    // A reader whose clock reads 3s ahead should still see 8s of card.
    expect(remainingOf(withSkew(run, 4000), 4000)).toBe(8000);
  });

  it('ignores a stale stamp', () => {
    // A stored row read hours later is not a skewed clock, and correcting by
    // it would put a card that finished long ago back on the stream.
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
