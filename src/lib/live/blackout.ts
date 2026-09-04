/**
 * Blacking a screen.
 *
 * The two pieces of hardware a service runs on — the projector the room is
 * looking at and the monitor the person on stage is looking at — each get a
 * key that takes it to black and brings it back. It is the oldest control a
 * presentation desk has, and it is not the same as clearing: the verse stays
 * live, the countdown keeps counting, the running order stays where it is, and
 * one press puts the screen back exactly as it was. An operator blacks the
 * room for a prayer or a video roll, and unblacks it when they are done.
 *
 * The stream is not here. It is not a screen anybody in the building is
 * looking at, and OBS has its own switcher — blacking it from the console
 * would be a control nobody could see the effect of.
 */

/** The screens that can be blacked, in the order the console offers them. */
export const SCREENS = ['audience', 'stage'] as const;

export type Screen = (typeof SCREENS)[number];

/** What each key is called on the desk. */
export const SCREEN_LABELS: Record<Screen, string> = {
  audience: 'Audience',
  stage: 'Stage',
};

export type Blackout = Record<Screen, boolean>;

export const NO_BLACKOUT: Blackout = { audience: false, stage: false };

/**
 * A blackout read back off the wire or out of the stored row.
 *
 * Checked rather than trusted, like every other thing an output reads: a
 * missing field is a row written before this existed, and the honest answer
 * for it is a screen that is not black.
 */
export const asBlackout = (raw: unknown): Blackout => {
  const value = (raw && typeof raw === 'object' ? raw : {}) as Partial<Record<Screen, unknown>>;

  return { audience: value.audience === true, stage: value.stage === true };
};

/** The state after the operator hits one of the keys. */
export const toggleScreen = (state: Blackout, screen: Screen): Blackout => ({
  ...state,
  [screen]: !state[screen],
});

/** Is anything black? What the console's own indicator answers. */
export const anyBlack = (state: Blackout): boolean => SCREENS.some(screen => state[screen]);
