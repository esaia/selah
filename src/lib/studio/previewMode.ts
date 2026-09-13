
export const PREVIEW_MODES = ["projector", "stream", "stage"] as const;

export type PreviewMode = (typeof PREVIEW_MODES)[number];

export const DEFAULT_PREVIEW_MODE: PreviewMode = "projector";

const MODE_KEY = "studioPreviewMode";

export const PREVIEW_MODE_ATTR = "data-preview";

const isMode = (value: string | null): value is PreviewMode =>
  (PREVIEW_MODES as readonly string[]).includes(value ?? "");

export const readPreviewMode = (): PreviewMode => {
  try {
    const saved = localStorage.getItem(MODE_KEY);

    return isMode(saved) ? saved : DEFAULT_PREVIEW_MODE;
  } catch {
    return DEFAULT_PREVIEW_MODE;
  }
};

export const writePreviewMode = (mode: PreviewMode) => {
  document.documentElement.setAttribute(PREVIEW_MODE_ATTR, mode);

  try {
    localStorage.setItem(MODE_KEY, mode);
  } catch {
  }
};

export const previewModeScript = `(function(){try{var m=localStorage.getItem('${MODE_KEY}');if(${JSON.stringify(
  PREVIEW_MODES,
)}.indexOf(m)<0)m='${DEFAULT_PREVIEW_MODE}';document.documentElement.setAttribute('${PREVIEW_MODE_ATTR}',m)}catch(e){}})()`;
