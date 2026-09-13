export const DEFAULT_TRANSITION_MS = 320;
export const MIN_TRANSITION_MS = 0;
export const MAX_TRANSITION_MS = 2000;

export const clampTransition = (value: number): number =>
  Math.min(MAX_TRANSITION_MS, Math.max(MIN_TRANSITION_MS, Math.round((Number(value) || 0) / 10) * 10));
