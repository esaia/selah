'use client';

import { useMemo } from 'react';

import { registerLangs, type CustomLangSpec, type LangSpec } from '@/lib/types';

export const useCustomLangs = (langs: CustomLangSpec[] | undefined) => {
  useMemo(() => {
    const specs: Record<string, LangSpec> = {};

    for (const lang of langs ?? []) {
      specs[lang.code] = {
        label: lang.label,
        order: 'eng',
        psalms: 'masoretic',
        nameOffset: 0,
        versions: [],
        names: lang.names,
      };
    }

    registerLangs(specs);
  }, [langs]);
};
