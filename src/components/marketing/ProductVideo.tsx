export const ProductVideo = ({
  src,
  poster,
  autoPlay = true,
  loop = true,
  controls = false,
}: {
  src: string;
  poster: string;
  autoPlay?: boolean;
  loop?: boolean;
  controls?: boolean;
}) => (
  <video
    className="absolute inset-0 size-full object-cover"
    src={src}
    poster={poster}
    autoPlay={autoPlay}
    muted={autoPlay}
    loop={loop}
    controls={controls}
    playsInline
    preload="metadata"
    aria-hidden={autoPlay && !controls}
  />
);
