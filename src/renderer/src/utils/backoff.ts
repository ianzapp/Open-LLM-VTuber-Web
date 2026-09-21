export function backoffDelay(attempt: number): number {
  return Math.min(15000, 1000 * 2 ** Math.max(0, attempt));
}
