/**
 * Identity, kept across a payload that says nothing new.
 *
 * The outputs decide "a new slide has arrived" by comparing the incoming state
 * with the one on screen by reference, and every payload arrives as a freshly
 * parsed object. That is fine while only slides travel — but the timer rides
 * along with the slide, so adjusting a run, renaming a timer or starting the
 * next one re-sends the same words and the bar crossfaded out and back in for
 * a change it does not draw.
 *
 * So a receiver folds the payload in through this: same content, same object,
 * and the transition never starts.
 */
export const keepSame = <T>(current: T, next: T): T => (equal(current, next) ? current : next);

const equal = (a: unknown, b: unknown): boolean => {
  if (Object.is(a, b)) return true;

  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return false;

  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;

    return a.every((item, index) => equal(item, b[index]));
  }

  const keys = Object.keys(a as object);

  if (keys.length !== Object.keys(b as object).length) return false;

  return keys.every(
    key =>
      Object.hasOwn(b as object, key) &&
      equal((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key]),
  );
};
