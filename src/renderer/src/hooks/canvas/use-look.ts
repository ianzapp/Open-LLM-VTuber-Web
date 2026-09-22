/* eslint-disable no-underscore-dangle */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLive2DConfig, type LooksCatalogue } from '@/context/live2d-config-context';
import {
  applyLookTag, composeLook, defaultLookState, loadLook, sanitizeLook, saveLook,
  type ComposedValue, type LookState,
} from '@/engine/look-composer';

const ALLOW_KEY = 'companion.lookByHer';
const READY_POLL_MS = 250;
const READY_GIVE_UP_MS = 20_000;

// Framework ExpressionBlendType: Additive = 0, Multiply = 1, Overwrite = 2 (see
// WebSDK/Framework/src/motion/cubismexpressionmotion.ts).
const BLEND_BY_TYPE: Record<number, 'Add' | 'Multiply' | 'Overwrite'> = {
  0: 'Add',
  1: 'Multiply',
  2: 'Overwrite',
};

/** Reads the parameter map of one of the loaded model's own expressions. */
function readExpressionParams(name: string): Record<string, ComposedValue> | null {
  try {
    const model = (window as any).getLAppAdapter?.()?.getModel();
    const motion = model?._expressions?.getValue?.(name);
    if (!motion) return null;
    const list = motion.getExpressionParameters?.() ?? motion._parameters;
    if (!list) return null;
    const out: Record<string, ComposedValue> = {};
    for (let i = 0; i < list.getSize(); i += 1) {
      const p = list.at(i);
      const id = p?.parameterId?.getString?.().s;
      if (typeof id !== 'string' || !id) continue;
      const blend = BLEND_BY_TYPE[p.blendType] ?? 'Add';
      out[id] = blend === 'Add' ? p.value : { value: p.value, blend };
    }
    return Object.keys(out).length ? out : null;
  } catch (error) {
    console.warn('look: could not read expression', name, error);
    return null;
  }
}

export function useLookState() {
  const { modelInfo } = useLive2DConfig();
  const model = modelInfo?.name ?? '';
  const catalogue: LooksCatalogue | null = modelInfo?.looks ?? null;

  const [state, setState] = useState<LookState>(() => defaultLookState(catalogue));
  const [emotion, setEmotion] = useState<string | null>(null);
  const [allowHerChanges, setAllow] = useState<boolean>(() => {
    try { return window.localStorage.getItem(ALLOW_KEY) !== 'off'; } catch { return true; }
  });
  const [ready, setReady] = useState(0); // bumped when a model finishes loading

  // Load the stored look whenever the model changes.
  useEffect(() => {
    if (!model) return;
    const stored = loadLook(window.localStorage, model);
    setState(stored ? sanitizeLook(stored, catalogue) : defaultLookState(catalogue));
    setEmotion(null);
  }, [model, catalogue]);

  // The canvas loads the model asynchronously; its expressions only exist afterwards.
  useEffect(() => {
    let cancelled = false;
    const started = Date.now();
    const tick = () => {
      if (cancelled) return;
      const loaded = !!(window as any).getLAppAdapter?.()?.getModel()?._expressions?.getSize?.();
      if (loaded) { setReady((n) => n + 1); return; }
      if (Date.now() - started > READY_GIVE_UP_MS) return;
      window.setTimeout(tick, READY_POLL_MS);
    };
    tick();
    return () => { cancelled = true; };
  }, [modelInfo?.url]);

  // Recompose and replay on every change.
  useEffect(() => {
    const adapter = (window as any).getLAppAdapter?.();
    if (!adapter?.setComposedExpression) return;
    try {
      adapter.setComposedExpression(composeLook(catalogue, state, emotion, readExpressionParams));
    } catch (error) {
      console.warn('look: could not apply the composed expression', error);
    }
  }, [catalogue, state, emotion, ready]);

  const write = useCallback((next: LookState) => {
    setState(next);
    if (model) saveLook(window.localStorage, model, next);
  }, [model]);

  const setAllowHerChanges = useCallback((on: boolean) => {
    setAllow(on);
    try { window.localStorage.setItem(ALLOW_KEY, on ? 'on' : 'off'); } catch { /* not remembered */ }
  }, []);

  const allowRef = useRef(allowHerChanges);
  allowRef.current = allowHerChanges;
  const stateRef = useRef(state);
  stateRef.current = state;

  const applyTag = useCallback((sectionName: string, id: string) => {
    const next = applyLookTag(stateRef.current, catalogue, sectionName, id, allowRef.current);
    if (next !== stateRef.current) write(next);
  }, [catalogue, write]);

  return useMemo(() => ({
    catalogue,
    state,
    setPose: (id: string | null) => write({ ...stateRef.current, pose: id }),
    setHand: (id: string | null) => write({ ...stateRef.current, hand: id }),
    setColour: (id: string | null) => write({ ...stateRef.current, colour: id }),
    toggleAccessory: (id: string) => write(applyLookTag(stateRef.current, catalogue, 'accessories', id, true)),
    toggleEffect: (id: string) => write(applyLookTag(stateRef.current, catalogue, 'effects', id, true)),
    reset: () => write(defaultLookState(catalogue)),
    setEmotion,
    applyTag,
    allowHerChanges,
    setAllowHerChanges,
  }), [catalogue, state, write, applyTag, allowHerChanges, setAllowHerChanges]);
}

export type LookApi = ReturnType<typeof useLookState>;
