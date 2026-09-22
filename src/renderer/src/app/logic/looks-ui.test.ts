import { describe, expect, it } from 'vitest';
import { chipOn, hasLooksUI, sceneOptions, visibleSections } from './looks-ui';
import type { LooksCatalogue, LookState } from '@/engine/look-composer';

const cat: LooksCatalogue = {
  effects: [{ id: 'aura', label: 'Aura', params: { ParamAuraOn: 1 } }],
  poses: [{ id: 'none', label: 'None', default: true }, { id: 'legs_1', label: 'Legs 1', expr: 'N1' }],
  accessories: [{ id: 'cocktail', label: 'Cocktail', expr: 'T' }, { id: 'tails', label: 'Tails', expr: 'Y', inverted: true, default: true }],
};
const state: LookState = { pose: 'legs_1', hand: null, colour: null, accessories: ['tails'], effects: [] };

describe('visibleSections', () => {
  it('orders the sections the sheet shows and labels them', () => {
    expect(visibleSections(cat)).toEqual([
      { key: 'poses', label: 'Pose', kind: 'single' },
      { key: 'accessories', label: 'Accessories', kind: 'toggle' },
      { key: 'effects', label: 'Effects', kind: 'toggle' },
    ]);
  });
  it('is empty without a catalogue or with only empty sections', () => {
    expect(visibleSections(null)).toEqual([]);
    expect(visibleSections({ poses: [] })).toEqual([]);
  });
});

describe('chipOn', () => {
  it('marks the chosen single-choice entry and every active toggle', () => {
    expect(chipOn(state, 'poses', 'legs_1')).toBe(true);
    expect(chipOn(state, 'poses', 'none')).toBe(false);
    expect(chipOn(state, 'accessories', 'tails')).toBe(true);
    expect(chipOn(state, 'accessories', 'cocktail')).toBe(false);
    expect(chipOn(state, 'colours', 'snow')).toBe(false);
    expect(chipOn(state, 'nonsense', 'x')).toBe(false);
  });
});

describe('sceneOptions', () => {
  const base = 'http://box.tail1.ts.net:12393';
  it('puts None first and builds an absolute url per file', () => {
    expect(sceneOptions(['sea.jpg', 'room night.png'], base)).toEqual([
      { name: 'None', url: '' },
      { name: 'sea.jpg', url: `${base}/bg/sea.jpg` },
      { name: 'room night.png', url: `${base}/bg/room%20night.png` },
    ]);
  });
  it('also takes the object shape the context declares', () => {
    expect(sceneOptions([{ name: 'sea.jpg', url: '/bg/sea.jpg' }] as never, base)).toEqual([
      { name: 'None', url: '' },
      { name: 'sea.jpg', url: `${base}/bg/sea.jpg` },
    ]);
  });
  it('survives an empty list', () => {
    expect(sceneOptions([], base)).toEqual([{ name: 'None', url: '' }]);
  });
});

describe('hasLooksUI', () => {
  it('needs a catalogue section or at least one background', () => {
    expect(hasLooksUI(cat, 0)).toBe(true);
    expect(hasLooksUI(null, 3)).toBe(true);
    expect(hasLooksUI(null, 0)).toBe(false);
    expect(hasLooksUI({ poses: [] }, 0)).toBe(false);
  });
});
