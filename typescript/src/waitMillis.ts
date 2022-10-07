/**
 * Using 'setTimeout' to create a promise that resolves after a specified amount of milli-second is... a one-liner.
 * This version allows aborting that promise with an abort-signal. Useful mostly in tests, if you cannot use
 * fake-timers
 * @param millis timeout of the promise
 * @param signal the abort-signal that aborts the sig... the promise
 */
export function waitMillis(
  millis: number,
  signal?: AbortSignal
): Promise<void> {
  return new Promise<void>((resolve) => {
    const cancel = () => clearTimeout(timeoutHandle);
    const timeoutHandle = setTimeout(() => {
      signal?.removeEventListener("abort", cancel);
      resolve()
    }, millis);
    signal?.addEventListener("abort", cancel);
  });
}
