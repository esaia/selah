import Image from 'next/image';

export const Monitor = ({
  src,
  alt,
  aspect = '2000/1066',
  className,
  sizes,
}: {
  src: string;
  alt: string;
  aspect?: string;
  className?: string;
  sizes?: string;
}) => (
  <figure className={className}>
    <div
      className="rounded-[1rem] bg-studio-bar p-[0.45rem] shadow-site-frame ring-1 ring-site-ink/[0.06]
        sm:rounded-[1.2rem] sm:p-[0.6rem]"
    >
      <div
        className="relative overflow-hidden rounded-[0.55rem] bg-studio-slide sm:rounded-[0.7rem]"
        style={{ aspectRatio: aspect }}
      >
        <Image src={src} alt={alt} fill className="object-cover" sizes={sizes ?? '(min-width: 1024px) 40rem, 100vw'} />
      </div>
    </div>

    <div aria-hidden className="mx-auto h-3 w-[8%] bg-studio-bar/70 sm:h-4" />
    <div aria-hidden className="mx-auto h-1.5 w-[24%] rounded-full bg-studio-bar/90 sm:h-[7px]" />
  </figure>
);
