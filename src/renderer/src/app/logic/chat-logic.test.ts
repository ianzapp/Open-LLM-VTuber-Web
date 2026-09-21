import { describe, expect, it } from 'vitest';
import { isNearBottom, keyboardInset } from './chat-logic';

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
