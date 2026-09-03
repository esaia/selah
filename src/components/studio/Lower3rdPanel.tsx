'use client';

import { useEffect, useState } from 'react';
import { HiOutlinePlay, HiOutlineTrash } from 'react-icons/hi';

import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { IconButton } from '@/components/ui/IconButton';
import { cn } from '@/lib/cn';
import {
  HOLD_STEP_MS,
  isLiveCard,
  isSaved,
  MAX_HOLD_MS,
  MIN_HOLD_MS,
  newCard,
  PINNED,
  remainingOf,
  templateLabel,
  type NameCard,
  type Template,
} from '@/lib/lower3rd/card';
import { useStudio } from '@/lib/studio/StudioProvider';

import { NameCardPicker } from './NameCardPicker';

/** What the designs are previewed with before the operator has typed anything. */
const PLACEHOLDER = { title: 'Pastor Name', subtitle: 'Lead Pastor' };

/**
 * The Lower3rd tab: who is speaking.
 *
 * A card goes to the stream overlay alone — the projector keeps its verse and
 * the stage keeps its clock — so this is the one tab whose output nobody in
 * the room can see. The preview in the right rail is the only way to watch it,
 * which is why firing one is a single obvious button rather than a click on a
 * card in a grid: there is no second screen to check it against.
 */
export const Lower3rdPanel = () => {
  const { cards, cardRun, cardHoldMs, setCardHoldMs, showCard, clearCard, saveCard, removeCard } = useStudio();

  const [draft, setDraft] = useState<NameCard>(() => newCard());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<NameCard | null>(null);

  // Seconds left on the card that is up, so the operator can see it going.
  //
  // Held in state and read from a clock in an effect rather than during
  // render: rendering has to give the same answer twice, and `Date.now()` by
  // definition does not. This ticks in the console alone — the overlays work
  // the hold out from `firedAt` on their own clocks, and nothing counts down
  // over the wire.
  const [now, setNow] = useState(0);

  useEffect(() => {
    if (!cardRun || cardRun.holdMs === PINNED) return;

    const beat = setInterval(() => setNow(Date.now()), 250);

    return () => clearInterval(beat);
  }, [cardRun]);

  // Before the first tick `now` is 0, so the card reads as freshly fired —
  // which it is. Reading the clock here instead would make the same render
  // give two different answers.
  const left = cardRun ? remainingOf(cardRun, Math.max(now, cardRun.firedAt)) : 0;

  const ready = draft.title.trim().length > 0;
  const live = cardRun?.card ?? null;

  const fire = (card: NameCard) => {
    // Firing the card that is already up takes it down, the same toggle a
    // live lyric slide has.
    if (isLiveCard(cardRun, card)) {
      clearCard();
      return;
    }

    showCard(card);
  };

  const save = async () => {
    if (!ready) return;

    setSaving(true);
    setError(null);

    try {
      await saveCard({ ...draft, title: draft.title.trim(), subtitle: draft.subtitle.trim() });

      // A person loaded from the list stays loaded after being saved — the
      // edit was to them, and clearing the form would read as having lost it.
      if (!isSaved(draft.id)) setDraft(newCard({ template: draft.template }));
    } catch (problem) {
      setError((problem as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (card: NameCard) => {
    setConfirming(null);

    try {
      await removeCard(card.id);
    } catch (problem) {
      setError((problem as Error).message);
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 px-4 py-3 lg:flex-row">
      {/* ------------------------------------------------ saved people */}
      <div className="flex min-h-0 shrink-0 flex-col lg:w-52 xl:w-60">
        <h2 className="px-1 text-[11px] font-semibold tracking-wider text-studio-faint uppercase">
          People · {cards.length}
        </h2>

        <div className="studio-scroll mt-2 min-h-0 flex-1 space-y-1 overflow-y-auto">
          {cards.length === 0 ? (
            <p className="px-1 py-2 text-xs leading-relaxed text-studio-muted">
              Nobody saved yet. Fill in a name on the right and save it — your regular preachers and worship leaders
              are one click each on a Sunday.
            </p>
          ) : (
            cards.map(card => {
              const isLive = isLiveCard(cardRun, card);

              return (
                <div
                  key={card.id}
                  className={cn(
                    'group flex items-center gap-1 rounded-studio border px-2 py-1.5 transition-colors duration-150',
                    isLive ? 'border-studio-live bg-studio-live/5' : 'border-transparent hover:bg-studio-surface',
                  )}
                >
                  {/* Clicking a person loads them — name, role and the design
                      they were saved with, so the picker moves to it. Nothing
                      reaches the stream until the operator says so: this list
                      is also how you edit someone, and a click that went live
                      would make correcting a typo a broadcast. */}
                  <button
                    type="button"
                    onClick={() => setDraft({ ...card })}
                    title={`Load ${card.title}`}
                    aria-pressed={draft.id === card.id}
                    className="min-w-0 flex-1 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-studio-accent/40"
                  >
                    <span className="block truncate text-sm font-medium text-studio-text">{card.title}</span>
                    <span className="block truncate text-[11px] text-studio-faint">
                      {card.subtitle || templateLabel(card.template)}
                    </span>
                  </button>

                  {/* Straight to the stream, for the Sunday where the person is
                      already right and the only thing wanted is the strap. */}
                  <IconButton
                    label={isLive ? `Take ${card.title} off the stream` : `Put ${card.title} on the stream`}
                    onClick={() => fire(card)}
                    className={cn(
                      'transition-opacity',
                      isLive
                        ? 'text-studio-live'
                        : 'opacity-0 group-hover:opacity-100 focus-visible:opacity-100',
                    )}
                  >
                    <HiOutlinePlay className="size-4" />
                  </IconButton>

                  <IconButton
                    label={`Delete ${card.title}`}
                    onClick={() => setConfirming(card)}
                    className="opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
                  >
                    <HiOutlineTrash className="size-4" />
                  </IconButton>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ------------------------------------------------ the card itself */}
      <div className="studio-scroll min-h-0 min-w-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-[1100px] space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="block text-xs font-semibold text-studio-text">Name</span>
              <input
                value={draft.title}
                onChange={event => setDraft(current => ({ ...current, title: event.target.value }))}
                placeholder={PLACEHOLDER.title}
                className="mt-1 h-9 w-full rounded-studio border border-studio-border px-3 text-sm text-studio-text
                  placeholder:text-studio-faint focus:outline-none focus-visible:ring-2 focus-visible:ring-studio-accent/40"
              />
            </label>

            <label className="block">
              <span className="block text-xs font-semibold text-studio-text">Role</span>
              <input
                value={draft.subtitle}
                onChange={event => setDraft(current => ({ ...current, subtitle: event.target.value }))}
                placeholder={PLACEHOLDER.subtitle}
                className="mt-1 h-9 w-full rounded-studio border border-studio-border px-3 text-sm text-studio-text
                  placeholder:text-studio-faint focus:outline-none focus-visible:ring-2 focus-visible:ring-studio-accent/40"
              />
            </label>
          </div>

          <div>
            <span className="block text-xs font-semibold text-studio-text">Design</span>
            <p className="mt-0.5 mb-2 text-[11px] leading-snug text-studio-faint">
              Shown with your own words in it. The stream is the only place these appear — the projector and the stage
              keep whatever is on them.
            </p>

            <NameCardPicker
              value={draft.template}
              onChange={(template: Template) => setDraft(current => ({ ...current, template }))}
              title={draft.title.trim() || PLACEHOLDER.title}
              subtitle={draft.subtitle.trim() || PLACEHOLDER.subtitle}
            />
          </div>

          <div className="flex flex-wrap items-end gap-3 border-t border-studio-divider pt-4">
            <label className="block">
              <span className="block text-xs font-semibold text-studio-text">
                Hold for {cardHoldMs === PINNED ? 'as long as I leave it' : `${cardHoldMs / 1000}s`}
              </span>
              <input
                type="range"
                min={MIN_HOLD_MS}
                max={MAX_HOLD_MS + HOLD_STEP_MS}
                step={HOLD_STEP_MS}
                value={cardHoldMs === PINNED ? MAX_HOLD_MS + HOLD_STEP_MS : cardHoldMs}
                aria-label="How long a card stays on the stream"
                // One past the end is "stay up", so pinning a card is the same
                // gesture as making it last longer rather than a separate switch.
                onChange={event =>
                  setCardHoldMs(Number(event.target.value) > MAX_HOLD_MS ? PINNED : Number(event.target.value))
                }
                className="studio-range mt-2 h-1.5 w-56 cursor-pointer appearance-none rounded-full bg-studio-border"
              />
            </label>

            <div className="flex flex-1 flex-wrap items-center justify-end gap-2">
              <Button variant="secondary" onClick={save} disabled={!ready || saving}>
                {saving ? 'Saving…' : 'Save person'}
              </Button>

              <Button
                onClick={() => fire({ ...draft, title: draft.title.trim(), subtitle: draft.subtitle.trim() })}
                disabled={!ready}
              >
                Show on stream
              </Button>
            </div>
          </div>

          {/* What is up and how long it has left. The only readout there is:
              nobody in the room sees this output, so the console has to say. */}
          {live ? (
            <div className="flex items-center gap-2 rounded-studio border border-studio-live bg-studio-live/5 px-3 py-2">
              <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-studio-live" />

              <span className="min-w-0 flex-1 truncate text-sm text-studio-text">
                <strong className="font-medium">{live.title}</strong>
                {live.subtitle ? ` · ${live.subtitle}` : ''}
              </span>

              <span className="shrink-0 text-[11px] tabular-nums text-studio-muted">
                {cardRun?.holdMs === PINNED ? 'until you clear it' : `${Math.ceil(left / 1000)}s`}
              </span>

              <Button variant="secondary" onClick={clearCard}>
                Clear
              </Button>
            </div>
          ) : null}

          {error ? <p className="text-xs text-studio-stop">{error}</p> : null}
        </div>
      </div>

      <ConfirmDialog
        open={Boolean(confirming)}
        title={`Delete ${confirming?.title ?? ''}?`}
        message="This only removes them from your list. Nothing on the stream changes unless they are on it now."
        confirmLabel="Delete"
        variant="danger"
        onConfirm={() => confirming && remove(confirming)}
        onCancel={() => setConfirming(null)}
      />
    </div>
  );
};
