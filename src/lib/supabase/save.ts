/**
 * Run a fire-and-forget write, and say so when it fails.
 *
 * Postgrest query builders are *lazy thenables*: `db.from(...).upsert(...)`
 * builds a request and sends nothing until something calls `.then` on it. So a
 * write that is not awaited never happens, silently — which is how the console
 * spent a while appearing to save the operator's settings, workspace and live
 * slide while the rows never moved. Everything that writes without caring about
 * the result goes through here.
 */
export const save = async <T extends PromiseLike<{ error: { message: string } | null }>>(
  query: T,
  what: string,
): Promise<void> => {
  const { error } = await query;

  if (error) console.error(`[selah] could not save ${what}: ${error.message}`);
};
