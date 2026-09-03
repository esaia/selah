/**
 * What each plan includes.
 *
 * Nothing is enforced yet — `can()` in ./entitlements returns true for
 * everything while NEXT_PUBLIC_ENFORCE_GATES is off. The map exists now so the
 * pricing page and the console read the same source, and so switching a gate on
 * later is a one-line change rather than an audit.
 */
export type PlanId = 'free' | 'pro';

export type Feature =
  | 'multiple_sessions'
  | 'own_backgrounds'
  | 'three_languages'
  | 'lyrics_import'
  | 'audio_library'
  | 'lower_third'
  | 'custom_transitions';

export interface Plan {
  id: PlanId;
  name: string;
  price: string;
  cadence: string;
  blurb: string;
  features: Feature[];
  highlights: string[];
}

export const PLANS: Record<PlanId, Plan> = {
  free: {
    id: 'free',
    name: 'Free',
    price: '$0',
    cadence: 'forever',
    blurb: 'Everything a small congregation needs to put scripture on a screen.',
    features: ['three_languages', 'lower_third'],
    highlights: [
      'One live session',
      'Three languages side by side',
      '33 built-in backgrounds',
      'Projector output and OBS lower third',
    ],
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    price: '$9',
    cadence: 'per month',
    blurb: 'For teams running a full service — songs, music and their own look.',
    features: [
      'multiple_sessions',
      'own_backgrounds',
      'three_languages',
      'lyrics_import',
      'audio_library',
      'lower_third',
      'custom_transitions',
    ],
    highlights: [
      'Everything in Free',
      'ProPresenter song import and setlists',
      'Your own backgrounds and music',
      'Unlimited sessions and saved looks',
      'Custom transitions and typography',
    ],
  },
};

export const FEATURE_LABELS: Record<Feature, string> = {
  multiple_sessions: 'More than one session',
  own_backgrounds: 'Your own backgrounds',
  three_languages: 'Three languages at once',
  lyrics_import: 'Song import and setlists',
  audio_library: 'Music library',
  lower_third: 'OBS lower third',
  custom_transitions: 'Custom transitions',
};
