/** Pure helpers for the gallery settings sheet: VAD sensitivity. */

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
