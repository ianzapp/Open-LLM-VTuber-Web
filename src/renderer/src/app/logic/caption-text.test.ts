import { describe, expect, it } from 'vitest';
import { stripCaptionTags } from './caption-text';

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
