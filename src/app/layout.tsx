import type { Metadata } from 'next';

import './globals.css';

export const metadata: Metadata = {
  title: { default: 'Selah', template: '%s · Selah' },
  description: 'Put scripture on the screen — in Georgian, English and Russian, on any machine in the room.',
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
