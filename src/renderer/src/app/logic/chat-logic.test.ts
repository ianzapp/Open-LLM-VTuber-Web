import { describe, expect, it } from 'vitest';
import { isNearBottom, keyboardInset, loadMode, saveMode } from './chat-logic';

const fakeStorage = (initial: Record<string, string> = {}) => {
  const data = { ...initial };
  return { data, getItem: (k: string) => (k in data ? data[k] : null), setItem: (k: string, v: string) => { data[k] = v; } };
};

describe('mode persistence', () => {
  it('defaults to voice', () => {
    expect(loadMode(fakeStorage())).toBe('voice');
    expect(loadMode(fakeStorage({ 'companion.mode': 'nonsense' }))).toBe('voice');
  });
  it('round-trips chat', () => {
    const s = fakeStorage();
    saveMode(s, 'chat');
    expect(loadMode(s)).toBe('chat');
  });
  it('survives storage that throws', () => {
    const broken = { getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('blocked'); } };
    expect(loadMode(broken)).toBe('voice');
    expect(() => saveMode(broken, 'chat')).not.toThrow();
  });
});

describe('isNearBottom', () => {
  it('is true at the bottom and within the slack', () => {
    expect(isNearBottom(600, 400, 1000)).toBe(true);
    expect(isNearBottom(560, 400, 1000)).toBe(true);
  });
  it('is false once the reader has scrolled up', () => {
    expect(isNearBottom(300, 400, 1000)).toBe(false);
  });
  it('is true when the content does not fill the box', () => {
    expect(isNearBottom(0, 400, 200)).toBe(true);
  });
});

describe('keyboardInset', () => {
  it('is 0 with no keyboard', () => {
    expect(keyboardInset(844, 844, 0)).toBe(0);
  });
  it('is the hidden height when the keyboard is up', () => {
    expect(keyboardInset(844, 508, 0)).toBe(336);
  });
  it('accounts for the viewport being pushed up and never goes negative', () => {
    expect(keyboardInset(844, 508, 40)).toBe(296);
    expect(keyboardInset(844, 900, 0)).toBe(0);
  });
});
