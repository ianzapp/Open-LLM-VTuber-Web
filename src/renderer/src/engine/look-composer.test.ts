import { describe, expect, it } from 'vitest';
import {
  applyLookTag, composeLook, defaultLookState, loadLook, loadScene, sanitizeLook, saveLook, saveScene,
  type ComposedValue, type LooksCatalogue, type LookState,
} from './look-composer';

const beach: LooksCatalogue = {
  poses: [
    { id: 'none', label: 'None', default: true },
    { id: 'legs_1', label: 'Legs 1', expr: 'N1' },
    { id: 'legs_2', label: 'Legs 2', expr: 'N2' },
  ],
  hands: [
    { id: 'none', label: 'None', default: true },
    { id: 'hand_1', label: 'Hand 1', expr: 'N5' },
  ],
  accessories: [
    { id: 'cocktail', label: 'Cocktail', expr: 'T' },
    { id: 'tails', label: 'Tails', expr: 'Y', inverted: true, default: true },
  ],
  colours: [
    { id: 'snow', label: 'Snow', default: true },
    { id: 'forest', label: 'Forest', expr: '11111111' },
  ],
};

const mao: LooksCatalogue = {
  effects: [
    { id: 'aura', label: 'Aura', params: { ParamAuraOn: 1, ParamAura: 30 } },
    { id: 'ink', label: 'Ink', params: { ParamWandInk: 1 } },
  ],
};

const EXPR: Record<string, Record<string, ComposedValue>> = {
  N1: { ParamLeg1: 1 },
  N2: { ParamLeg2: 1 },
  N5: { ParamHand1: 1 },
  T: { ParamCocktail: 1 },
  Y: { ParamTails: 1 },
  '11111111': { Param78: 0.92, Param79: 7 },
  F1: { ParamHeart: 1, Param79: 3 },
  MULT: { ParamEyeLOpen: { value: 0, blend: 'Multiply' } },
};
const look = (name: string) => EXPR[name] ?? null;

const store = () => {
  const d: Record<string, string> = {};
  return { getItem: (k: string) => d[k] ?? null, setItem: (k: string, v: string) => { d[k] = v; } };
};

describe('defaultLookState', () => {
  it('takes the default entry of each single-choice section and every default toggle', () => {
    expect(defaultLookState(beach)).toEqual({
      pose: 'none', hand: 'none', colour: 'snow', accessories: ['tails'], effects: [],
    });
  });
  it('is all-empty for a model without a catalogue', () => {
    expect(defaultLookState(null)).toEqual({ pose: null, hand: null, colour: null, accessories: [], effects: [] });
  });
});

describe('composeLook', () => {
  it('shows nothing extra in the default state (tails are inverted: on means do not apply Y)', () => {
    expect(composeLook(beach, defaultLookState(beach), null, look)).toEqual({});
  });
  it('applies the inverted entry when the toggle is OFF', () => {
    const state: LookState = { ...defaultLookState(beach), accessories: [] };
    expect(composeLook(beach, state, null, look)).toEqual({ ParamTails: 1 });
  });
  it('contributes the chosen pose and hand', () => {
    const state: LookState = { ...defaultLookState(beach), pose: 'legs_1', hand: 'hand_1' };
    expect(composeLook(beach, state, null, look)).toEqual({ ParamLeg1: 1, ParamHand1: 1 });
  });
  it('replaces the previous pose rather than adding to it', () => {
    const state: LookState = { ...defaultLookState(beach), pose: 'legs_2' };
    expect(composeLook(beach, state, null, look)).toEqual({ ParamLeg2: 1 });
  });
  it('contributes the chosen colour', () => {
    const state: LookState = { ...defaultLookState(beach), colour: 'forest' };
    expect(composeLook(beach, state, null, look)).toEqual({ Param78: 0.92, Param79: 7 });
  });
  it('adds every active toggle alongside the single choices', () => {
    const state: LookState = { pose: 'legs_1', hand: null, colour: null, accessories: ['cocktail'], effects: [] };
    expect(composeLook(beach, state, null, look)).toEqual({ ParamLeg1: 1, ParamCocktail: 1, ParamTails: 1 });
  });
  it('sums an Add emotion contribution with an Add look contribution on the same id', () => {
    const state: LookState = { ...defaultLookState(beach), colour: 'forest' };
    expect(composeLook(beach, state, 'F1', look)).toEqual({ Param78: 0.92, Param79: 10, ParamHeart: 1 });
  });
  it('sums an Add pose contribution and an Add emotion contribution on the same id', () => {
    const state: LookState = { ...defaultLookState(beach), pose: 'legs_1' };
    const localLook = (name: string) => (name === 'F3' ? { ParamLeg1: 1 } : look(name));
    expect(composeLook(beach, state, 'F3', localLook)).toEqual({ ParamLeg1: 2 });
  });
  it('returns an emotion param with a Multiply blend as that object', () => {
    expect(composeLook(null, defaultLookState(null), 'MULT', look)).toEqual({
      ParamEyeLOpen: { value: 0, blend: 'Multiply' },
    });
  });
  it('a Multiply emotion on an id a pose also touches replaces the pose\'s number', () => {
    const state: LookState = { ...defaultLookState(beach), pose: 'legs_1' };
    const localLook = (name: string) => (name === 'F2' ? { ParamLeg1: { value: 0, blend: 'Multiply' as const } } : look(name));
    expect(composeLook(beach, state, 'F2', localLook)).toEqual({ ParamLeg1: { value: 0, blend: 'Multiply' } });
  });
  it('ignores unknown ids and a null emotion', () => {
    const state: LookState = { pose: 'nope', hand: 'nope', colour: 'nope', accessories: ['nope'], effects: ['nope'] };
    expect(composeLook(beach, state, null, look)).toEqual({ ParamTails: 1 });
  });
  it('skips an entry whose expression the model does not have, keeping the rest', () => {
    const broken: LooksCatalogue = { poses: [{ id: 'ghost', label: 'Ghost', expr: 'NOPE' }, ...beach.poses!] };
    const state: LookState = { pose: 'ghost', hand: null, colour: null, accessories: [], effects: [] };
    expect(composeLook(broken, state, 'F1', look)).toEqual({ ParamHeart: 1, Param79: 3 });
  });
  it('takes raw parameter maps for effects and merges several of them', () => {
    const state: LookState = { pose: null, hand: null, colour: null, accessories: [], effects: ['aura', 'ink'] };
    expect(composeLook(mao, state, null, look)).toEqual({ ParamAuraOn: 1, ParamAura: 30, ParamWandInk: 1 });
  });
  it('returns an empty map for a model with no catalogue and no emotion', () => {
    expect(composeLook(null, defaultLookState(null), null, look)).toEqual({});
  });
  it('still shows the emotion for a model with no catalogue', () => {
    expect(composeLook(null, defaultLookState(null), 'F1', look)).toEqual({ ParamHeart: 1, Param79: 3 });
  });
});

describe('applyLookTag', () => {
  const base = defaultLookState(beach);
  it('sets a single-choice section', () => {
    expect(applyLookTag(base, beach, 'poses', 'legs_1', true).pose).toBe('legs_1');
  });
  it('toggles an accessory on and off again', () => {
    const on = applyLookTag(base, beach, 'accessories', 'cocktail', true);
    expect(on.accessories).toEqual(['tails', 'cocktail']);
    expect(applyLookTag(on, beach, 'accessories', 'cocktail', true).accessories).toEqual(['tails']);
  });
  it('refuses when she is not allowed to change her look', () => {
    expect(applyLookTag(base, beach, 'poses', 'legs_1', false)).toBe(base);
  });
  it('refuses colours and unknown sections and unknown ids', () => {
    expect(applyLookTag(base, beach, 'colours', 'forest', true)).toBe(base);
    expect(applyLookTag(base, beach, 'nonsense', 'legs_1', true)).toBe(base);
    expect(applyLookTag(base, beach, 'poses', 'nope', true)).toBe(base);
  });
});

describe('sanitizeLook', () => {
  it('drops ids the catalogue no longer has and keeps the rest', () => {
    const stored: LookState = { pose: 'gone', hand: 'hand_1', colour: 'gone', accessories: ['tails', 'gone'], effects: ['gone'] };
    expect(sanitizeLook(stored, beach)).toEqual({ pose: null, hand: 'hand_1', colour: null, accessories: ['tails'], effects: [] });
  });
  it('falls back to the empty state for junk', () => {
    expect(sanitizeLook(null as never, beach)).toEqual(defaultLookState(beach));
  });
});

describe('storage', () => {
  it('round-trips the look and the scene per model, and survives blocked storage', () => {
    const s = store();
    expect(loadLook(s, 'beach')).toBeNull();
    const state: LookState = { ...defaultLookState(beach), pose: 'legs_1' };
    saveLook(s, 'beach', state);
    expect(loadLook(s, 'beach')).toEqual(state);
    expect(loadLook(s, 'mao_pro')).toBeNull();

    expect(loadScene(s, 'beach')).toBeNull();
    saveScene(s, 'beach', 'http://box.tail1.ts.net:12393/bg/sea.jpg');
    expect(loadScene(s, 'beach')).toBe('http://box.tail1.ts.net:12393/bg/sea.jpg');

    const broken = {
      getItem: () => { throw new Error('no'); },
      setItem: () => { throw new Error('no'); },
    };
    expect(loadLook(broken, 'beach')).toBeNull();
    expect(loadScene(broken, 'beach')).toBeNull();
    expect(() => saveLook(broken, 'beach', state)).not.toThrow();
    expect(() => saveScene(broken, 'beach', '')).not.toThrow();
  });
  it('treats unparseable stored JSON as nothing stored', () => {
    const s = store();
    s.setItem('companion.look.beach', '{not json');
    expect(loadLook(s, 'beach')).toBeNull();
  });
});
