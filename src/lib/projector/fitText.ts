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

export const refitOnFontLoad = (refit: () => void) => {
  if (!document.fonts?.ready) {
    return () => {};
  }

  let cancelled = false;
  let frame = 0;

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
