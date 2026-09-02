/**
 * How a drop target says so, everywhere the console has one.
 *
 * A dashed inset outline rather than a hard ring: it reads as "this area is
 * open" without redrawing the panel's own borders, and it sits inside the
 * scroll box so a long list does not push it out of view.
 */
export const DROP_ZONE = 'bg-studio-accent/5 outline-2 outline-dashed outline-studio-accent -outline-offset-4';

/** Where the drop would land in an ordered list. */
export const DROP_LINE = 'border-studio-accent';
