'use client';

import { useEffect, useState } from 'react';
import { Play, Square, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { IconButton } from '@/components/ui/IconButton';
import { cn } from '@/lib/cn';
import {
  HOLD_STEP_MS,
  isLiveCard,
  MAX_HOLD_MS,
  MIN_HOLD_MS,
  newCard,
  PINNED,
  progressOf,
  remainingOf,
  type CardDraft,
  type NameCard,
  type Template,
} from '@/lib/lower3rd/card';
import { useStudio } from '@/lib/studio/StudioProvider';

import { NameCardPicker } from './NameCardPicker';

/** What the designs are previewed with before the operator has typed anything. */
const PLACEHOLDER = { title: 'Pastor Name', subtitle: 'Lead Pastor' };

/** A hold, said the way the operator set it. */
/**
 * The Lower3rd tab: who is speaking.
 *
 * A card goes to the stream overlay alone — the projector keeps its verse and
 * the stage keeps its clock — so this is the one tab whose output nobody in
 * the room can see. The preview in the right rail is the only way to watch it,
 * which is why firing one is a single obvious button rather than a click on a
 * card in a grid: there is no second screen to check it against.
 *
 * And because nobody can see it, the console has to say what is up and how
 * long is left of it. That is the draining bar: a strap timed to eight seconds
 * gives the operator no other way to know whether to wait or to cut.
 */
export const Lower3rdPanel = () => {
  const { cards, cardRun, cardDraft: draft, setCardDraft, showCard, clearCard, saveCard, removeCard } = useStudio();

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
  const at = cardRun ? Math.max(now, cardRun.firedAt) : 0;
  const left = remainingOf(cardRun, at);
  const fill = progressOf(cardRun, at);

  const ready = draft.title.trim().length > 0;
  const live = cardRun?.card ?? null;

  const patch = (change: Partial<CardDraft>) => setCardDraft(current => ({ ...current, ...change }));

  /** A fresh form. The design and the hold stay: they are not the person's. */
  const blank = () => setCardDraft(current => ({ ...newCard(), template: current.template, holdMs: current.holdMs }));

  const trimmed = <T extends NameCard>(card: T): T => ({
    ...card,
    title: card.title.trim(),
    subtitle: card.subtitle.trim(),
  });

  const fire = (card: NameCard) => {
    // Firing the card that is already up takes it down, the same toggle a
    // live lyric slide has.
    if (isLiveCard(cardRun, card)) {
      clearCard();
      return;
    }

    // Whoever goes up wears the look the console is set to. A name in the list
    // is a name; the design and the hold are the operator's, picked once for
    // the stream and applied to everybody.
    showCard({ ...trimmed(card), template: draft.template }, draft.holdMs);
  };

  const save = async () => {
    if (!ready) return;

    setSaving(true);
    setError(null);

    try {
      await saveCard(trimmed(draft));

      // The form clears, because a saved name is now a row in the list and the
      // form's job is the next one. The look stays where it was set.
      blank();
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
      <div className="flex min-h-0 shrink-0 flex-col lg:w-56 xl:w-64">
        <h2 className="px-1 text-[11px] font-semibold tracking-wider text-studio-faint uppercase">
          People · {cards.length}
        </h2>

        <div className="studio-scroll mt-2 min-h-0 flex-1 space-y-1 overflow-y-auto px-1 py-0.5">
          {cards.length === 0 ? (
            <p className="py-2 text-xs leading-relaxed text-studio-muted">
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
                    'group relative flex items-center gap-1 overflow-hidden rounded-studio border px-2 py-1.5',
                    'transition-colors duration-150',
                    isLive ? 'border-studio-live bg-studio-live/5' : 'border-transparent hover:bg-studio-surface',
                  )}
                >
                  {/* The hold, draining. Nobody in the room can see this output,
                      so the list itself has to show the strap running out. */}
                  {isLive ? (
                    <span
                      aria-hidden
                      style={{ width: `${fill * 100}%` }}
                      className="pointer-events-none absolute inset-y-0 left-0 bg-studio-live/10 transition-[width] duration-300 ease-linear"
                    />
                  ) : null}

                  {/* The row is a label, not a control. A saved person used to
                      load into the form on click, which quietly overwrote
                      whatever the operator was part-way through typing. The
                      form belongs to the next person; the buttons beside the
                      name are what act on this one. */}
                  <div className="relative min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-studio-text">{card.title}</span>
                    <span className="block truncate text-[11px] text-studio-faint">{card.subtitle}</span>
                  </div>

                  {/* Only the live row counts: the hold is the console's, and
                      printing it against every name would say otherwise. */}
                  {isLive && cardRun?.holdMs !== PINNED ? (
                    <span className="relative shrink-0 text-[10px] tabular-nums text-studio-live">
                      {Math.ceil(left / 1000)}s
                    </span>
                  ) : null}

                  {/* Straight to the stream, for the Sunday where the person is
                      already right and the only thing wanted is the strap. */}
                  <IconButton
                    label={isLive ? `Take ${card.title} off the stream` : `Put ${card.title} on the stream`}
                    onClick={() => fire(card)}
                    className={cn(
                      'relative transition-opacity',
                      isLive ? 'text-studio-live' : 'opacity-0 group-hover:opacity-100 focus-visible:opacity-100',
                    )}
                  >
                    {isLive ? <Square className="size-4" /> : <Play className="size-4" />}
                  </IconButton>

                  <IconButton
                    label={`Delete ${card.title}`}
                    tone="danger"
                    onClick={() => setConfirming(card)}
                    className="relative opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
                  >
                    <Trash2 className="size-4" />
                  </IconButton>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ------------------------------------------------ the card itself */}
      <div className="studio-scroll min-h-0 min-w-0 flex-1 overflow-y-auto">
        {/* The padding is not decoration: this is a scroll container, and it
            clips whatever reaches its edge — the focus ring on the first
            field, and the slider's thumb, which hangs half outside its own
            track when it is pushed to one end. */}
        <div className="mx-auto w-full max-w-[1100px] space-y-4 px-3 py-1.5">
          {/* Said here as well as on the tab, because the tab's pill is a
              label and this is the actual promise: what an operator saves is
              safe, and it is the drawing that may still move. Nobody should
              find that out on a Sunday. */}
          <p
            className="flex items-start gap-2 rounded-studio border border-studio-border bg-studio-surface px-3 py-2
              text-[11px] leading-snug text-studio-muted"
          >
            <span
              className="mt-px shrink-0 rounded-[3px] bg-studio-accent/12 px-1 py-px text-[9px] font-semibold uppercase
                tracking-[0.08em] text-studio-accent"
            >
              Beta
            </span>

            <span>
              Name cards work and the people you save are kept. The designs and the way they move are still being
              finished, so a card may not look quite the same next month.
            </span>
          </p>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="block text-xs font-semibold text-studio-text">Name</span>
              <input
                value={draft.title}
                onChange={event => patch({ title: event.target.value })}
                placeholder={PLACEHOLDER.title}
                className="mt-1 h-9 w-full rounded-studio border border-studio-border px-3 text-sm text-studio-text
                  placeholder:text-studio-faint focus:outline-none focus-visible:ring-2 focus-visible:ring-studio-accent/40"
              />
            </label>

            <label className="block">
              <span className="block text-xs font-semibold text-studio-text">Role</span>
              <input
                value={draft.subtitle}
                onChange={event => patch({ subtitle: event.target.value })}
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
              onChange={(template: Template) => patch({ template })}
              title={draft.title.trim() || PLACEHOLDER.title}
              subtitle={draft.subtitle.trim() || PLACEHOLDER.subtitle}
            />
          </div>

          <div className="flex flex-wrap items-end gap-3 border-t border-studio-divider pt-4">
            <label className="block">
              <span className="block text-xs font-semibold text-studio-text">
                Hold for {draft.holdMs === PINNED ? 'as long as I leave it' : `${draft.holdMs / 1000}s`}
              </span>
              <input
                type="range"
                min={MIN_HOLD_MS}
                max={MAX_HOLD_MS + HOLD_STEP_MS}
                step={HOLD_STEP_MS}
                value={draft.holdMs === PINNED ? MAX_HOLD_MS + HOLD_STEP_MS : draft.holdMs}
                aria-label="How long this card stays on the stream"
                // One past the end is "stay up", so pinning a card is the same
                // gesture as making it last longer rather than a separate switch.
                onChange={event =>
                  patch({ holdMs: Number(event.target.value) > MAX_HOLD_MS ? PINNED : Number(event.target.value) })
                }
                className="studio-range mt-2 h-1.5 w-56 cursor-pointer appearance-none rounded-full bg-studio-border"
              />
              {/* Said plainly, because the picker above looks like it belongs
                  to the name in the form and does not. */}
              <span className="mt-1 block text-[11px] text-studio-faint">
                This design and hold go with everybody you put up.
              </span>
            </label>

            <div className="flex flex-1 flex-wrap items-center justify-end gap-2">
              <Button variant="secondary" onClick={save} disabled={!ready} loading={saving}>
                Save person
              </Button>

              <Button
                variant="accent"
                icon={<Play className="size-4" />}
                onClick={() => fire(draft)}
                disabled={!ready}
              >
                Show on stream
              </Button>
            </div>
          </div>

          {/* What is up and how long it has left. The only readout there is:
              nobody in the room sees this output, so the console has to say. */}
          {live ? (
            <div className="relative flex items-center gap-2 overflow-hidden rounded-studio border border-studio-live bg-studio-live/5 px-3 py-2">
              <span
                aria-hidden
                style={{ width: `${fill * 100}%` }}
                className="pointer-events-none absolute inset-y-0 left-0 bg-studio-live/10 transition-[width] duration-300 ease-linear"
              />

              <span aria-hidden className="relative size-1.5 shrink-0 rounded-full bg-studio-live" />

              <span className="relative min-w-0 flex-1 truncate text-sm text-studio-text">
                <strong className="font-medium">{live.title}</strong>
                {live.subtitle ? ` · ${live.subtitle}` : ''}
              </span>

              <span className="relative shrink-0 text-[11px] tabular-nums text-studio-muted">
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
