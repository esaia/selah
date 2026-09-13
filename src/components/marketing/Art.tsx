import Image from 'next/image';

export const Art = ({ src, alt }: { src: string; alt: string }) => (
  <Image
    src={src}
    alt={alt}
    width={1000}
    height={700}
    sizes="(min-width: 1024px) 38rem, 100vw"
    className="h-auto w-full"
  />
);
