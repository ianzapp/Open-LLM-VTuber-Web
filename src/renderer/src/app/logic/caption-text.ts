// [joy], [neutral], [sfx:giggle] — one bare word, optionally "word:word". Anything with
// spaces or punctuation inside the brackets is ordinary text and stays.
const TAG = /\[[A-Za-z_]+(?::[A-Za-z_]+)?\]/g;

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
