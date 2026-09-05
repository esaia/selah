"use client";

import { useState } from "react";
import { MdRefresh } from "react-icons/md";

import { cn } from "@/lib/cn";
import {
  defaultsOf,
  knobsOf,
  varsFor,
  type Colorway,
} from "@/lib/lower3rd/colors";
import { fontStyleOf, type CustomFont } from "@/lib/projector/fonts";
import { useStudio } from "@/lib/studio/StudioProvider";
import type { Align } from "@/lib/types";

import { ColorField } from "./ColorField";

// Each look re-points the CSS variables on `.lower3rd-bar`; see globals.css.
// A look here is an arrangement only — what it is painted in is picked below
// the grid, which is why the bands appear once rather than in black and white.
export const VARIANTS = [
  { value: "scrim", label: "Gradient fade" },
  { value: "solid", label: "Solid bar" },
  { value: "bands", label: "Bands" },
  { value: "card", label: "Reference card" },
  { value: "split", label: "Split bar" },
  { value: "plain", label: "Text only" },
];

export const variantLabel = (value: string) =>
  VARIANTS.find((variant) => variant.value === value)?.label ?? value;

const TARGETS = [
  { id: "verses", label: "Verses" },
  { id: "lyrics", label: "Lyrics" },
];

/** What each knob is called where the operator meets it. */
const KNOBS: Record<keyof Colorway, { label: string; hint: string }> = {
  plate: { label: "Plate", hint: "The panel the words sit on." },
  ink: { label: "Text", hint: "The words, and the reference under them." },
  accent: { label: "Accent", hint: "The rule and the reference chip." },
};

/** Short enough to fit the tile, long enough to wrap onto a second line. */
const SAMPLE_VERSE = "For God so loved the world that he gave his only Son";
const SAMPLE_LYRIC = "Amazing grace, how sweet the sound";

/** The same map the overlay itself uses, so a tile cannot disagree with it. */
const ALIGN_CLASS: Record<Align, string> = {
  left: "text-left",
  center: "text-center",
  right: "text-right",
};

/**
 * The live markup of /lower3rd, shrunk into a tile. Rendering the real classes
 * rather than a drawing of them means a look and its preview cannot disagree —
 * a new variant in the stylesheet previews itself.
 *
 * The typeface, the alignment and the colours come from the settings around the
 * grid, for the same reason: a tile that is always ragged-left in one face is
 * answering a question the operator has already given a different answer to.
 */
const Preview = ({
  variant,
  top,
  lyrics,
  font,
  fonts,
  align,
  colors,
}: {
  variant: string;
  top: boolean;
  lyrics: boolean;
  font: string;
  fonts: CustomFont[];
  align: Align;
  colors: Colorway;
}) => {
  const type = fontStyleOf(font, fonts);

  return (
    <div
      className={cn("l3-preview", type.className)}
      style={type.style ? { fontFamily: type.style } : undefined}
    >
      <div
        className={cn(
          "lower3rd-bar",
          `lower3rd-bar--${variant}`,
          top && "lower3rd-bar--top",
          ALIGN_CLASS[align],
        )}
        style={varsFor(variant, colors)}
      >
        <div className="lower3rd-inner">
          <div className="lower3rd-block">
            <p className="lower3rd-text">
              {lyrics ? SAMPLE_LYRIC : SAMPLE_VERSE}
            </p>

            {lyrics ? null : (
              <div className="lower3rd-refline">
                <span className="lower3rd-ref">
                  <span className="lower3rd-ref-book">John</span>{" "}
                  <span className="lower3rd-ref-num">3:16</span>
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Picks the look of the lower third by showing it, instead of naming it in a
 * dropdown — "Split bar" and "Reference card" mean nothing until you have seen
 * them. Verses and lyrics each keep their own look, switched by the tabs above
 * the grid rather than by a second identical grid.
 *
 * The colours are asked separately, below. They used to be part of the look,
 * which meant the same arrangement had to be listed once per colourway and an
 * operator whose church is not black or white was out of luck.
 */
export const LowerThirdStylePicker = () => {
  const { settings, update } = useStudio();

  const [target, setTarget] = useState("verses");

  const lyrics = target === "lyrics";
  const selected = lyrics ? settings.lyricsVariant : settings.lowerThirdVariant;
  const select = (value: string) =>
    update(lyrics ? { lyricsVariant: value } : { lowerThirdVariant: value });
  const top = settings.lowerThirdPosition === "top";

  // The tiles are drawn in the type the stream is actually set in, so the look
  // being chosen and the look being described are the same picture.
  const font = lyrics ? settings.streamLyricsFont : settings.streamFont;
  const align = lyrics ? settings.streamLyricsAlign : settings.streamAlign;

  const colors = lyrics
    ? settings.streamColors.lyrics
    : settings.streamColors.verses;
  const setColors = (next: Colorway) =>
    update({
      streamColors: { ...settings.streamColors, [target]: next },
    });
  // Dropped, not set to the default: a knob that is absent is the look's own
  // colour, and a look the operator switches to later should paint in its own.
  const clearColor = (knob: keyof Colorway) =>
    setColors(Object.fromEntries(Object.entries(colors).filter(([key]) => key !== knob)));

  const knobs = knobsOf(selected);
  const defaults = defaultsOf(selected);
  // Only the knobs this look uses count as picked: an accent left behind by the
  // split bar should not light up Reset on a look that has no rule to paint.
  const picked = knobs.some((knob) => colors[knob]);

  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <span className="block text-xs font-semibold text-studio-text">
          Look
        </span>

        <nav
          aria-label="Which slides this look applies to"
          className="flex items-center gap-0.5 rounded-studio border border-studio-border bg-studio-surface p-0.5"
        >
          {TARGETS.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              aria-current={target === id ? "true" : undefined}
              onClick={() => setTarget(id)}
              className={cn(
                "h-6 rounded-[4px] px-2.5 text-[11px] font-medium transition-colors duration-150",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-studio-accent/40",
                target === id
                  ? "bg-studio-lift text-studio-text shadow-studio"
                  : "text-studio-muted hover:text-studio-text",
              )}
            >
              {label}
            </button>
          ))}
        </nav>
      </div>

      <p className="mt-0.5 text-[11px] leading-snug text-studio-faint">
        {lyrics
          ? "How song slides sit on the stream."
          : "How Bible slides sit on the stream."}
      </p>

      <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {VARIANTS.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            aria-pressed={selected === value}
            onClick={() => select(value)}
            className={cn(
              "group overflow-hidden rounded-studio border text-left transition-colors duration-150",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-studio-accent/40",
              selected === value
                ? "border-studio-accent ring-1 ring-studio-accent"
                : "border-studio-border hover:border-studio-faint",
            )}
          >
            <Preview
              variant={value}
              top={top}
              lyrics={lyrics}
              font={font}
              fonts={settings.customFonts}
              align={align}
              colors={colors}
            />

            <span
              className={cn(
                "block truncate px-1.5 py-1 text-[11px] font-medium",
                selected === value
                  ? "bg-studio-accent text-studio-onaccent"
                  : "bg-studio-bg text-studio-muted",
              )}
            >
              {label}
            </span>
          </button>
        ))}
      </div>

      <div className="mt-4 flex items-baseline justify-between gap-2">
        <span className="block text-xs font-semibold text-studio-text">
          Colours
        </span>

        <button
          type="button"
          disabled={!picked}
          title={`Back to the colours ${variantLabel(selected)} ships in`}
          onClick={() => setColors({})}
          className={cn(
            "flex h-6 items-center gap-1 rounded-[4px] border px-2 text-[11px] font-medium",
            "transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-studio-accent/40",
            picked
              ? "border-studio-border bg-studio-bg text-studio-muted hover:bg-studio-surface hover:text-studio-text"
              : "cursor-default border-transparent text-studio-faint/50",
          )}
        >
          <MdRefresh className="text-xs" />
          Reset
        </button>
      </div>

      <p className="mt-0.5 text-[11px] leading-snug text-studio-faint">
        {`What ${variantLabel(selected)} is painted in. Every tile above follows.`}
      </p>

      <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {knobs.map((knob) => (
          <ColorField
            key={knob}
            label={KNOBS[knob].label}
            hint={KNOBS[knob].hint}
            value={colors[knob]}
            fallback={defaults[knob] ?? "#ffffff"}
            onPick={(value) => setColors({ ...colors, [knob]: value })}
            onClear={() => clearColor(knob)}
          />
        ))}
      </div>
    </div>
  );
};
