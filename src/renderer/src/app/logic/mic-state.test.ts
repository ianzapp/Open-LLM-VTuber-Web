import { describe, expect, it } from 'vitest';
import { micVisualState } from './mic-state';

const base = { secure: true, micOn: false, aiState: 'idle', audioPlaying: false };

describe('micVisualState', () => {
  it('is unavailable on an insecure page, whatever else is true', () => {
    expect(micVisualState({ ...base, secure: false, micOn: true })).toBe('unavailable');
  });
  it('is off when the mic is off and she is quiet', () => {
    expect(micVisualState(base)).toBe('off');
  });
  it('is listening when the mic is on', () => {
    expect(micVisualState({ ...base, micOn: true })).toBe('listening');
    expect(micVisualState({ ...base, micOn: true, aiState: 'listening' })).toBe('listening');
  });
  it('is thinking while a reply is being produced but nothing plays yet', () => {
    expect(micVisualState({ ...base, micOn: true, aiState: 'thinking-speaking' })).toBe('thinking');
  });
  it('is speaking while audio plays, mic on or off', () => {
    expect(micVisualState({ ...base, aiState: 'thinking-speaking', audioPlaying: true })).toBe('speaking');
  });
});
