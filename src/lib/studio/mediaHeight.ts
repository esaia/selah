
export const MEDIA_MIN_HEIGHT = 140;

export const MEDIA_MAX_HEIGHT = 560;

const SLIDE_ROOM = 260;

const HEIGHT_KEY = 'studioMediaHeight';

export const MEDIA_HEIGHT_VAR = '--studio-media-height';

export const DEFAULT_MEDIA_HEIGHT = 208;

export const clampMediaHeight = (height: number) =>
  Math.max(
    MEDIA_MIN_HEIGHT,
    Math.min(height, MEDIA_MAX_HEIGHT, Math.max(MEDIA_MIN_HEIGHT, window.innerHeight - SLIDE_ROOM)),
  );

export const readMediaHeight = () => {
  try {
    const saved = Number(localStorage.getItem(HEIGHT_KEY));

    return clampMediaHeight(Number.isFinite(saved) && saved > 0 ? saved : DEFAULT_MEDIA_HEIGHT);
  } catch {
    return DEFAULT_MEDIA_HEIGHT;
  }
};

export const writeMediaHeight = (height: number) => {
  document.documentElement.style.setProperty(MEDIA_HEIGHT_VAR, `${height}px`);

  try {
    localStorage.setItem(HEIGHT_KEY, String(height));
  } catch {
  }
};
