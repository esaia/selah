import type { ReactNode } from 'react';

export const Marker = ({ children }: { children: ReactNode }) => (
  <span className="site-marker">{children}</span>
);
