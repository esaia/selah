'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';

export const QueryProvider = ({ children }: { children: ReactNode }) => {
  // Scripture is immutable, so a chapter fetched once is good for the service.
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { staleTime: Infinity, gcTime: Infinity, retry: 1, refetchOnWindowFocus: false } },
      }),
  );

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
};
