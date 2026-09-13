'use client';

import { useEffect, useRef } from 'react';

import { familyNameOf, googleCssUrl, type CustomFont } from '@/lib/projector/fonts';

const OWNED = 'data-llama-font';

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
  const nodes = useRef(new Map<string, HTMLElement>());

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
  }, [key]);

  useEffect(() => {
    const live = nodes.current;

    return () => {
      live.forEach(node => node.remove());
      live.clear();
    };
  }, []);
};

const PROBE_MS = 10000;

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

    return faces.some(face => face.status === 'loaded');
  } catch {
    return false;
  } finally {
    node.remove();
  }
};
