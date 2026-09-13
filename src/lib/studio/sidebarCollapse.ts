
const KEY = 'studioSidebarCollapsed';

export const SIDEBAR_MINI_WIDTH = 56;
export const SIDEBAR_FULL_WIDTH = 288;

export const SIDEBAR_WIDTH_VAR = '--studio-sidebar-width';

export const readSidebarCollapsed = (): boolean => {
  try {
    return localStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
};

export const writeSidebarCollapsed = (collapsed: boolean) => {
  document.documentElement.style.setProperty(
    SIDEBAR_WIDTH_VAR,
    `${collapsed ? SIDEBAR_MINI_WIDTH : SIDEBAR_FULL_WIDTH}px`,
  );

  try {
    if (collapsed) localStorage.setItem(KEY, '1');
    else localStorage.removeItem(KEY);
  } catch {
  }
};

export const sidebarWidthScript = `(function(){try{var c=localStorage.getItem('${KEY}')==='1';document.documentElement.style.setProperty('${SIDEBAR_WIDTH_VAR}',(c?${SIDEBAR_MINI_WIDTH}:${SIDEBAR_FULL_WIDTH})+'px')}catch(e){}})()`;
