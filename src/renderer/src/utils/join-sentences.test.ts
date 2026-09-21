import { describe, expect, it } from 'vitest';
import { joinSentences } from './join-sentences';

describe('joinSentences', () => {
  it('adds a space between two Latin-script sentences', () => {
    expect(joinSentences('for me!', 'I chatted')).toBe('for me! I chatted');
  });
  it('does not double a space that is already there', () => {
    expect(joinSentences('Hi. ', 'There')).toBe('Hi. There');
    expect(joinSentences('Hi.', ' There')).toBe('Hi. There');
  });
  it('handles empty chunks', () => {
    expect(joinSentences('', 'Hello')).toBe('Hello');
    expect(joinSentences('Hello', '')).toBe('Hello');
  });
  it('does not add a space between CJK sentences', () => {
    expect(joinSentences('今日は晴れ。', '散歩した。')).toBe('今日は晴れ。散歩した。');
  });
  it('adds a space after a caption tag', () => {
    expect(joinSentences('[joy]', 'Great!')).toBe('[joy] Great!');
  });
});
