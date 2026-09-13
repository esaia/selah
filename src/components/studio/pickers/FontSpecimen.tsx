'use client';

import { cn } from '@/lib/cn';
import { fontStyleOf, type CustomFont } from '@/lib/projector/fonts';
import type { Lang } from '@/lib/types';

export const SAMPLE: Partial<Record<Lang, string>> = {
  geo: 'რადგან ისე შეიყვარა ღმერთმა ქვეყნიერება',
  eng: 'For God so loved the world',
  ru: 'Ибо так возлюбил Бог мир',
  gr: 'Οὕτως γὰρ ἠγάπησεν ὁ Θεὸς',
  ae: 'لِأَنَّهُ هَكَذَا أَحَبَّ ٱللهُ',
  la: 'Sic enim dilexit Deus mundum',
};

export const FALLBACK_SAMPLE = 'For God so loved the world';

export const FontSpecimen = ({
  value,
  fonts,
  langs,
  size = 'base',
}: {
  value: string;
  fonts: CustomFont[];
  langs: Lang[];
  size?: 'base' | 'sm';
}) => {
  const type = fontStyleOf(value, fonts);

  return (
    <div
      className={cn('min-w-0 space-y-0.5', type.className)}
      style={type.style ? { fontFamily: type.style } : undefined}
    >
      {(langs.length ? langs : (['eng'] as Lang[])).map(lang => (
        <p
          key={lang}
          className={cn('truncate leading-snug text-studio-text', size === 'sm' ? 'text-sm' : 'text-base')}
        >
          {SAMPLE[lang] ?? FALLBACK_SAMPLE}
        </p>
      ))}
    </div>
  );
};
