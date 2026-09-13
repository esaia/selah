import Link from 'next/link';

import { Wordmark } from '@/components/brand/Wordmark';

export default function NotFound() {
  return (
    <div className="site flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <Link href="/" aria-label="LlamaPresenter — home" className="mb-10">
        <Wordmark on="light" className="text-[19px]" />
      </Link>

      <p className="font-valera text-7xl tracking-tight text-site-ink sm:text-8xl">404</p>
      <h1 className="mt-3 font-valera text-2xl tracking-tight text-site-ink sm:text-3xl">This page isn&apos;t on the screen</h1>
      <p className="mt-3 max-w-sm text-[17px] leading-relaxed text-site-muted">
        The link may be old, or the page may have moved.
      </p>

      <Link
        href="/"
        className="mt-8 rounded-studio bg-site-ink px-4 py-2 text-sm font-medium text-white transition-colors duration-150 hover:bg-site-ink/85"
      >
        Back home
      </Link>
    </div>
  );
}
