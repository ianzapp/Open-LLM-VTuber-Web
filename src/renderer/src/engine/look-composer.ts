import type { LookEntry, LooksCatalogue } from '@/context/live2d-config-context';

export type { LookEntry, LooksCatalogue };

/** What she is wearing right now. Single choices hold an id or null; toggles hold ids. */
export interface LookState {
  pose: string | null;
  hand: string | null;
  colour: string | null;
  accessories: string[];
  effects: string[];
}

/** A parameter contribution: a plain number is an implicit 'Add'; an object names its blend mode. */
export type ComposedValue = number | { value: number; blend: 'Add' | 'Multiply' | 'Overwrite' };

/** Reads the parameter map of one of the model's own `.exp3.json` expressions. */
export type ExpressionParams = (name: string) => Record<string, ComposedValue> | null;

const EMPTY: LookState = { pose: null, hand: null, colour: null, accessories: [], effects: [] };

const section = (catalogue: LooksCatalogue | null, name: keyof LooksCatalogue): LookEntry[] => catalogue?.[name] ?? [];
const find = (entries: LookEntry[], id: string | null): LookEntry | undefined => (id === null ? undefined : entries.find((e) => e.id === id));

export function defaultLookState(catalogue: LooksCatalogue | null): LookState {
  const first = (name: keyof LooksCatalogue) => section(catalogue, name).find((e) => e.default)?.id ?? null;
  const toggles = (name: keyof LooksCatalogue) => section(catalogue, name).filter((e) => e.default).map((e) => e.id);
  return {
    pose: first('poses'),
    hand: first('hands'),
    colour: first('colours'),
    accessories: toggles('accessories'),
    effects: toggles('effects'),
  };
}

const paramsOf = (entry: LookEntry | undefined, expressionParams: ExpressionParams): Record<string, ComposedValue> | null => {
  if (!entry) return null;
  if (entry.params) return entry.params;
  if (!entry.expr) return null; // a "None"/"Default" entry contributes nothing
  const found = expressionParams(entry.expr);
  if (!found) console.warn(`look "${entry.id}": the model has no expression "${entry.expr}"`);
  return found;
};

/**
 * Merge every active look and the current facial emotion into one parameter map.
 * The emotion is merged last: when two Add contributions hit the same parameter id
 * they sum, but a Multiply or Overwrite contribution from the emotion replaces
 * whatever was there (the emotion wins on its own parameters).
 */
export function composeLook(
  catalogue: LooksCatalogue | null,
  state: LookState,
  emotionExpr: string | null,
  expressionParams: ExpressionParams,
): Record<string, ComposedValue> {
  const out: Record<string, ComposedValue> = {};
  const add = (params: Record<string, ComposedValue> | null) => {
    if (!params) return;
    Object.entries(params).forEach(([id, val]) => {
      const existing = out[id];
      out[id] = typeof val === 'number' && typeof existing === 'number' ? existing + val : val;
    });
  };

  add(paramsOf(find(section(catalogue, 'poses'), state.pose), expressionParams));
  add(paramsOf(find(section(catalogue, 'hands'), state.hand), expressionParams));
  section(catalogue, 'accessories').forEach((entry) => {
    const on = state.accessories.includes(entry.id);
    if (entry.inverted ? !on : on) add(paramsOf(entry, expressionParams));
  });
  section(catalogue, 'effects').forEach((entry) => {
    const on = state.effects.includes(entry.id);
    if (entry.inverted ? !on : on) add(paramsOf(entry, expressionParams));
  });
  add(paramsOf(find(section(catalogue, 'colours'), state.colour), expressionParams));
  if (emotionExpr) add(expressionParams(emotionExpr));
  return out;
}

const SINGLE: Record<string, 'pose' | 'hand'> = { poses: 'pose', hands: 'hand' };
const TOGGLE: Record<string, 'accessories' | 'effects'> = { accessories: 'accessories', effects: 'effects' };

/**
 * Apply one `[id]` tag she used. Colours are never hers to change, and nothing happens
 * when the user has switched "Let her change her look" off. Unknown tags are ignored.
 * Returns the SAME object when nothing changes, so React can skip the re-render.
 */
export function applyLookTag(
  state: LookState,
  catalogue: LooksCatalogue | null,
  sectionName: string,
  id: string,
  allowed: boolean,
): LookState {
  if (!allowed) return state;
  const key = sectionName as keyof LooksCatalogue;
  if (!(sectionName in SINGLE) && !(sectionName in TOGGLE)) return state;
  if (!find(section(catalogue, key), id)) return state;

  if (sectionName in SINGLE) return { ...state, [SINGLE[sectionName]]: id };
  const field = TOGGLE[sectionName];
  const list = state[field];
  return { ...state, [field]: list.includes(id) ? list.filter((x) => x !== id) : [...list, id] };
}

/** Drop anything the catalogue no longer has (a look stored before the model changed). */
export function sanitizeLook(state: LookState, catalogue: LooksCatalogue | null): LookState {
  if (!state || typeof state !== 'object') return defaultLookState(catalogue);
  const keepOne = (name: keyof LooksCatalogue, id: unknown) => (typeof id === 'string' && find(section(catalogue, name), id) ? id : null);
  const keepMany = (name: keyof LooksCatalogue, ids: unknown) => (Array.isArray(ids) ? ids.filter((id) => typeof id === 'string' && !!find(section(catalogue, name), id)) : []);
  return {
    pose: keepOne('poses', state.pose),
    hand: keepOne('hands', state.hand),
    colour: keepOne('colours', state.colour),
    accessories: keepMany('accessories', state.accessories),
    effects: keepMany('effects', state.effects),
  };
}

type Reader = Pick<Storage, 'getItem'>;
type Writer = Pick<Storage, 'setItem'>;

const lookKey = (model: string) => `companion.look.${model}`;
const sceneKey = (model: string) => `companion.scene.${model}`;

export function loadLook(storage: Reader, model: string): LookState | null {
  try {
    const raw = storage.getItem(lookKey(model));
    return raw ? (JSON.parse(raw) as LookState) : null;
  } catch { return null; }
}
export function saveLook(storage: Writer, model: string, state: LookState): void {
  try { storage.setItem(lookKey(model), JSON.stringify(state)); } catch { /* not remembered, that is all */ }
}
export function loadScene(storage: Reader, model: string): string | null {
  try { return storage.getItem(sceneKey(model)); } catch { return null; }
}
export function saveScene(storage: Writer, model: string, url: string): void {
  try { storage.setItem(sceneKey(model), url); } catch { /* not remembered, that is all */ }
}

export const EMPTY_LOOK: LookState = EMPTY;
