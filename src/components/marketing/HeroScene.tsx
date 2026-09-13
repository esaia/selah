import { LowerThirdMock } from './LowerThirdMock';
import { PeekingLlama } from './PeekingLlama';
import { SlideMock } from './SlideMock';
import { StageMock } from './StageMock';

export const HeroScene = () => (
  <div className="@container mx-auto w-full max-w-[520px]">
    <div className="group relative aspect-4/5">
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

      <div className="absolute" style={{ left: '63%', top: '3%', width: '37%' }}>
        <div className="overflow-hidden rounded-studio ring-1 ring-site-ink/10">
          <LowerThirdMock />
        </div>
        <p className="mt-[1.6cqi] text-[2cqi] text-site-muted">Lower third</p>
      </div>

      <div className="absolute" style={{ left: '63%', top: '25%', width: '37%' }}>
        <div className="overflow-hidden rounded-studio ring-1 ring-site-ink/10">
          <StageMock />
        </div>
        <p className="mt-[1.6cqi] text-[2cqi] text-site-muted">Stage</p>
      </div>

      <PeekingLlama />

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
