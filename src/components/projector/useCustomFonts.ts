'use client';

import { useEffect, useRef } from 'react';

import { familyNameOf, googleCssUrl, type CustomFont } from '@/lib/projector/fonts';

/**
 * Put the operator's own typefaces into the document.
 *
 * The counterpart of `useLocalBackground`, and far less work than it: a
 * background is bytes that have to be found on this machine or pulled off
 * another one, while a font is a link the browser fetches for itself. Which is
 * the whole reason an added face is a URL — `/lower3rd` in OBS is a separate
 * process with its own storage, and it can follow a link like anything else.
 *
 * The faces arrive in the slide payload, so this runs on the outputs as well
 * as in the console preview, and a font the operator adds mid-service is in
 * the document by the next slide.
 */

/** Marks the nodes we own, so a face that leaves the list takes its rule with it. */
const OWNED = 'data-llama-font';

/**
 * Never the operator's `source` for a Google family — that is a name we put in
 * a URL — and never their label. A `url` source has already been checked
 * against `isFontUrl`, but it is written into CSS rather than an attribute, so
 * the closing paren and quote are worth refusing on the way in too.
 */
const safeUrl = (source: string) => !/["'()\\]/.test(source);

const nodeFor = (font: CustomFont): HTMLElement | null => {
  if (font.kind === 'google') {
    const link = document.createElement('link');

    link.rel = 'stylesheet';
    link.href = googleCssUrl(font.source);

    return link;
  }

  if (!safeUrl(font.source)) return null;

  const style = document.createElement('style');

  // Our own @font-face rather than the operator's stylesheet: a pasted link
  // points at a font file, and third-party CSS is never injected.
  style.textContent = `@font-face {
  font-family: '${familyNameOf(font)}';
  src: url("${font.source}");
  font-weight: 400;
  font-style: normal;
  font-display: swap;
}`;

  return style;
};

export const useCustomFonts = (fonts: CustomFont[]) => {
  // Keyed by id, and reconciled rather than rebuilt. The list arrives fresh on
  // every payload, so tearing the whole lot down and putting it back would
  // re-fetch faces that had not changed — and a face that is on screen when
  // its <link> is pulled blinks to the fallback and back. Only what actually
  // changed is touched.
  const nodes = useRef(new Map<string, HTMLElement>());

  // What a face *is*, not merely which faces there are: editing a source in
  // place has to replace the rule, and an id alone would not notice.
  const key = fonts.map(font => `${font.id}:${font.kind}:${font.source}`).join('|');

  useEffect(() => {
    const live = nodes.current;
    const wanted = new Map(fonts.map(font => [`${font.id}:${font.kind}:${font.source}`, font]));

    for (const [id, node] of live) {
      if (!wanted.has(id)) {
        node.remove();
        live.delete(id);
      }
    }

    for (const [id, font] of wanted) {
      if (live.has(id)) continue;

      const node = nodeFor(font);

      if (!node) continue;

      node.setAttribute(OWNED, font.id);
      document.head.append(node);
      live.set(id, node);
    }
    // `fonts` is rebuilt each payload; `key` is what actually changed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  // Only on unmount: an output that closes should not leave its rules behind.
  useEffect(() => {
    const live = nodes.current;

    return () => {
      live.forEach(node => node.remove());
      live.clear();
    };
  }, []);
};

/**
 * Does this face actually load?
 *
 * Used by the settings dialog before a font is stored. The check has to happen
 * with the rule already in the document, and — for a Google family — only once
 * the stylesheet naming it has actually arrived: `document.fonts` knows
 * nothing about a family until the CSS declaring it has been fetched and
 * parsed, and asked sooner it answers "no such face" for a font that is
 * perfectly fine. So the node goes in, we wait for it, the question is asked,
 * and the node comes out again. The real one is added by the hook above once
 * the font is saved.
 *
 * A `false` means the browser could not get it: a family Google does not have
 * (that stylesheet 404s, and the link errors), or a font file that 404s or is
 * refused cross-origin. Both are worth catching before the face is on a wall.
 */

/** Long enough for a cold CDN fetch, short enough that the dialog is not stuck. */
const PROBE_MS = 10000;

/** A <style> applies as soon as it is appended; a <link> has to be fetched. */
const arrived = (node: HTMLElement) =>
  node instanceof HTMLLinkElement
    ? new Promise<boolean>(resolve => {
        const settle = (ok: boolean) => () => resolve(ok);

        node.addEventListener('load', settle(true), { once: true });
        node.addEventListener('error', settle(false), { once: true });
        setTimeout(settle(false), PROBE_MS);
      })
    : Promise.resolve(true);

export const probeFont = async (font: CustomFont): Promise<boolean> => {
  const node = nodeFor(font);

  if (!node) return false;

  node.setAttribute(OWNED, `probe-${font.id}`);
  document.head.append(node);

  try {
    if (!(await arrived(node))) return false;

    const faces = await document.fonts.load(`16px '${familyNameOf(font)}'`);

    // Declared is not the same as fetched: a hosted file that 404s still gives
    // back the FontFace the @font-face declared, with its status set to error.
    return faces.some(face => face.status === 'loaded');
  } catch {
    return false;
  } finally {
    node.remove();
  }
};
