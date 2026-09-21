import { describe, expect, it } from 'vitest';
import { resolveModelPath } from './lappmodelpath';

describe('resolveModelPath', () => {
  it('returns null until a model directory is configured', () => {
    expect(resolveModelPath('', [], [], 0)).toBeNull();
    expect(resolveModelPath('http://h/live2d-models/', ['undefined'], [], 0)).toBeNull();
  });

  it('uses the explicit model file name when present', () => {
    expect(
      resolveModelPath('http://h/live2d-models/', ['shizuku/runtime'], ['shizuku'], 0),
    ).toEqual({ dir: 'http://h/live2d-models/shizuku/runtime/', fileName: 'shizuku.model3.json' });
  });

  it('falls back to the directory name', () => {
    expect(resolveModelPath('/m/', ['mao_pro'], undefined, 0)).toEqual({
      dir: '/m/mao_pro/',
      fileName: 'mao_pro.model3.json',
    });
  });
});
