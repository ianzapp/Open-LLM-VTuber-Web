import { useCallback, useEffect, useRef } from 'react';
import { useConfig } from '@/context/character-config-context';
import { useWebSocket } from '@/context/websocket-context';
import { useSwitchCharacter } from '@/hooks/utils/use-switch-character';
import { notify } from '@/utils/notify';
import { loadLastMood, pickMood, saveLastMood, type AvatarGroup, type Mood } from './logic/gallery-logic';

const GIVE_UP_MS = 15000;

export function useActiveCharacter(group: AvatarGroup | undefined): { current: Mood | undefined; selectMood: (m: Mood) => void } {
  const { confUid } = useConfig();
  const { wsState } = useWebSocket();
  const { switchCharacter } = useSwitchCharacter();
  const requested = useRef<string | null>(null);
  const current = group?.moods.find((m) => m.confUid === confUid);

  // Ask the server for this avatar whenever it is showing someone else (first entry, reconnect).
  useEffect(() => {
    if (!group || wsState !== 'OPEN' || !confUid) return undefined;
    if (current) { requested.current = null; return undefined; }
    const target = pickMood(group, loadLastMood(window.localStorage, group.model));
    let asked = false;
    if (requested.current !== target.filename) {
      requested.current = target.filename;
      switchCharacter(target.filename);
      asked = true;
    }
    // switchCharacter no-ops when the target filename already matches the CURRENT config's
    // filename (see use-switch-character.tsx) even though confUid may still not match this
    // group (e.g. two files sharing a name). Only arm the give-up timer when we actually asked
    // for a switch this run, or a prior run already did (requested.current set) — otherwise
    // there is nothing in flight to time out.
    if (!asked && !requested.current) return undefined;
    console.debug('[companion] waiting for the server to load', target.filename, 'asked this run:', asked);
    const timer = window.setTimeout(() => {
      notify('error', `Could not load ${group.name}`);
      window.location.hash = '#/';
    }, GIVE_UP_MS);
    return () => window.clearTimeout(timer);
  }, [group, wsState, confUid, current, switchCharacter]);

  // A new connection starts on the server default again: forget what was asked of the old one.
  useEffect(() => { if (wsState !== 'OPEN') requested.current = null; }, [wsState]);

  // Save the mood that actually loaded, so re-entering this avatar returns to it.
  useEffect(() => {
    if (group && current) saveLastMood(window.localStorage, group.model, current.filename);
  }, [group, current]);

  const selectMood = useCallback((mood: Mood) => {
    if (!group) return;
    saveLastMood(window.localStorage, group.model, mood.filename);
    if (mood.confUid === confUid) return;
    requested.current = mood.filename;
    switchCharacter(mood.filename);
  }, [group, confUid, switchCharacter]);

  return { current, selectMood };
}
