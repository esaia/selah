
export const SCREENS = ['audience', 'stage'] as const;

export type Screen = (typeof SCREENS)[number];

export const SCREEN_LABELS: Record<Screen, string> = {
  audience: 'Audience',
  stage: 'Stage',
};

export type Blackout = Record<Screen, boolean>;

export const NO_BLACKOUT: Blackout = { audience: false, stage: false };

export const asBlackout = (raw: unknown): Blackout => {
  const value = (raw && typeof raw === 'object' ? raw : {}) as Partial<Record<Screen, unknown>>;

  return { audience: value.audience === true, stage: value.stage === true };
};

export const toggleScreen = (state: Blackout, screen: Screen): Blackout => ({
  ...state,
  [screen]: !state[screen],
});

export const anyBlack = (state: Blackout): boolean => SCREENS.some(screen => state[screen]);
