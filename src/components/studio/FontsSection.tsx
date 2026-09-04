'use client';

import { useState, type FormEvent } from 'react';
import { Trash2 } from 'lucide-react';

import { LANG_LABELS } from '@/lib/bible/languages';
import { cn } from '@/lib/cn';
import { probeFont } from '@/components/projector/useCustomFonts';
import {
  BUILT_IN_FONTS,
  DEFAULT_FONT,
  defaultLabelOf,
  fontStyleOf,
  MAX_CUSTOM_FONTS,
  parseSource,
  valueOf,
  type CustomFont,
} from '@/lib/projector/fonts';
import { useStudio } from '@/lib/studio/StudioProvider';
import type { Lang } from '@/lib/types';

import { Field } from './StyleSection';

/**
 * A line of each script, so a face that cannot draw one shows it here rather
 * than on the wall. Georgian is not a given: most of the faces on offer are
 * Latin and Cyrillic only, and an operator running a Georgian service needs to
 * see the tofu before the service, not during it.
 */
const SAMPLE: Partial<Record<Lang, string>> = {
  // Modern Georgian, as the 2015 revision has it — not the old `რამეთუ ესრეთ
  // შეიყუარა ღმერთმან`, which is a different century's spelling and reads as
  // one to anybody in the room.
  geo: 'რადგან ისე შეიყვარა ღმერთმა ქვეყნიერება',
  eng: 'For God so loved the world',
  ru: 'Ибо так возлюбил Бог мир',
  gr: 'Οὕτως γὰρ ἠγάπησεν ὁ Θεὸς',
  ae: 'لِأَنَّهُ هَكَذَا أَحَبَّ ٱللهُ',
  la: 'Sic enim dilexit Deus mundum',
};

const FALLBACK_SAMPLE = 'For God so loved the world';

/** One face, drawn in itself, in each language the operator has armed. */
const Specimen = ({ value, fonts, langs }: { value: string; fonts: CustomFont[]; langs: Lang[] }) => {
  const type = fontStyleOf(value, fonts);

  return (
    <div
      className={cn('min-w-0 space-y-0.5', type.className)}
      style={type.style ? { fontFamily: type.style } : undefined}
    >
      {(langs.length ? langs : (['eng'] as Lang[])).map(lang => (
        <p key={lang} className="truncate text-base leading-snug text-studio-text">
          {SAMPLE[lang] ?? FALLBACK_SAMPLE}
        </p>
      ))}
    </div>
  );
};

/**
 * The operator's typefaces: the ones we ship, and the ones they add.
 *
 * Its own tab rather than a block inside the projector panel, because the
 * library serves both — a face added here is offered to the projector and to
 * the stream alike, and neither of those panels owns it.
 */
export const FontsSection = () => {
  const { settings, update } = useStudio();

  const [label, setLabel] = useState('');
  const [source, setSource] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const langs = settings.langOrder.filter(lang => settings.enabled[lang]);
  const full = settings.customFonts.length >= MAX_CUSTOM_FONTS;

  const add = async (event: FormEvent) => {
    event.preventDefault();

    // What was pasted decides what it is — a Google Fonts page, a link to a
    // font file, or a family name typed out.
    const parsed = parseSource(source);

    if (!parsed) {
      setError('Paste a Google Fonts page address, or a link ending in .woff2, .woff, .ttf or .otf.');
      return;
    }

    const font: CustomFont = {
      id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      label: label.trim() || defaultLabelOf(parsed),
      ...parsed,
    };

    // Fetch it before storing it. A face that will not load is worse than no
    // face at all: the picker offers it, the operator chooses it, and the wall
    // quietly shows the fallback with nothing to explain why.
    setBusy(true);
    setError('');

    const loaded = await probeFont(font);

    setBusy(false);

    if (!loaded) {
      setError(
        font.kind === 'google'
          ? `Google Fonts has no family called “${font.source}”.`
          : 'Nothing loaded from that link. Check it is a font file and is served to other sites.',
      );
      return;
    }

    update({ customFonts: [...settings.customFonts, font] });
    setLabel('');
    setSource('');
  };

  /**
   * Removing a face has to take the pickers with it. A setting left naming a
   * font that is gone resolves to the default anyway — `fontClassOf` sees to
   * that — but leaving it there means the dropdown shows a blank selection,
   * which reads as broken rather than as reverted.
   */
  const remove = (font: CustomFont) => {
    const gone = valueOf(font);
    const reset = (current: string) => (current === gone ? DEFAULT_FONT : current);

    update({
      customFonts: settings.customFonts.filter(item => item.id !== font.id),
      font: reset(settings.font),
      lyricsFont: reset(settings.lyricsFont),
      streamFont: reset(settings.streamFont),
      streamLyricsFont: reset(settings.streamLyricsFont),
    });
  };

  return (
    <div className="space-y-6">
      <Field
        label="Your fonts"
        hint="Added from the web rather than uploaded, so they cost nothing to keep. A hall
          with no internet falls back to the faces below."
      >
        {settings.customFonts.length === 0 ? (
          <p className="rounded-studio border border-dashed border-studio-border px-3 py-4 text-center text-xs text-studio-faint">
            No fonts of your own yet.
          </p>
        ) : (
          <ul className="space-y-2">
            {settings.customFonts.map(font => (
              <li
                key={font.id}
                className="flex items-center gap-3 rounded-studio border border-studio-border bg-studio-surface px-3 py-2"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium text-studio-text">{font.label}</p>
                  <p className="truncate text-[11px] text-studio-faint">
                    {font.kind === 'google' ? `Google Fonts · ${font.source}` : font.source}
                  </p>
                  <div className="mt-1.5">
                    <Specimen value={valueOf(font)} fonts={settings.customFonts} langs={langs} />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => remove(font)}
                  aria-label={`Remove ${font.label}`}
                  title={`Remove ${font.label}`}
                  className="shrink-0 rounded p-1 text-studio-muted transition-colors duration-150 hover:text-studio-danger"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </Field>

      <Field
        label="Add a font"
        hint="Paste the address of a Google Fonts page — fonts.google.com/specimen/Merriweather —
          or a direct link to a .woff2, .woff, .ttf or .otf file."
      >
        <form onSubmit={add} className="space-y-2">
          <input
            type="text"
            value={source}
            placeholder="https://fonts.google.com/specimen/Merriweather"
            onChange={event => {
              setSource(event.target.value);
              setError('');
            }}
            className="h-8 w-full min-w-0 rounded-studio border border-studio-border px-2.5 text-xs text-studio-text
              placeholder:text-studio-faint focus:outline-none focus-visible:ring-2 focus-visible:ring-studio-accent/40"
          />

          <div className="flex items-center gap-1.5">
            <input
              type="text"
              value={label}
              placeholder="What to call it (optional)"
              onChange={event => setLabel(event.target.value)}
              className="h-8 min-w-0 flex-1 rounded-studio border border-studio-border px-2.5 text-xs text-studio-text
                placeholder:text-studio-faint focus:outline-none focus-visible:ring-2 focus-visible:ring-studio-accent/40"
            />

            <button
              type="submit"
              disabled={busy || full || !source.trim()}
              className="h-8 shrink-0 rounded-studio border border-studio-accent bg-studio-accent px-3 text-xs
                font-medium text-studio-onaccent transition-colors duration-150 disabled:cursor-not-allowed
                disabled:border-studio-border disabled:bg-studio-border disabled:text-studio-faint"
            >
              {busy ? 'Checking…' : 'Add'}
            </button>
          </div>

          {error ? <p className="text-[11px] text-studio-danger">{error}</p> : null}
          {full ? (
            <p className="text-[11px] text-studio-faint">
              That is {MAX_CUSTOM_FONTS} fonts — remove one before adding another.
            </p>
          ) : null}
        </form>
      </Field>

      <Field
        label="Built-in fonts"
        hint="Bundled with LlamaPresenter, so they render with no internet. Only the first five cover
          Georgian."
      >
        <ul className="space-y-2">
          {BUILT_IN_FONTS.map(font => (
            <li key={font.value} className="rounded-studio border border-studio-border bg-studio-surface px-3 py-2">
              <p className="truncate text-[11px] text-studio-faint">{font.label}</p>
              <div className="mt-1">
                <Specimen value={font.value} fonts={settings.customFonts} langs={langs} />
              </div>
            </li>
          ))}
        </ul>
      </Field>

      <p className="text-[11px] leading-snug text-studio-faint">
        {langs.length
          ? `Specimens are shown in ${langs.map(lang => LANG_LABELS[lang]).join(', ')} — the languages you have armed.`
          : 'Arm a language on the rail to see specimens in it.'}
      </p>
    </div>
  );
};
