import { useCallback, useEffect, useState } from 'react';
import { useWebSocket } from '@/context/websocket-context';
import { groupAvatars, type ApiCharacter, type AvatarGroup } from './logic/gallery-logic';

export function useCharacters(): { groups: AvatarGroup[]; state: 'loading' | 'ready' | 'error'; reload: () => void } {
  const { baseUrl } = useWebSocket();
  const [groups, setGroups] = useState<AvatarGroup[]>([]);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const ctl = new AbortController();
    setState('loading');
    fetch(`${baseUrl}/api/companion/characters`, { signal: ctl.signal })
      .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then((body: { characters?: ApiCharacter[] }) => { setGroups(groupAvatars(body.characters ?? [])); setState('ready'); })
      .catch((err) => { if (err?.name !== 'AbortError') { console.error('characters:', err); setState('error'); } });
    return () => ctl.abort();
  }, [baseUrl, attempt]);

  const reload = useCallback(() => setAttempt((n) => n + 1), []);
  return { groups, state, reload };
}
