/**
 * How long the projector takes to swap one slide for the next, in milliseconds.
 *
 * The number is the whole crossfade: the outgoing text fades out over half of
 * it, the incoming text fades in over the other half. `0` disables the
 * transition entirely and the slide cuts, like turning it off in ProPresenter.
 */
export const DEFAULT_TRANSITION_MS = 320;
export const MIN_TRANSITION_MS = 0;
export const MAX_TRANSITION_MS = 2000;

export const clampTransition = (value: number): number =>
  Math.min(MAX_TRANSITION_MS, Math.max(MIN_TRANSITION_MS, Math.round((Number(value) || 0) / 10) * 10));
