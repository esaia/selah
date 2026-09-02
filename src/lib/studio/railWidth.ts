/**
 * The width of the output rail, as a per-machine preference.
 *
 * It cannot be React state seeded from `localStorage`: the server has no
 * `localStorage`, so the first client render would be the default and the saved
 * width would only arrive after hydration — a rail that visibly snaps wider a
 * few frames into every reload. So the width lives in a CSS variable that a
 * blocking script sets while the console's HTML is still parsing, and React
 * only ever writes to it. Nothing re-renders when the handle is dragged either.
 */

/** The width it has always been, and the narrowest the preview stays useful. */
export const RAIL_MIN_WIDTH = 320;

/** Past this the rail is taking room the running order needs more. */
export const RAIL_MAX_WIDTH = 720;

/** What the passages keep, whatever the rail was dragged to on a wider screen. */
const RAIL_ROOM = 520;

const WIDTH_KEY = 'studioRailWidth';

export const RAIL_WIDTH_VAR = '--studio-rail-width';

/** Never wider than the window can spare, whatever was saved on a bigger one. */
export const clampRailWidth = (width: number) =>
  Math.max(RAIL_MIN_WIDTH, Math.min(width, RAIL_MAX_WIDTH, Math.max(RAIL_MIN_WIDTH, window.innerWidth - RAIL_ROOM)));

export const readRailWidth = () => {
  try {
    const saved = Number(localStorage.getItem(WIDTH_KEY));

    return clampRailWidth(Number.isFinite(saved) && saved > 0 ? saved : RAIL_MIN_WIDTH);
  } catch {
    return RAIL_MIN_WIDTH;
  }
};

export const writeRailWidth = (width: number) => {
  document.documentElement.style.setProperty(RAIL_WIDTH_VAR, `${width}px`);

  try {
    localStorage.setItem(WIDTH_KEY, String(width));
  } catch {
    // Non-critical.
  }
};

/**
 * The same read, inlined into the document so it runs before the console
 * paints. Built from the bounds above so the two cannot drift apart.
 */
export const railWidthScript = `(function(){try{var n=Number(localStorage.getItem('${WIDTH_KEY}'));if(!isFinite(n)||n<=0)n=${RAIL_MIN_WIDTH};n=Math.max(${RAIL_MIN_WIDTH},Math.min(n,${RAIL_MAX_WIDTH},Math.max(${RAIL_MIN_WIDTH},window.innerWidth-${RAIL_ROOM})));document.documentElement.style.setProperty('${RAIL_WIDTH_VAR}',n+'px')}catch(e){}})()`;
