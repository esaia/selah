import type { Metadata } from 'next';

import { previewModeScript } from '@/lib/studio/previewMode';
import { railWidthScript } from '@/lib/studio/railWidth';
import { sidebarWidthScript } from '@/lib/studio/sidebarCollapse';

import './globals.css';

const DESCRIPTION =
  'Put scripture on the screen — in any language, up to three at once, on any machine in the room.';

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ??
      (process.env.VERCEL_PROJECT_PRODUCTION_URL
        ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
        : 'https://llamapresenter.com'),
  ),
  title: { default: 'LlamaPresenter', template: '%s · LlamaPresenter' },
  description: DESCRIPTION,
  openGraph: {
    type: 'website',
    siteName: 'LlamaPresenter',
    title: 'LlamaPresenter',
    description: DESCRIPTION,
  },
  twitter: { card: 'summary_large_image', title: 'LlamaPresenter', description: DESCRIPTION },
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <body className="min-h-full" suppressHydrationWarning>
        <script dangerouslySetInnerHTML={{ __html: railWidthScript }} />

        <script dangerouslySetInnerHTML={{ __html: previewModeScript }} />

        <script dangerouslySetInnerHTML={{ __html: sidebarWidthScript }} />

        {children}
      </body>
    </html>
  );
}
