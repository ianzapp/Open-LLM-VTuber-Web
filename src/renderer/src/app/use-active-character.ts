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
  // filename asked of the server for this group on this connection; null = nothing asked yet
  const requested = useRef<string | null>(null);
  // `${filename}|${confUid}` of the last switchCharacter request actually sent to the
  // server, so a quick A→B→A tap sequence re-sends A once B has landed instead of
  // being swallowed by the "ask once per target" guard below.
  const lastSent = useRef<string | null>(null);
  const entryKey = useRef<string | null>(null); // `${group.model}` — a new group starts a new entry
  const current = group?.moods.find((m) => m.confUid === confUid);

  useEffect(() => {
    if (!group || wsState !== 'OPEN' || !confUid) return undefined;
    if (entryKey.current !== group.model) { entryKey.current = group.model; requested.current = null; lastSent.current = null; }
    const target = requested.current
      ? group.moods.find((m) => m.filename === requested.current) ?? pickMood(group, loadLastMood(window.localStorage, group.model))
      : pickMood(group, loadLastMood(window.localStorage, group.model));
    if (current && current.filename === target.filename) return undefined;      // she is who we want
    const sentKey = `${target.filename}|${confUid}`;
    if (lastSent.current !== sentKey) {                                        // ask once per (target, server state)
      lastSent.current = sentKey;
      requested.current = target.filename;
      switchCharacter(target.filename);
    }
    if (current) return undefined;  // a different mood of the same avatar is showing: no give-up, she is usable meanwhile
    const timer = window.setTimeout(() => { notify('error', `Could not load ${group.name}`); window.location.hash = '#/'; }, GIVE_UP_MS);
    return () => window.clearTimeout(timer);
  }, [group, wsState, confUid, current, switchCharacter]);

  useEffect(() => { if (wsState !== 'OPEN') { requested.current = null; lastSent.current = null; } }, [wsState]);

  // Remember only a mood that was asked for (by the entry logic or the user) and has actually loaded.
  useEffect(() => {
    if (group && current && requested.current === current.filename) saveLastMood(window.localStorage, group.model, current.filename);
  }, [group, current]);

  const selectMood = useCallback((mood: Mood) => {
    if (!group) return;
    saveLastMood(window.localStorage, group.model, mood.filename);
    requested.current = mood.filename;
    if (mood.confUid !== confUid) {
      switchCharacter(mood.filename);
      lastSent.current = `${mood.filename}|${confUid}`;
    }
  }, [group, confUid, switchCharacter]);

  return { current, selectMood };
}
