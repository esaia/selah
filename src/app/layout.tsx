import type { Metadata } from 'next';

import './globals.css';

export const metadata: Metadata = {
  title: { default: 'Selah', template: '%s · Selah' },
  description: 'Put scripture on the screen — in Georgian, English and Russian, on any machine in the room.',
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  // Browser extensions stamp their own attributes onto <html> and <body> before
  // React hydrates (password managers, translators, the WebCRX bridge), which
  // React reports as a mismatch it will not patch up. Suppressing it here is
  // the documented remedy: it covers these two elements only, one level deep,
  // so a real mismatch anywhere inside the app is still reported.
  return (
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <body className="min-h-full" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
