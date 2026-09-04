/**
 * Grow `element`'s font size until the text would exceed `available` pixels
 * tall or spill out of its own box sideways, then keep the last size that
 * fitted. Used by the projector and by the preview panel so both scale text the
 * same way.
 *
 * The width test matters for song lyrics: one long Georgian word has no break
 * opportunity, so past a certain size it runs off the screen edges while the
 * block is still short enough to pass the height test.
 */
export interface FitOptions {
  min?: number;
  max?: number;
  constrain?: (element: HTMLElement) => boolean;
}

export const fitText = (
  element: HTMLElement | null,
  available: number,
  { min = 8, max = 64, constrain }: FitOptions = {},
) => {
  if (!element || available <= 0) {
    return;
  }

  // Binary search rather than stepping one pixel at a time: text height grows
  // monotonically with font size, and every probe forces a layout, so this
  // turns ~50 reflows into ~6. That matters when dozens of verse cards refit
  // at once while the size slider moves.
  // `constrain` lets a caller add its own test to the search — the lower third
  // uses it to cap each verse at two lines, which the height test alone cannot
  // express because the block's height depends on how many languages are up.
  const fits = () =>
    element.offsetHeight <= available &&
    element.scrollWidth <= element.clientWidth &&
    (!constrain || constrain(element));

  element.style.fontSize = `${max}px`;

  if (fits()) {
    return;
  }

  let low = min;
  let high = max;
  let best = min;

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    element.style.fontSize = `${mid}px`;

    if (fits()) {
      best = mid;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }

  element.style.fontSize = `${best}px`;
};

/**
 * Run `refit` again whenever web fonts swap in.
 *
 * On a cold load the first measurement happens with fallback-font metrics,
 * which are narrower than BPG Banner Caps — the fit comes out too large and
 * the text is clipped until something else (a resize, a new verse) triggers a
 * remeasure.
 *
 * `document.fonts.ready` settles once and covers that cold load. It does not
 * cover a face the operator adds mid-service: a font fetched from a CDN lands
 * long after the promise resolved, swaps in under already-fitted text, and
 * leaves it clipped with nothing to trigger a remeasure. `loadingdone` fires
 * for each of those, so both are watched.
 *
 * Returns a cleanup that cancels the pending callback and drops the listener.
 */
export const refitOnFontLoad = (refit: () => void) => {
  if (!document.fonts?.ready) {
    return () => {};
  }

  let cancelled = false;
  let frame = 0;

  // Coalesced to one refit a frame. `loadingdone` fires per batch the browser
  // finishes, and a page holding a dozen families fetches their subsets in
  // bursts — the console draws a specimen of every face it offers. Refitting
  // per event re-measures and resizes the text several times in as many
  // frames, which reads as a flicker rather than as a fit.
  const onDone = () => {
    if (cancelled || frame) return;

    frame = requestAnimationFrame(() => {
      frame = 0;

      if (!cancelled) refit();
    });
  };

  document.fonts.ready.then(onDone);
  document.fonts.addEventListener('loadingdone', onDone);

  return () => {
    cancelled = true;
    cancelAnimationFrame(frame);
    document.fonts.removeEventListener('loadingdone', onDone);
  };
};
