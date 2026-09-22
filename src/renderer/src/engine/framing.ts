/** Where she sits on screen and how big she is: position plus uniform scale. */
export interface Framing {
  x: number;
  y: number;
  scale: number;
}

export const MIN_SCALE = 0.4;
export const MAX_SCALE = 3;

type Reader = Pick<Storage, 'getItem'>;
type Writer = Pick<Storage, 'setItem'>;

const framingKey = (model: string) => `companion.framing.${model}`;

const isFiniteNumber = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

export function loadFraming(storage: Reader, model: string): Framing | null {
  try {
    const raw = storage.getItem(framingKey(model));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    const { x, y, scale } = parsed as Framing;
    if (!isFiniteNumber(x) || !isFiniteNumber(y) || !isFiniteNumber(scale)) return null;
    return { x, y, scale };
  } catch { return null; }
}

export function saveFraming(storage: Writer, model: string, f: Framing): void {
  try { storage.setItem(framingKey(model), JSON.stringify(f)); } catch { /* not remembered, that is all */ }
}

/** Keep a scale within a sane, always-visible range. */
export function clampScale(s: number): number {
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, s));
}

/** Scale proportionally to how far apart two fingers have moved since the pinch started. */
export function pinchScale(startDistance: number, currentDistance: number, startScale: number): number {
  if (startDistance <= 0) return startScale;
  return clampScale(startScale * (currentDistance / startDistance));
}
