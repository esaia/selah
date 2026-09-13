'use client';

import { useState, type FormEvent } from 'react';
import { Trash2 } from 'lucide-react';

import { limitMessage } from '@/lib/billing/limits';
import { labelOf } from '@/lib/bible/languages';
import { probeFont } from '@/components/projector/useCustomFonts';
import {
  BUILT_IN_FONTS,
  DEFAULT_FONT,
  defaultLabelOf,
  MAX_CUSTOM_FONTS,
  parseSource,
  valueOf,
  type CustomFont,
} from '@/lib/projector/fonts';
import { useStudio } from '@/lib/studio/StudioProvider';

import { FontSpecimen } from '@/components/studio/pickers/FontSpecimen';
import { Field } from '@/components/studio/settings/StyleSection';

export const FontsSection = () => {
  const { settings, update, room } = useStudio();

  const [label, setLabel] = useState('');
  const [source, setSource] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const langs = settings.langOrder.filter(lang => settings.enabled[lang]);
  const atPlanCeiling = !room('custom_fonts');
  const full = settings.customFonts.length >= MAX_CUSTOM_FONTS || atPlanCeiling;

  const add = async (event: FormEvent) => {
    event.preventDefault();

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
          {atPlanCeiling ? (
            <p className="text-[11px] leading-relaxed text-studio-muted">
              {limitMessage('custom_fonts')}{' '}
              <a href="/pricing" className="text-studio-accent underline underline-offset-2">
                See Pro
              </a>
            </p>
          ) : full ? (
            <p className="text-[11px] text-studio-faint">
              That is {MAX_CUSTOM_FONTS} fonts — remove one before adding another.
            </p>
          ) : null}
        </form>
      </Field>

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
                    <FontSpecimen value={valueOf(font)} fonts={settings.customFonts} langs={langs} />
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
        label="Built-in fonts"
        hint="Bundled with LlamaPresenter, so they render with no internet. The ones marked Georgian
          set Georgian and English both; the rest are Latin and Cyrillic only."
      >
        <ul className="space-y-2">
          {BUILT_IN_FONTS.map(font => (
            <li key={font.value} className="rounded-studio border border-studio-border bg-studio-surface px-3 py-2">
              <p className="truncate text-[11px] text-studio-faint">{font.label}</p>
              <div className="mt-1">
                <FontSpecimen value={font.value} fonts={settings.customFonts} langs={langs} />
              </div>
            </li>
          ))}
        </ul>
      </Field>

      <p className="text-[11px] leading-snug text-studio-faint">
        {langs.length
          ? `Specimens are shown in ${langs.map(lang => labelOf(lang)).join(', ')} — the languages you have armed.`
          : 'Arm a language on the rail to see specimens in it.'}
      </p>
    </div>
  );
};
