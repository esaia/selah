import { Frame } from './Frame';
import { ProductVideo } from './ProductVideo';

const DISPLAY = 'font-valera tracking-tight text-site-ink';

export type Demo = { title: string; teaser: string; src: string; poster: string; alt: string };

export const ConsoleDemo = ({
  video,
  band = true,
  padding = 'py-16 sm:py-20',
}: {
  video: Demo;
  band?: boolean;
  padding?: string;
}) => (
  <section className={band ? 'border-y border-site-rule bg-site-band' : undefined}>
    <div className={`mx-auto max-w-7xl px-6 ${padding}`}>
      <div className="mx-auto max-w-2xl text-center">
        <p className="text-sm font-medium tracking-wide text-site-faint uppercase">See it in the console</p>
        <h2 className={`${DISPLAY} mt-3 text-3xl leading-[1.1] sm:text-4xl`}>{video.title}</h2>
        <p className="mt-4 text-lg leading-relaxed text-site-muted">{video.teaser}</p>
      </div>

      <div className="mx-auto mt-10 max-w-5xl">
        <Frame url="llamapresenter.com/studio" paneClassName="aspect-video">
          <ProductVideo src={video.src} poster={video.poster} autoPlay={false} controls />
        </Frame>

        <p className="mt-4 text-center text-sm text-site-faint">{video.alt}</p>
      </div>
    </div>
  </section>
);
