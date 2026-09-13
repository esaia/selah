'use client';

import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

import type { Cadence } from '@/lib/billing/founding';

type CadenceState = readonly [Cadence, (cadence: Cadence) => void];

const CadenceContext = createContext<CadenceState>(['monthly', () => {}]);

export const useCadence = () => useContext(CadenceContext);

export const CadenceProvider = ({ children }: { children: ReactNode }) => {
  const [cadence, setCadence] = useState<Cadence>('monthly');
  const value = useMemo(() => [cadence, setCadence] as const, [cadence]);

  return <CadenceContext.Provider value={value}>{children}</CadenceContext.Provider>;
};
