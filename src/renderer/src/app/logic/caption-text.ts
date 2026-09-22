// [joy], [neutral], [sfx:giggle], [legs_1], [hand_10] — one bare word (letters, digits,
// underscores), optionally "word:word". Anything with spaces or punctuation inside the
// brackets is ordinary text and stays.
const TAG = /\[[A-Za-z0-9_]+(?::[A-Za-z0-9_]+)?\]/g;

export function stripCaptionTags(text: string): string {
  return text.replace(TAG, '').replace(/\s{2,}/g, ' ').replace(/\s+([.,!?])/g, '$1').trim();
}

/** True when a message was created just now, as opposed to loaded from a stored conversation. */
export function isFreshMessage(timestamp: string | undefined, nowMs: number, windowMs = 10_000): boolean {
  if (!timestamp) return false;
  const at = Date.parse(timestamp);
  if (Number.isNaN(at)) return false;
  const age = nowMs - at;
  return age <= windowMs && age >= -2_000;
}
