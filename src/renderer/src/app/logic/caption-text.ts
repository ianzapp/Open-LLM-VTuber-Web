// [joy], [neutral], [sfx:giggle] — one bare word, optionally "word:word". Anything with
// spaces or punctuation inside the brackets is ordinary text and stays.
const TAG = /\[[A-Za-z_]+(?::[A-Za-z_]+)?\]/g;

export function stripCaptionTags(text: string): string {
  return text.replace(TAG, '').replace(/\s{2,}/g, ' ').replace(/\s+([.,!?])/g, '$1').trim();
}
