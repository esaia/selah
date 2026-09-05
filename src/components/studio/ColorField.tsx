'use client';

import { useEffect, useRef, useState, useSyncExternalStore, type CSSProperties } from 'react';
import { MdClose, MdColorize } from 'react-icons/md';

import { cn } from '@/lib/cn';
import { alphaOf, asHex, hexToHsv, hsvToHex, isLight, withAlpha, type Hsv } from '@/lib/studio/color';

/** As tall as the popover gets, which is what decides whether it fits below. */
const PANEL_H = 296;

/** The rainbow the hue rail is painted in, and the corners of the square. */
const HUES = [0, 60, 120, 180, 240, 300, 360].map(hue => `hsl(${hue} 100% 50%)`).join(', ');

/**
 * The colours a church already owns, offered rather than hunted for.
 *
 * Ours, plus the two ends of the scale: black and white are what most of these
 * looks are actually painted in, and dragging the square into a corner to reach
 * one is a silly way to spend a Sunday morning.
 */
const PRESETS = ['#ffffff', '#000000', '#191818', '#fdf7e8', '#fcdf50'];

/**
 * The grey chequer that says "the video shows through here".
 *
 * Drawn rather than declared, because a swatch is the one place in the console
 * where a colour has to be shown as what it is instead of as what it looks like
 * on this background — a half-transparent black over the panel's own dark grey
 * is indistinguishable from a solid dark grey.
 */
const CHECKER =
  'linear-gradient(45deg, #6b6b6b 25%, transparent 25%, transparent 75%, #6b6b6b 75%),' +
  'linear-gradient(45deg, #6b6b6b 25%, transparent 25%, transparent 75%, #6b6b6b 75%)';

/** A colour shown as what it is: laid over the chequer rather than under it. */
const swatch = (hex: string): CSSProperties => ({
  backgroundImage: `linear-gradient(${hex}, ${hex}), ${CHECKER}`,
  backgroundSize: '100% 100%, 8px 8px, 8px 8px',
  backgroundPosition: '0 0, 0 0, 4px 4px',
  backgroundColor: '#f0f0f0',
});

/** Chrome's colour sampler, where the browser has one. */
interface Dropper {
  open: () => Promise<{ sRGBHex: string }>;
}

const dropper = (): Dropper | null => {
  const ctor = (window as unknown as { EyeDropper?: new () => Dropper }).EyeDropper;

  return ctor ? new ctor() : null;
};

/** Where in a box a pointer landed, as two fractions. */
const spot = (event: { clientX: number; clientY: number }, box: HTMLElement) => {
  const rect = box.getBoundingClientRect();

  return {
    x: Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width)),
    y: Math.min(1, Math.max(0, (event.clientY - rect.top) / rect.height)),
  };
};

/**
 * Press, drag, release — on the square and on the rail alike.
 *
 * The pointer is captured on the way down, so a drag that leaves the panel
 * still steers it: picking a colour is a gesture that overshoots, and one that
 * stops dead at the edge of a 200px box feels broken.
 */
const useDrag = (onMove: (at: { x: number; y: number }, box: HTMLElement) => void) => ({
  onPointerDown: (event: React.PointerEvent<HTMLDivElement>) => {
    const box = event.currentTarget;

    box.setPointerCapture(event.pointerId);
    box.focus();
    onMove(spot(event, box), box);
  },
  onPointerMove: (event: React.PointerEvent<HTMLDivElement>) => {
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;

    onMove(spot(event, event.currentTarget), event.currentTarget);
  },
});

/**
 * The picker itself: a saturation square, a hue rail, a hex, and the eyedropper
 * where the browser has one.
 *
 * Hue is held here rather than read back off the colour, because a colour
 * dragged into the black corner has no hue to read — a rail that jumped to red
 * every time the square bottomed out would be unusable.
 */
const Picker = ({ value, onPick }: { value: string; onPick: (hex: string) => void }) => {
  const [hsv, setHsv] = useState<Hsv>(() => hexToHsv(value));
  const [shown, setShown] = useState(value);
  const [typed, setTyped] = useState<string | null>(null);

  // Arrived from outside — a preset, the eyedropper, a hex typed in full — so
  // the square and the rail move to meet it, during the render that brought it
  // rather than in an effect a frame later. A colour with no hue of its own
  // keeps the one the rail is already on.
  if (shown !== value) {
    setShown(value);

    if (hsvToHex(hsv) !== value) {
      const next = hexToHsv(value);

      setHsv(next.s === 0 || next.v === 0 ? { ...next, h: hsv.h } : next);
    }
  }

  const alpha = alphaOf(value);

  const set = (next: Partial<Hsv>, a = alpha) => {
    const merged = { ...hsv, ...next };

    setHsv(merged);
    setTyped(null);
    onPick(withAlpha(hsvToHex(merged), a));
  };

  const square = useDrag(({ x, y }) => set({ s: x, v: 1 - y }));
  const rail = useDrag(({ x }) => set({ h: x * 360 }));
  const veil = useDrag(({ x }) => set({}, x));

  const pure = `hsl(${hsv.h} 100% 50%)`;
  const solid = hsvToHex(hsv);

  return (
    <div className="w-56 p-2">
      {/* White to the pure hue across, and down into black: the whole of one
          hue in one square, which is the arrangement every picker uses and
          therefore the one nobody has to learn. */}
      <div
        {...square}
        role="slider"
        tabIndex={0}
        aria-label="Saturation and brightness"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(hsv.s * 100)}
        aria-valuetext={`${Math.round(hsv.s * 100)}% saturation, ${Math.round(hsv.v * 100)}% brightness`}
        onKeyDown={event => {
          const step = event.shiftKey ? 0.1 : 0.02;
          const by = { ArrowLeft: { s: -step }, ArrowRight: { s: step }, ArrowUp: { v: step }, ArrowDown: { v: -step } }[
            event.key
          ];

          if (!by) return;

          event.preventDefault();
          set({
            s: Math.min(1, Math.max(0, hsv.s + (by.s ?? 0))),
            v: Math.min(1, Math.max(0, hsv.v + (by.v ?? 0))),
          });
        }}
        className="relative h-32 w-full cursor-crosshair touch-none rounded-[4px] border border-studio-border
          focus:outline-none focus-visible:ring-2 focus-visible:ring-studio-accent/40"
        style={{
          background: `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, ${pure})`,
        }}
      >
        <span
          aria-hidden
          className="pointer-events-none absolute size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2
            border-white shadow-[0_0_0_1px_rgba(0,0,0,0.5)]"
          style={{ left: `${hsv.s * 100}%`, top: `${(1 - hsv.v) * 100}%`, background: solid }}
        />
      </div>

      <div
        {...rail}
        role="slider"
        tabIndex={0}
        aria-label="Hue"
        aria-valuemin={0}
        aria-valuemax={360}
        aria-valuenow={Math.round(hsv.h)}
        onKeyDown={event => {
          const by = { ArrowLeft: -1, ArrowDown: -1, ArrowRight: 1, ArrowUp: 1 }[event.key];

          if (!by) return;

          event.preventDefault();
          set({ h: (hsv.h + by * (event.shiftKey ? 15 : 3) + 360) % 360 });
        }}
        className="relative mt-2 h-3 w-full cursor-pointer touch-none rounded-full border border-studio-border
          focus:outline-none focus-visible:ring-2 focus-visible:ring-studio-accent/40"
        style={{ background: `linear-gradient(to right, ${HUES})` }}
      >
        <span
          aria-hidden
          className="pointer-events-none absolute top-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full
            border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,0.5)]"
          style={{ left: `${(hsv.h / 360) * 100}%`, background: pure }}
        />
      </div>

      {/* How much of the stream shows through the colour. It rides in the hex
          itself as the last two digits, so a plate at two thirds is one value
          the outputs already know how to paint rather than a second knob. */}
      <div
        {...veil}
        role="slider"
        tabIndex={0}
        aria-label="Opacity"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(alpha * 100)}
        aria-valuetext={`${Math.round(alpha * 100)}% opaque`}
        onKeyDown={event => {
          const by = { ArrowLeft: -1, ArrowDown: -1, ArrowRight: 1, ArrowUp: 1 }[event.key];

          if (!by) return;

          event.preventDefault();
          set({}, Math.min(1, Math.max(0, alpha + by * (event.shiftKey ? 0.1 : 0.02))));
        }}
        className="relative mt-2 h-3 w-full cursor-pointer touch-none rounded-full border border-studio-border
          focus:outline-none focus-visible:ring-2 focus-visible:ring-studio-accent/40"
        style={{ backgroundImage: CHECKER, backgroundSize: '8px 8px', backgroundPosition: '0 0, 4px 4px' }}
      >
        <span
          aria-hidden
          className="absolute inset-0 rounded-full"
          style={{ background: `linear-gradient(to right, ${withAlpha(solid, 0)}, ${solid})` }}
        />

        <span
          aria-hidden
          className="pointer-events-none absolute top-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full
            border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,0.5)]"
          style={{ left: `${alpha * 100}%`, background: pure }}
        />
      </div>

      <div className="mt-2 flex items-center gap-1.5">
        {/* Typed, not just dragged: the brand colour an operator is matching
            arrives from a brand book as six characters, and retyping it is the
            fastest way in. Half a hex is not a colour, so the field keeps what
            was typed and only the ones that read as one are applied. */}
        <input
          value={typed ?? value}
          spellCheck={false}
          aria-label="Hex"
          onChange={event => {
            setTyped(event.target.value);

            const hex = asHex(event.target.value);

            if (hex) onPick(hex);
          }}
          onBlur={() => setTyped(null)}
          // Painted in the colour it holds, so the field is the swatch: the
          // square above is a gradient the chosen point sits somewhere in, and
          // a flat block of the actual colour is what the eye compares against
          // the tiles behind the panel.
          style={{ ...swatch(value), color: isLight(value) ? '#191818' : '#ffffff' }}
          className="h-7 min-w-0 flex-1 rounded-[4px] border border-studio-border px-2 font-mono text-[11px]
            uppercase focus:border-studio-faint focus:outline-none focus-visible:ring-2
            focus-visible:ring-studio-accent/40"
        />

        <Sampler onPick={onPick} />
      </div>

      <div className="mt-2 flex flex-wrap gap-1">
        {PRESETS.map(preset => (
          <button
            key={preset}
            type="button"
            title={preset}
            aria-label={preset}
            onClick={() => onPick(withAlpha(preset, alpha))}
            className={cn(
              'size-5 rounded-[4px] border transition-transform duration-150 hover:scale-110',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-studio-accent/40',
              value.startsWith(preset) ? 'border-studio-accent' : 'border-studio-border',
            )}
            style={{ background: preset }}
          />
        ))}
      </div>
    </div>
  );
};

/**
 * The eyedropper, and only where there is one.
 *
 * It is the one thing the native picker had that a panel of our own does not
 * get for free, and it is the fastest way to match the colour of a logo already
 * on screen. Firefox has no such API, so the button is simply not there.
 */
const Sampler = ({ onPick }: { onPick: (hex: string) => void }) => {
  // Asked of the browser rather than tracked: nothing about it changes while
  // the console is open, and the server has no window to ask.
  const has = useSyncExternalStore(
    () => () => {},
    () => Boolean(dropper()),
    () => false,
  );

  if (!has) return null;

  return (
    <button
      type="button"
      title="Pick a colour off the screen"
      aria-label="Pick a colour off the screen"
      onClick={() => {
        void dropper()
          ?.open()
          .then(result => {
            const hex = asHex(result.sRGBHex);

            if (hex) onPick(hex);
          })
          // Closed with Escape, which is not a failure worth saying anything about.
          .catch(() => {});
      }}
      className="grid size-7 shrink-0 place-items-center rounded-[4px] border border-studio-border bg-studio-bg
        text-studio-muted transition-colors duration-150 hover:text-studio-text focus:outline-none
        focus-visible:ring-2 focus-visible:ring-studio-accent/40"
    >
      <MdColorize className="text-sm" />
    </button>
  );
};

/**
 * One colour, as the console asks for it: a labelled row that opens our own
 * picker rather than the browser's.
 *
 * The native `<input type="color">` was doing the job, but it opens the
 * operating system's panel — grey, sized by the OS, sitting outside the console
 * and over the tiles it is meant to be changing. This is the same picker in the
 * console's own palette, anchored under the row it belongs to.
 *
 * A picked colour carries its own way back. The section's Reset returns the
 * whole look at once, which is the wrong tool when three are right and the
 * fourth is a mistake — and clearing is also the only way to tell "the default,
 * which happens to be white" from "white, because I chose it".
 */
export const ColorField = ({
  label,
  hint,
  value,
  fallback,
  onPick,
  onClear,
}: {
  label: string;
  hint: string;
  /** What the operator has chosen, or nothing while the look's own colour stands. */
  value: string | undefined;
  /** The look's own colour, which is what the swatch shows until then. */
  fallback: string;
  onPick: (value: string) => void;
  onClear: () => void;
}) => {
  const [open, setOpen] = useState(false);
  // Which way it hangs, and which edge it hangs from: the swatches sit three to
  // a row at the bottom of a scrolling panel, so a panel that always dropped
  // down and left would open off the screen as often as not.
  const [place, setPlace] = useState({ above: false, right: false });
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };

    const onDown = (event: MouseEvent) => {
      if (!box.current?.contains(event.target as Node)) setOpen(false);
    };

    window.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onDown, true);

    return () => {
      window.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onDown, true);
    };
  }, [open]);

  const shown = value ?? fallback;

  const show = () => {
    const rect = box.current?.getBoundingClientRect();

    setPlace({
      above: rect ? window.innerHeight - rect.bottom < PANEL_H : false,
      right: rect ? window.innerWidth - rect.left < 240 : false,
    });
    setOpen(current => !current);
  };

  return (
    <div ref={box} className="relative">
      <div
        className={cn(
          'flex items-center gap-2 rounded-studio border px-2 py-1.5 transition-colors duration-150',
          'border-studio-border bg-studio-bg focus-within:ring-2 focus-within:ring-studio-accent/40',
          value ? 'border-studio-faint' : 'hover:border-studio-faint',
        )}
      >
        <button
          type="button"
          title={hint}
          aria-haspopup="dialog"
          aria-expanded={open}
          onClick={show}
          className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 text-left focus:outline-none"
        >
          <span
            aria-hidden
            className="size-5 shrink-0 rounded-[4px] border border-studio-border"
            style={swatch(shown)}
          />

          <span className="min-w-0 flex-1">
            <span className="block text-[11px] font-medium text-studio-text">{label}</span>
            <span className="block font-mono text-[10px] uppercase text-studio-faint">{value ?? 'default'}</span>
          </span>
        </button>

        {value ? (
          <button
            type="button"
            title={`Back to the look's own ${label.toLowerCase()}`}
            aria-label={`Reset ${label.toLowerCase()}`}
            onClick={onClear}
            className={cn(
              'grid size-5 shrink-0 place-items-center rounded-[4px] text-studio-faint',
              'transition-colors duration-150 hover:bg-studio-lift hover:text-studio-text',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-studio-accent/40',
            )}
          >
            <MdClose className="text-xs" />
          </button>
        ) : null}
      </div>

      {open ? (
        <div
          role="dialog"
          aria-label={`${label} colour`}
          className={cn(
            'absolute z-50 rounded-studio border border-studio-border bg-studio-bg shadow-studio-modal',
            place.above ? 'bottom-full mb-1' : 'top-full mt-1',
            place.right ? 'right-0' : 'left-0',
          )}
        >
          <Picker value={shown} onPick={onPick} />
        </div>
      ) : null}
    </div>
  );
};
