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
import { CUSTOM_LOOK, customLook, isCustomLook, templateIdOf } from "@/lib/projector/looks";
import {
  filesUsedBy,
  SAMPLE_LYRICS as SAMPLE_LYRIC_SLIDE,
  SAMPLE_VERSE as SAMPLE_VERSE_SLIDE,
  type SlideTemplate,
  type TemplateTarget,
} from "@/lib/projector/template";
import { newTemplateName, streamStyle, templatesFor } from "@/lib/studio/settings";
import { CustomSlide } from "@/components/projector/CustomSlide";
import { useLocalFiles } from "@/components/projector/useLocalBackground";
import { IconButton } from "@/components/ui/IconButton";
import { HiOutlinePencil } from "react-icons/hi";
import { Plus } from "lucide-react";
import { useMemo } from "react";
import { useStudio } from "@/lib/studio/StudioProvider";
import type { Align } from "@/lib/types";

import { ColorField } from "./ColorField";
import { NewStrapModal } from "./NewStrapModal";
import { TemplateEditor } from "./TemplateEditor";

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
  // The one the operator draws. Not a `.lower3rd-bar` variant at all: it
  // replaces the bar with a template on the whole frame, which is why the
  // colourway below the grid has nothing to say about it.
  { value: CUSTOM_LOOK, label: "Custom" },
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
export const Preview = ({
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
  const { settings, showData, update, room } = useStudio();

  // Opens on whichever kind of slide is live. An operator who hits the pencil
  // over a song is there about the song, and landing on the verse grid means
  // finding the tab before finding the tile.
  const [target, setTarget] = useState(showData?.lyrics ? "lyrics" : "verses");
  // Which of the operator's own straps is open on the canvas, if any.
  const [editing, setEditing] = useState("");
  // Whether the "start from" chooser is open for a new one.
  const [choosing, setChoosing] = useState(false);

  // What the custom tile draws its sample against: the stream's own wire
  // style, which already reduces the armed set to the one language the
  // overlay carries.
  const wire = streamStyle(settings);

  // A picture placed in a strap is in this browser's IndexedDB, so unlike a
  // projector's background it can be minted here.
  const assets = useLocalFiles(
    useMemo(
      () => settings.customTemplates.flatMap((row) => filesUsedBy(row.template)),
      [settings.customTemplates],
    ),
    null,
  );

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

  /**
   * The grid: the shipped straps, then the operator's own.
   *
   * `custom` is dropped from the shipped row — it stood for one drawing, and
   * it is now as many tiles as they have drawn, each under its own name.
   */
  const kind: TemplateTarget = lyrics ? "streamLyrics" : "stream";
  const mine = templatesFor(settings, kind);

  const tiles: { value: string; label: string; template?: SlideTemplate }[] = [
    ...VARIANTS.filter((variant) => variant.value !== CUSTOM_LOOK),
    ...mine.map((row) => ({ value: customLook(row.id), label: row.name, template: row.template })),
  ];

  /** Draw another one; saved before the canvas opens, as the projector's is. */
  const add = (template: SlideTemplate) => {
    const row = {
      id: crypto.randomUUID(),
      target: kind,
      name: newTemplateName(settings, kind),
      template,
    };

    // Over the plan's ceiling the editor still opens — on a template that was
    // never written. Refusing at the door answered "is this worth paying for?"
    // by never showing the thing being sold; this way they draw on it, and the
    // line is found at Save, which is where it actually is.
    if (!room('custom_templates')) {
      setEditing(row.id);
      return;
    }

    update({ customTemplates: [...settings.customTemplates, row] });
    select(customLook(row.id));
    setEditing(row.id);
  };

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
        {tiles.map(({ value, label, template }) => (
          // One of the operator's own carries a second control, and a button
          // cannot hold another one — so the tile is a box with the two side
          // by side.
          <div key={value} className="relative">
            <button
              type="button"
              aria-pressed={selected === value}
              onClick={() => select(value)}
              className={cn(
                "group block w-full overflow-hidden rounded-studio border text-left transition-colors duration-150",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-studio-accent/40",
                selected === value
                  ? "border-studio-accent ring-1 ring-studio-accent"
                  : "border-studio-border hover:border-studio-faint",
              )}
            >
              {template ? (
                <div className="l3-preview">
                  <CustomSlide
                    template={template}
                    showData={lyrics ? SAMPLE_LYRIC_SLIDE : SAMPLE_VERSE_SLIDE}
                    // One language, as the overlay itself carries: without
                    // this the tile drew both of the sample's and wrapped
                    // differently from the thing it is a picture of.
                    style={{ ...wire, fonts: settings.customFonts, lyricsLang: "sample-1" }}
                    assets={assets}
                  />
                </div>
              ) : (
                <Preview
                  variant={value}
                  top={top}
                  lyrics={lyrics}
                  font={font}
                  fonts={settings.customFonts}
                  align={align}
                  colors={colors}
                />
              )}

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

            {template ? (
              <IconButton
                label={`Edit ${label}`}
                tone="onDark"
                onClick={() => setEditing(templateIdOf(value))}
                className="absolute top-1 right-1 size-6 bg-black/55 backdrop-blur-sm"
              >
                <HiOutlinePencil className="text-xs" />
              </IconButton>
            ) : null}
          </div>
        ))}

        {/* Its own tile at the end of the grid rather than a button beside the
            heading: what it makes is another one of these. */}
        <button
          type="button"
          onClick={() => setChoosing(true)}
          className={cn(
            "block w-full overflow-hidden rounded-studio border border-dashed border-studio-border text-left",
            "text-studio-muted transition-colors duration-150 hover:border-studio-faint hover:text-studio-text",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-studio-accent/40",
          )}
        >
          {/* Built like a tile rather than styled like one, so it stands
              exactly as tall as the straps beside it. */}
          <div className="flex aspect-video w-full items-center justify-center">
            <Plus className="size-5" />
          </div>

          <span className="block truncate bg-studio-bg px-1.5 py-1 text-[11px] font-medium">
            New template
          </span>
        </button>
      </div>

      {choosing ? (
        <NewStrapModal
          open={choosing}
          onClose={() => setChoosing(false)}
          kind={kind}
          top={top}
          lyrics={lyrics}
          font={font}
          fonts={settings.customFonts}
          align={align}
          colors={colors}
          onPick={add}
        />
      ) : null}

      {editing ? (
        <TemplateEditor target={kind} id={editing} onClose={() => setEditing("")} />
      ) : null}

      {/* A template carries its own plates and colours on every box, so the
          colourway has nothing to re-point under one of the operator's. */}
      {isCustomLook(selected) ? null : (
        <>
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
        </>
      )}
    </div>
  );
};
