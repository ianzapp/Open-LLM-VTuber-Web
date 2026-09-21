/** Join two chunks of one reply. Adds a space only between Latin-script sentences. */
export function joinSentences(prev: string, next: string): string {
  if (!prev || !next) return prev + next;
  if (/\s$/.test(prev) || /^\s/.test(next)) return prev + next;
  // CJK and other scripts are written without spaces between sentences.
  const latinEnd = /[\x21-\x7e]$/.test(prev);
  const latinStart = /^[\x21-\x7e]/.test(next);
  return latinEnd && latinStart ? `${prev} ${next}` : prev + next;
}
