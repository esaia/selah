import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { FREE_LIMITS, LIMIT_KEYS, limitMessage, limitOf, planErrorMessage, remaining, roomFor, roomForList } from './limits';

const MIGRATIONS = 'supabase/migrations';

const liveFreeLimit = () => {
  const files = readdirSync(MIGRATIONS).filter(name => name.endsWith('.sql')).sort();
  const defining = files.filter(name => readFileSync(`${MIGRATIONS}/${name}`, 'utf8').includes('function public.free_limit'));
  const latest = readFileSync(`${MIGRATIONS}/${defining[defining.length - 1]}`, 'utf8');
  const body = latest.slice(latest.lastIndexOf('function public.free_limit'));

  return Object.fromEntries(
    [...body.matchAll(/when '(\w+)'\s+then (\d+)/g)].map(([, key, value]) => [key, Number(value)]),
  );
};

describe('the SQL function and the JSON agree', () => {
  const fromSql = liveFreeLimit();

  it('names exactly the keys the app knows', () => {
    expect(Object.keys(fromSql).sort()).toEqual([...LIMIT_KEYS].sort());
  });

  it('carries the same number for each', () => {
    expect(fromSql).toEqual(FREE_LIMITS);
  });
});

describe('limitOf', () => {
  it('gives free the published ceiling', () => {
    expect(limitOf('free', 'songs_per_playlist')).toBe(3);
  });

  it('gives pro no ceiling at all', () => {
    for (const key of LIMIT_KEYS) expect(limitOf('pro', key)).toBeNull();
  });
});

describe('roomFor', () => {
  it('lets a free playlist reach three songs but not four', () => {
    expect(roomFor('free', 'songs_per_playlist', 2)).toBe(true);
    expect(roomFor('free', 'songs_per_playlist', 3)).toBe(false);
  });

  it('counts the whole batch, not one at a time', () => {
    expect(roomFor('free', 'songs_per_playlist', 1, 2)).toBe(true);
    expect(roomFor('free', 'songs_per_playlist', 1, 3)).toBe(false);
  });

  it('holds even when a downgrade left someone over the line', () => {
    expect(roomFor('free', 'songs', 40)).toBe(false);
  });

  it('never stops pro', () => {
    expect(roomFor('pro', 'songs_per_playlist', 900)).toBe(true);
  });
});

describe('remaining', () => {
  it('counts down and stops at zero', () => {
    expect(remaining('free', 'name_cards', 1)).toBe(2);
    expect(remaining('free', 'name_cards', 9)).toBe(0);
  });

  it('is null when there is no ceiling', () => {
    expect(remaining('pro', 'name_cards', 9)).toBeNull();
  });
});

describe('limitMessage', () => {
  it('says where the line is, in the plural the number needs', () => {
    expect(limitMessage('songs_per_playlist')).toBe('Free covers 3 songs in a playlist. Pro makes it unlimited.');
  });

  it('uses the singular when the ceiling is one', () => {
    expect(limitMessage('playlists')).toBe('Free covers 1 playlist. Pro makes it unlimited.');
  });

  it('reads as an addition when free has none', () => {
    expect(limitMessage('custom_fonts')).toBe('Pro adds custom fonts. Free has none.');
  });
});

describe('planErrorMessage', () => {
  it('turns what a trigger raises into what the operator reads', () => {
    expect(planErrorMessage('plan_limit:songs_per_playlist')).toBe(
      'Free covers 3 songs in a playlist. Pro makes it unlimited.',
    );
  });

  it('finds the key inside the noise Postgres wraps it in', () => {
    expect(planErrorMessage('new row violates ... plan_limit:name_cards')).toContain('3 name cards');
  });

  it('leaves an ordinary error alone', () => {
    expect(planErrorMessage('duplicate key value violates unique constraint')).toBeNull();
    expect(planErrorMessage('plan_limit:something_else')).toBeNull();
  });
});

describe('roomForList', () => {
  it('refuses a list that grows past the ceiling', () => {
    expect(roomForList('free', 'songs_per_playlist', 4, 3)).toBe(false);
  });

  it('lets a list already over the line shrink back towards it', () => {
    expect(roomForList('free', 'songs_per_playlist', 9, 10)).toBe(true);
    expect(roomForList('free', 'songs_per_playlist', 4, 10)).toBe(true);
  });

  it('lets an over-the-line list be reordered, which keeps its length', () => {
    expect(roomForList('free', 'songs_per_playlist', 10, 10)).toBe(true);
  });

  it('still refuses an over-the-line list that grows further', () => {
    expect(roomForList('free', 'songs_per_playlist', 11, 10)).toBe(false);
  });

  it('never stops pro', () => {
    expect(roomForList('pro', 'songs_per_playlist', 900, 0)).toBe(true);
  });
});
