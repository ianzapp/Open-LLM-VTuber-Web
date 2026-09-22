/** Pure helpers for the gallery settings sheet: server address and VAD sensitivity. */

export interface DerivedUrls {
  baseUrl: string;
  wsUrl: string;
}

/**
 * Accepts a base server address (`http(s)://host[:port]`, with an optional
 * trailing slash or path) and derives the paired base + WebSocket URLs.
 * Returns null for anything that is not a valid http(s) origin.
 */
export function deriveFromBase(base: string): DerivedUrls | null {
  const trimmed = base.trim();
  if (!trimmed) return null;

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return null;
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
  if (!url.host) return null;

  const baseUrl = `${url.protocol}//${url.host}`;
  const wsProtocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = `${wsProtocol}//${url.host}/client-ws`;
  return { baseUrl, wsUrl };
}

/** Five-step sensitivity scale: 1 = most sensitive (needs the least clarity), 5 = least. */
const SENSITIVITY_THRESHOLDS: Record<1 | 2 | 3 | 4 | 5, number> = {
  1: 20,
  2: 35,
  3: 50,
  4: 65,
  5: 80,
};

export function sensitivityToThreshold(level: 1 | 2 | 3 | 4 | 5): number {
  return SENSITIVITY_THRESHOLDS[level];
}

export function thresholdToSensitivity(n: number): 1 | 2 | 3 | 4 | 5 {
  const levels: Array<1 | 2 | 3 | 4 | 5> = [1, 2, 3, 4, 5];
  let closest: 1 | 2 | 3 | 4 | 5 = 1;
  let closestDiff = Infinity;
  for (const level of levels) {
    const diff = Math.abs(SENSITIVITY_THRESHOLDS[level] - n);
    if (diff < closestDiff) {
      closestDiff = diff;
      closest = level;
    }
  }
  return closest;
}

/**
 * The engine's default negative threshold sits 15 below the positive one
 * (50 / 35). Keep that gap when the user picks a new positive threshold,
 * clamped so it never goes below zero.
 */
export const NEGATIVE_THRESHOLD_GAP = 15;

export function negativeThresholdFor(positiveSpeechThreshold: number): number {
  return Math.max(0, positiveSpeechThreshold - NEGATIVE_THRESHOLD_GAP);
}
