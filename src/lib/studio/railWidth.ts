
export const RAIL_MIN_WIDTH = 346;

export const RAIL_MAX_WIDTH = 720;

const RAIL_ROOM = 520;

const WIDTH_KEY = 'studioRailWidth';

export const RAIL_WIDTH_VAR = '--studio-rail-width';

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
  }
};

export const railWidthScript = `(function(){try{var n=Number(localStorage.getItem('${WIDTH_KEY}'));if(!isFinite(n)||n<=0)n=${RAIL_MIN_WIDTH};n=Math.max(${RAIL_MIN_WIDTH},Math.min(n,${RAIL_MAX_WIDTH},Math.max(${RAIL_MIN_WIDTH},window.innerWidth-${RAIL_ROOM})));document.documentElement.style.setProperty('${RAIL_WIDTH_VAR}',n+'px')}catch(e){}})()`;
