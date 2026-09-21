import { describe, expect, it } from 'vitest';
import { backoffDelay } from './backoff';

describe('backoffDelay', () => {
  it('doubles from 1 s and caps at 15 s', () => {
    expect([0, 1, 2, 3, 4, 5, 9].map((n) => backoffDelay(n))).toEqual([1000, 2000, 4000, 8000, 15000, 15000, 15000]);
  });
});
