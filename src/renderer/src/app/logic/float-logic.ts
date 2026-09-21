export interface FloatSource { id: string; role: 'ai' | 'human'; content: string; timestamp: string; type?: string }
export interface FloatBubble { id: string; role: 'ai' | 'human'; text: string; fading: boolean }

export const FLOAT_TTL_MS = 9000;
export const FLOAT_FADE_MS = 700;
export const FLOAT_MAX = 3;
/** While she speaks the current turn stays up — but only if it really is current. */
const TURN_MAX_AGE_MS = 180_000;

/** The few newest messages that should float above the bar right now. */
export function floatingBubbles(
  messages: readonly FloatSource[], nowMs: number, speaking: boolean, stripTags: (s: string) => string,
): FloatBubble[] {
  const texts = messages
    .filter((m) => m.type !== 'tool_call_status')
    .map((m) => ({ m, text: stripTags(m.content) }))
    .filter((x) => x.text.length > 0);
  const out: FloatBubble[] = [];
  texts.forEach(({ m, text }, i) => {
    const age = nowMs - Date.parse(m.timestamp);
    if (Number.isNaN(age) || age < -2000) return;
    const inTurn = speaking && i >= texts.length - 2 && age <= TURN_MAX_AGE_MS;
    if (!inTurn && age > FLOAT_TTL_MS) return;
    out.push({ id: m.id, role: m.role, text, fading: !inTurn && age > FLOAT_TTL_MS - FLOAT_FADE_MS });
  });
  return out.slice(-FLOAT_MAX);
}
