/* eslint-disable no-underscore-dangle */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLive2DConfig, type LooksCatalogue } from '@/context/live2d-config-context';
import { audioManager } from '@/utils/audio-manager';
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

  // The canvas loads the model asynchronously and swaps it out on model switches;
  // only recompose once the *currently loaded* model is the one `modelInfo.url`
  // refers to and it has finished loading (see LAppAdapter#isModelReady) — otherwise
  // this can fire against the previous model, or too early against the new one.
  useEffect(() => {
    if (!modelInfo?.url) return undefined;
    let cancelled = false;
    const started = Date.now();
    const tick = () => {
      if (cancelled) return;
      const adapter = (window as any).getLAppAdapter?.();
      const ready = !!adapter?.isModelReady?.(modelInfo.url);
      if (ready) { setReady((n) => n + 1); return; }
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

  // Clear facial reaction whenever audio playback is stopped (interrupt, character switch, etc.)
  useEffect(() => {
    audioManager.setOnStopAll(() => setEmotion(null));
    return () => {
      audioManager.setOnStopAll(null);
    };
  }, []);

  const allowRef = useRef(allowHerChanges);
  allowRef.current = allowHerChanges;
  const catalogueRef = useRef(catalogue);
  catalogueRef.current = catalogue;
  const modelRef = useRef(model);
  modelRef.current = model;

  // Functional update: each call derives its result from the *latest* state at the
  // moment it runs, not from a `state`/`catalogue`/`model` value captured by closure.
  // That matters when several tags apply in the same sentence (e.g. `[legs_1] [cocktail]`)
  // — without this, both calls would start from the same stale snapshot and only the
  // last one would stick.
  const write = useCallback((updater: (prev: LookState) => LookState) => {
    setState((prev) => {
      const next = updater(prev);
      if (next !== prev && modelRef.current) saveLook(window.localStorage, modelRef.current, next);
      return next;
    });
  }, []);

  const setAllowHerChanges = useCallback((on: boolean) => {
    setAllow(on);
    try { window.localStorage.setItem(ALLOW_KEY, on ? 'on' : 'off'); } catch { /* not remembered */ }
  }, []);

  const applyTag = useCallback((sectionName: string, id: string) => {
    write((prev) => applyLookTag(prev, catalogueRef.current, sectionName, id, allowRef.current));
  }, [write]);

  return useMemo(() => ({
    catalogue,
    state,
    setPose: (id: string | null) => write((prev) => ({ ...prev, pose: id })),
    setHand: (id: string | null) => write((prev) => ({ ...prev, hand: id })),
    setColour: (id: string | null) => write((prev) => ({ ...prev, colour: id })),
    toggleAccessory: (id: string) => write((prev) => applyLookTag(prev, catalogueRef.current, 'accessories', id, true)),
    toggleEffect: (id: string) => write((prev) => applyLookTag(prev, catalogueRef.current, 'effects', id, true)),
    reset: () => write(() => defaultLookState(catalogueRef.current)),
    setEmotion,
    applyTag,
    allowHerChanges,
    setAllowHerChanges,
  }), [catalogue, state, write, applyTag, allowHerChanges, setAllowHerChanges]);
}

export type LookApi = ReturnType<typeof useLookState>;
