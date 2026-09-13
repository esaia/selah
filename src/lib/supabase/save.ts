export const save = async <T extends PromiseLike<{ error: { message: string } | null }>>(
  query: T,
  what: string,
): Promise<void> => {
  const { error } = await query;

  if (error) console.error(`[llama] could not save ${what}: ${error.message}`);
};
