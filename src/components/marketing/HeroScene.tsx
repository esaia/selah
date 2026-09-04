import { LowerThirdMock } from './LowerThirdMock';
import { PeekingLlama } from './PeekingLlama';
import { SlideMock } from './SlideMock';
import { StageMock } from './StageMock';

/**
 * The hero picture: one console, and the screens hanging off it.
 *
 * A screenshot answers "what does it look like", which is the second question.
 * The first is "what is plugged into what", and no screenshot has ever answered
 * that — so the console is drawn as a card and the runs out to the outputs are
 * dashed. The three screens themselves are not drawn: each one is the real
 * output component, shrunk, so the picture cannot claim anything the product
 * does not do. The wall is largest because it is the thing being sold.
 *
 * The box is a fixed 4:5, which lets the SVG share one coordinate system with
 * the elements laid over it: an `x` of 224 in the drawing is `56%` in the
 * markup. Type and radii are in `cqi`, so the whole composition scales as one
 * piece rather than reflowing as the column narrows.
 */
export const HeroScene = () => (
  <div className="@container mx-auto w-full max-w-[520px]">
    <div className="group relative aspect-4/5">
      {/* The runs. Drawn first so every screen sits on top of its own cable. */}
      <svg
        viewBox="0 0 400 500"
        fill="none"
        aria-hidden
        className="absolute inset-0 size-full text-site-ink/25"
      >
        <g stroke="currentColor" strokeWidth="2" strokeDasharray="3 7" strokeLinecap="round">
          <path d="M228 64 C 238 64, 240 58, 248 57" />
          <path d="M228 106 C 240 106, 238 160, 248 166" />
          <path d="M100 136 C 100 180, 86 192, 86 232" />
        </g>
      </svg>

      {/* The console: the operator's list, one row of which is on the wall. */}
      <div
        className="absolute rounded-studio-lg bg-studio-bar p-[2.2cqi] shadow-site-frame ring-1 ring-site-ink/10"
        style={{ left: 0, top: '5%', width: '56%' }}
      >
        <div className="flex items-center gap-[2cqi] px-[1.6cqi] pb-[2cqi]">
          <span className="size-[1.4cqi] rounded-full bg-studio-on" />
          <span className="truncate font-mono text-[2.2cqi] text-studio-faint">John 14:6-7</span>
        </div>

        <div className="space-y-[1.4cqi]">
          <div className="flex items-center gap-[2cqi] rounded-studio border-l-[1.2cqi] border-studio-accent bg-studio-surface px-[2.4cqi] py-[2.2cqi]">
            <span className="font-mono text-[2.6cqi] text-white/60">14:6</span>
            <span className="min-w-0 flex-1 truncate text-[2.8cqi] text-white">I am the way, and…</span>
            <span className="rounded-xs bg-studio-live px-[1.4cqi] py-[0.5cqi] text-[1.9cqi] font-medium text-white">
              LIVE
            </span>
          </div>

          <div className="flex items-center gap-[2cqi] rounded-studio px-[2.4cqi] py-[2.2cqi] opacity-55">
            <span className="font-mono text-[2.6cqi] text-white/60">14:7</span>
            <span className="min-w-0 flex-1 truncate text-[2.8cqi] text-white">If you had known me…</span>
          </div>
        </div>
      </div>

      {/* The lower third: the same verse, strapped under the shot. */}
      <div className="absolute" style={{ left: '63%', top: '3%', width: '37%' }}>
        <div className="overflow-hidden rounded-studio ring-1 ring-site-ink/10">
          <LowerThirdMock />
        </div>
        <p className="mt-[1.6cqi] text-[2cqi] text-site-muted">Lower third</p>
      </div>

      {/* The stage display. */}
      <div className="absolute" style={{ left: '63%', top: '25%', width: '37%' }}>
        <div className="overflow-hidden rounded-studio ring-1 ring-site-ink/10">
          <StageMock />
        </div>
        <p className="mt-[1.6cqi] text-[2cqi] text-site-muted">Stage</p>
      </div>

      {/* Behind the wall, ducked down until you come near it. The one moment of
          play on the page, and it answers a movement rather than starting one
          on its own — it is also the only thing here that is not a screen, so
          it is the only thing that may misbehave. Ordered before the bezel so
          the bezel is what hides it, and the lift is deliberately short of the
          overlap: the drawing ends in a straight cut where the plate used to
          crop it, and that edge must stay behind the bezel at the top of the
          movement as well as at the bottom. */}
      <PeekingLlama />

      {/* The wall. A white bezel, because on paper that is what reads as a
          screen standing in a room rather than a picture printed on the page. */}
      <div
        className="absolute rounded-[2cqi] bg-white p-[1.6cqi] shadow-site-frame"
        style={{ left: '4%', top: '48%', width: '92%' }}
      >
        <div className="overflow-hidden rounded-[1.2cqi]">
          <SlideMock />
        </div>
      </div>
    </div>
  </div>
);
