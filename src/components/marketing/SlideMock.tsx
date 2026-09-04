import { Slide } from '@/components/projector/Slide';
import { DEFAULT_FONT } from '@/lib/projector/fonts';
import { DEFAULT_LYRIC_LOOK, DEFAULT_TEXT_SIZE, DEFAULT_VERSE_LOOK } from '@/lib/projector/looks';
import type { ProjectorStyle, ShowData } from '@/lib/types';

/**
 * John 14:6, on a slide that carries two languages.
 *
 * The marketing page draws its slides with the projector's own component and
 * its own stylesheet rather than a picture of one, for the reason the look
 * picker does: a screenshot goes stale the first time the look changes, and
 * nobody notices until a visitor compares the page to the product. `wigni` is
 * the API's book number for John, which is what puts the right book name under
 * each language without the page knowing any of them.
 */
const verse = (bv: string) => [{ bv, wigni: 43, tavi: 14, muxli: 6 }];

const SHOW_DATA: ShowData = {
  eng: verse('I am the way, and the truth, and the life. No one comes to the Father except through me.'),
  geo: verse('მე ვარ გზა, ჭეშმარიტება და სიცოცხლე. მამასთან ვერავინ მივა, თუ არა ჩემით.'),
};

const STYLE: ProjectorStyle = {
  theme: '31',
  dynamicImage: '',
  localImage: null,
  font: DEFAULT_FONT,
  align: 'left',
  lyricsFont: DEFAULT_FONT,
  lyricsAlign: 'left',
  look: DEFAULT_VERSE_LOOK,
  lyricsLook: DEFAULT_LYRIC_LOOK,
  lyricsScale: 'both',
  lyricsSize: DEFAULT_TEXT_SIZE,
  order: ['eng', 'geo'],
  enabled: { eng: true, geo: true },
  transitionMs: 320,
  fonts: [],
};

/**
 * A slide at whatever size the frame around it happens to be.
 *
 * The projector runs a `fitText` pass to fill a real screen; a page cannot
 * measure, so the type is set in `cqi` instead and the whole slide — text,
 * gaps, reference — scales with the frame, which is what `em` throughout
 * `.show-slide` was for.
 */
export const SlideMock = ({ background = '/images/fragrance-b.webp' }: { background?: string }) => (
  <div className="@container relative flex aspect-video items-center justify-center overflow-hidden bg-studio-slide">
    {/* Decorative: the verse beside it is what a screen reader should hear. */}
    <div
      aria-hidden
      className="absolute inset-0 bg-cover bg-center"
      style={{ backgroundImage: `url(${background})` }}
    />
    <Slide showData={SHOW_DATA} style={STYLE} className="relative text-[3.7cqi]" />
  </div>
);
