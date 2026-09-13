import { MAX_LANGS } from '../bible/languages';
import { THEMES } from '../projector/themes';

import {
  FOUNDING_SPOTS,
  monthlyEquivalent,
  priceOf,
  savingOf,
  tierNow,
  type Cadence,
} from './founding';
import { FREE_LIMITS } from './limits';

export type PlanId = 'free' | 'pro';

export interface Plan {
  id: PlanId;
  name: string;
  price: string;
  cadence: string;
  saving?: string;
  permonth?: string;
  blurb: string;
  highlights: string[];
  cta: { label: string; href: string };
}

export const plansFor = (claimed: number, cadence: Cadence = 'monthly'): Record<PlanId, Plan> => {
  const tier = tierNow(claimed);
  const rate = priceOf(tier, cadence);

  return {
  free: {
    id: 'free',
    name: 'Free',
    price: '$0',
    cadence: 'forever',
    blurb: 'Everything you need to run your church service on screen.',
    highlights: [
      'The whole Bible, in every translation we hold',
      'Any language — add a Bible of your own',
      'Projector, stage, and lower third for your stream',
      `${FREE_LIMITS.languages} languages side by side`,
      `${THEMES.length} built-in backgrounds`,
      `${FREE_LIMITS.songs} songs, ${FREE_LIMITS.songs_per_playlist} to a playlist`,
      `${FREE_LIMITS.audio_tracks} tracks and ${FREE_LIMITS.audio_categories} music libraries`,
    ],
    cta: { label: 'Start free', href: '/login' },
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    price: rate.price,
    cadence: rate.cadence,
    saving: cadence === 'annual' ? savingOf(tier) : undefined,
    permonth: cadence === 'annual' ? monthlyEquivalent(tier) : undefined,
    blurb: 'For churches that need more songs, more languages, custom templates, and more control.',
    highlights: [
      'Everything in Free, without the limits',
      'Unlimited songs, playlists, and music libraries',
      `${MAX_LANGS} languages on a slide`,
      'Use your own music, fonts and Bible translations',
      'Create your own templates',
      'Run more than one session',
    ],
    cta: { label: 'Get Pro', href: cadence === 'annual' ? '/upgrade?billing=annual' : '/upgrade' },
  },
  };
};

export const PLANS: Record<PlanId, Plan> = plansFor(FOUNDING_SPOTS);

export const bothPlansFor = (claimed: number): Record<Cadence, Record<PlanId, Plan>> => ({
  monthly: plansFor(claimed, 'monthly'),
  annual: plansFor(claimed, 'annual'),
});
