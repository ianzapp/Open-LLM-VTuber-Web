export type MicVisual = 'unavailable' | 'off' | 'listening' | 'thinking' | 'speaking';

export function micVisualState(input: {
  secure: boolean; micOn: boolean; aiState: string; audioPlaying: boolean;
}): MicVisual {
  if (!input.secure) return 'unavailable';
  if (input.aiState === 'thinking-speaking') return input.audioPlaying ? 'speaking' : 'thinking';
  return input.micOn ? 'listening' : 'off';
}
