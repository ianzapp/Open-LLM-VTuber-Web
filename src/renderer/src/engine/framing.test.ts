import { describe, expect, it } from 'vitest';
import { clampScale, loadFraming, pinchScale, saveFraming, type Framing } from './framing';

const store = () => {
  const d: Record<string, string> = {};
  return { getItem: (k: string) => d[k] ?? null, setItem: (k: string, v: string) => { d[k] = v; } };
};

describe('loadFraming / saveFraming', () => {
  it('round-trips a saved framing', () => {
    const s = store();
    const framing: Framing = { x: 12.5, y: -3.25, scale: 1.4, userSized: true };
    saveFraming(s, 'beach', framing);
    expect(loadFraming(s, 'beach')).toEqual(framing);
  });

  it('returns null when nothing was saved', () => {
    expect(loadFraming(store(), 'beach')).toBeNull();
  });

  it('defaults userSized to false for a value stored before that field existed', () => {
    const s = store();
    s.setItem('companion.framing.beach', JSON.stringify({ x: 1, y: 2, scale: 1.5 }));
    expect(loadFraming(s, 'beach')).toEqual({ x: 1, y: 2, scale: 1.5, userSized: false });
  });

  it('returns null for malformed JSON', () => {
    const s = store();
    s.setItem('companion.framing.beach', '{not json');
    expect(loadFraming(s, 'beach')).toBeNull();
  });

  it('drops a stored value with a non-finite field', () => {
    const s = store();
    s.setItem('companion.framing.beach', JSON.stringify({ x: NaN, y: 1, scale: 1 }));
    expect(loadFraming(s, 'beach')).toBeNull();
    s.setItem('companion.framing.beach', JSON.stringify({ x: 1, y: Infinity, scale: 1 }));
    expect(loadFraming(s, 'beach')).toBeNull();
  });

  it('does not throw when storage is blocked', () => {
    const blocked = {
      getItem: () => { throw new Error('blocked'); },
      setItem: () => { throw new Error('blocked'); },
    };
    expect(() => saveFraming(blocked, 'beach', { x: 0, y: 0, scale: 1, userSized: false })).not.toThrow();
    expect(loadFraming(blocked, 'beach')).toBeNull();
  });
});

describe('clampScale', () => {
  it('clamps below the minimum', () => {
    expect(clampScale(0.1)).toBe(0.4);
  });
  it('clamps above the maximum', () => {
    expect(clampScale(10)).toBe(3);
  });
  it('leaves an in-range value untouched', () => {
    expect(clampScale(1.2)).toBe(1.2);
  });
});

describe('pinchScale', () => {
  it('doubling the distance doubles the scale', () => {
    expect(pinchScale(100, 200, 1)).toBe(2);
  });
  it('clamps the doubled scale at the maximum', () => {
    expect(pinchScale(100, 200, 2)).toBe(3);
  });
  it('returns the start scale when startDistance is zero or negative', () => {
    expect(pinchScale(0, 200, 1.5)).toBe(1.5);
    expect(pinchScale(-5, 200, 1.5)).toBe(1.5);
  });
});
