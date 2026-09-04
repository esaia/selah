/**
 * The compositor's "nothing here" checker.
 *
 * What the lower third paints everywhere except its bar, and the one honest way
 * to show an output whose whole point is what it leaves out. Two greys rather
 * than the usual white pair, so on a light page it reads as a screen showing
 * nothing rather than a hole in the paper.
 */
export const CHECKER = {
  backgroundColor: '#1e2329',
  backgroundImage: 'repeating-conic-gradient(#2b3138 0% 25%, #1e2329 0% 50%)',
  backgroundSize: '14px 14px',
} as const;
