import Image from 'next/image';

import { cn } from '@/lib/cn';

export const Frame = ({
  url,
  label,
  src,
  alt,
  children,
  className,
  paneClassName,
  sizes,
}: {
  url?: string;
  label?: string;
  src?: string;
  alt?: string;
  children?: React.ReactNode;
  className?: string;
  paneClassName?: string;
  sizes?: string;
}) => (
  <figure
    className={cn(
      'overflow-hidden rounded-studio-lg border border-studio-bar/15 bg-studio-bar p-1.5',
      className,
    )}
  >
    {url ? (
      <div className="flex items-center gap-2 px-2 py-1.5">
        <span className="size-1.5 rounded-full bg-studio-faint/50" />
        <span className="truncate font-mono text-[11px] leading-none text-studio-faint">{url}</span>
      </div>
    ) : null}

    <div className={cn('relative overflow-hidden rounded-studio bg-studio-slide', paneClassName)}>
      {src ? (
        <Image src={src} alt={alt ?? ''} fill className="object-cover" sizes={sizes ?? '(max-width: 1280px) 100vw, 1280px'} />
      ) : (
        (children ?? <Placeholder label={label} />)
      )}
    </div>
  </figure>
);

const Placeholder = ({ label }: { label?: string }) => (
  <div className="flex aspect-16/10 items-center justify-center border border-dashed border-studio-border/60 p-6">
    <span className="text-center text-xs text-studio-faint">{label ?? 'Screenshot'}</span>
  </div>
);
