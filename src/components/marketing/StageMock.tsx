import { PHASE_BAR } from '@/lib/timer/model';

/**
 * The stage display, drawn small.
 *
 * The real one measures its own frame and fits the text; a page cannot, so the
 * type is set in `cqi` instead — but on an element *inside* the container, not
 * on the container itself. A query unit resolves against the nearest ancestor
 * container, so `cqi` written on the same element as `@container` silently
 * measures the box one level further out.
 *
 * Everything else is the screen it is of: black, text only, nothing moving.
 * Both slides are boxed so the pair reads as one column, and the colour keeps
 * them apart: the live one white, what is coming amber. Then
 * the rail on the right for everything that is not a slide — the wall clock,
 * then the run, in the same three parts the console's timer face has: whose
 * run it is, how long is left, and how much of it has gone. The green is the
 * timer's own `PHASE_BAR`, so a bar on this page cannot be a green the product
 * never uses.
 */
export const StageMock = () => (
  <div className="@container aspect-video bg-studio-slide">
    <div className="flex h-full gap-[2.5cqi] p-[3.5cqi] text-[4cqi] text-white">
      <div className="flex min-w-0 flex-1 flex-col justify-between gap-[0.8em]">
        <div className="rounded-[0.4em] border border-white/20 p-[0.7em]">
          <p className="mb-[0.4em] text-[0.7em] text-white/45">Now</p>
          <p className="text-[1.15em] leading-tight">I am the way, and the truth, and the life.</p>
        </div>

        <div className="rounded-[0.4em] border border-[#f0b429]/45 p-[0.7em]">
          <p className="mb-[0.4em] text-[0.7em] text-[#f0b429]">Next</p>
          <p className="line-clamp-2 text-[0.88em] leading-snug text-[#f0b429]/85">If you had known me, you would have known my Father also.</p>
        </div>
      </div>

      <div className="flex w-[30%] shrink-0 flex-col justify-between border-l border-white/12 pl-[2.5cqi]">
        <div>
          <div className="rounded-[0.4em] border border-white/20 px-[0.5em] py-[0.5em] text-center">
            <p className="text-[1.15em] leading-none tabular-nums">11:42</p>
          </div>
          <p className="mt-[0.4em] text-center text-[0.58em] tracking-[0.2em] text-white/45 uppercase">Clock</p>
        </div>

        <div>
          <p className="text-[0.62em] tracking-[0.2em] text-white/45 uppercase">Sermon</p>
          <p className="mt-[0.1em] text-[1.9em] leading-none tabular-nums">04:12</p>

          <div className="mt-[0.55em] h-[0.3em] overflow-hidden rounded-full bg-white/12">
            <div className="h-full w-[62%] rounded-full" style={{ backgroundColor: PHASE_BAR.normal }} />
          </div>
        </div>
      </div>
    </div>
  </div>
);
