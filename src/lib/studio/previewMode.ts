/**
 * Which output the preview panel mirrors, as a per-machine preference.
 *
 * Same problem as the rail width, and the same answer: the server cannot read
 * `localStorage`, so a panel seeded from React state renders the default first
 * and corrects itself once hydration runs — the Projector tab flashing past on
 * every reload for an operator who left the panel on the lower third. So the
 * saved tab is stamped onto `<html>` by a blocking script while the console's
 * HTML is still parsing, and the panel's panes are shown by CSS from there
 * (see `globals.css`). React reads the same value and only ever writes it.
 */

export const PREVIEW_MODES = ["projector", "stream", "stage"] as const;

export type PreviewMode = (typeof PREVIEW_MODES)[number];

export const DEFAULT_PREVIEW_MODE: PreviewMode = "projector";

const MODE_KEY = "studioPreviewMode";

/** Read by the CSS rules that decide which pane is visible before hydration. */
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
    // Non-critical.
  }
};

/**
 * The same read, inlined into the document so the right tab is the one that
 * paints. Built from the names above so the two cannot drift apart.
 */
export const previewModeScript = `(function(){try{var m=localStorage.getItem('${MODE_KEY}');if(${JSON.stringify(
  PREVIEW_MODES,
)}.indexOf(m)<0)m='${DEFAULT_PREVIEW_MODE}';document.documentElement.setAttribute('${PREVIEW_MODE_ATTR}',m)}catch(e){}})()`;
