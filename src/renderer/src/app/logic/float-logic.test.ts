import { describe, expect, it } from 'vitest';
import { floatingBubbles, FLOAT_TTL_MS, FLOAT_FADE_MS } from './float-logic';

const NOW = Date.parse('2026-09-21T12:00:00.000Z');
const at = (msAgo: number) => new Date(NOW - msAgo).toISOString();
const strip = (s: string) => s.replace(/\[[a-z]+\]/g, '').trim();
const msg = (id: string, role: 'ai' | 'human', content: string, msAgo: number, type?: string) =>
  ({ id, role, content, timestamp: at(msAgo), type });

describe('floatingBubbles', () => {
  it('shows fresh messages, newest last, tags stripped', () => {
    const out = floatingBubbles([msg('1', 'human', 'hi', 2000), msg('2', 'ai', '[joy] Hey!', 500)], NOW, false, strip);
    expect(out).toEqual([
      { id: '1', role: 'human', text: 'hi', fading: false },
      { id: '2', role: 'ai', text: 'Hey!', fading: false },
    ]);
  });
  it('drops messages older than the TTL and marks the last stretch as fading', () => {
    const out = floatingBubbles(
      [msg('1', 'human', 'old', FLOAT_TTL_MS + 1), msg('2', 'ai', 'going', FLOAT_TTL_MS - FLOAT_FADE_MS + 1)], NOW, false, strip,
    );
    expect(out).toEqual([{ id: '2', role: 'ai', text: 'going', fading: true }]);
  });
  it('never shows a stored conversation that was just loaded', () => {
    expect(floatingBubbles([msg('1', 'human', 'yesterday', 86_400_000), msg('2', 'ai', 'reply', 86_399_000)], NOW, false, strip)).toEqual([]);
    expect(floatingBubbles([msg('1', 'human', 'yesterday', 86_400_000), msg('2', 'ai', 'reply', 86_399_000)], NOW, true, strip)).toEqual([]);
  });
  it('keeps the current turn on screen while she is speaking, however long she talks', () => {
    const out = floatingBubbles([msg('1', 'human', 'tell me a story', 40_000), msg('2', 'ai', 'Once upon a time', 20_000)], NOW, true, strip);
    expect(out.map((b) => [b.id, b.fading])).toEqual([['1', false], ['2', false]]);
  });
  it('shows at most three and skips tool rows and empty text', () => {
    const out = floatingBubbles(
      [msg('1', 'human', 'a', 900), msg('2', 'ai', 'b', 800), msg('t', 'ai', 'x', 700, 'tool_call_status'),
        msg('3', 'human', 'c', 600), msg('4', 'ai', '[joy]', 500), msg('5', 'ai', 'd', 400)], NOW, false, strip,
    );
    expect(out.map((b) => b.id)).toEqual(['2', '3', '5']);
  });
  it('ignores unreadable timestamps', () => {
    expect(floatingBubbles([{ id: '1', role: 'ai', content: 'x', timestamp: 'nope' }], NOW, false, strip)).toEqual([]);
  });
});
