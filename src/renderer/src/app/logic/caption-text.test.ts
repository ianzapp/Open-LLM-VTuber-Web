import { describe, expect, it } from 'vitest';
import { isFreshMessage, stripCaptionTags } from './caption-text';

describe('stripCaptionTags', () => {
  it('removes emotion and sfx tags', () => {
    expect(stripCaptionTags("Hello there, it's so nice![joy] To see you again.[neutral]"))
      .toBe("Hello there, it's so nice! To see you again.");
    expect(stripCaptionTags('[sfx:giggle] You again?')).toBe('You again?');
  });
  it('keeps ordinary brackets with spaces or punctuation inside', () => {
    expect(stripCaptionTags('See [the docs, page 2] first')).toBe('See [the docs, page 2] first');
  });
  it('collapses leftover whitespace', () => {
    expect(stripCaptionTags('Well [smirk]  okay')).toBe('Well okay');
  });
  it('handles empty and tag-only input', () => {
    expect(stripCaptionTags('')).toBe('');
    expect(stripCaptionTags('[joy]')).toBe('');
  });
});

describe('isFreshMessage', () => {
  const now = Date.parse('2026-09-21T18:00:00.000Z');
  it('accepts a message created a moment ago', () => {
    expect(isFreshMessage('2026-09-21T17:59:58.500Z', now)).toBe(true);
  });
  it('rejects a message from a stored conversation', () => {
    expect(isFreshMessage('2026-09-21T17:59:00.000Z', now)).toBe(false);
    expect(isFreshMessage('2026-08-21T12:49:08', now)).toBe(false);
  });
  it('rejects missing or unparseable timestamps', () => {
    expect(isFreshMessage(undefined, now)).toBe(false);
    expect(isFreshMessage('', now)).toBe(false);
    expect(isFreshMessage('not a date', now)).toBe(false);
  });
  it('tolerates a small clock skew but not a far-future stamp', () => {
    expect(isFreshMessage('2026-09-21T18:00:01.000Z', now)).toBe(true);
    expect(isFreshMessage('2026-09-21T18:01:00.000Z', now)).toBe(false);
  });
});
