/** Bound a request even when its underlying SDK promise never settles. */
export async function withRequestTimeout<T>(
  request: PromiseLike<T>,
  milliseconds = 60_000,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      Promise.resolve(request),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error("Request timeout. Check your connection and try again.")), milliseconds);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}