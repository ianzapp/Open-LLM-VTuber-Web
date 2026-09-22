import { useConfig } from '@/context/character-config-context';
import { useWebSocket } from '@/context/websocket-context';
import type { AvatarGroup, Mood } from './logic/gallery-logic';
import { MoodMenu } from './mood-menu';

const DOT: Record<string, 'open' | 'connecting' | 'closed'> = {
  OPEN: 'open', CONNECTING: 'connecting', CLOSING: 'closed', CLOSED: 'closed',
};

interface TopStripProps {
  group?: AvatarGroup;
  current?: Mood;
  onSelectMood: (m: Mood) => void;
}

export function TopStrip({ group, current, onSelectMood }: TopStripProps): JSX.Element {
  const { confName } = useConfig();
  const { wsState, reconnect } = useWebSocket();
  const state = DOT[wsState] ?? 'closed';
  return (
    <div className="cm-top" data-testid="top-strip">
      <button
        type="button"
        className="cm-pill cm-island cm-back"
        aria-label="Back to gallery"
        data-testid="back"
        onClick={() => { window.location.hash = '#/'; }}
      >
        ‹
      </button>
      <button
        type="button"
        className="cm-pill cm-island cm-name-pill"
        aria-label={state === 'closed' ? 'Reconnect' : 'Connection status'}
        onClick={() => { if (state === 'closed') reconnect(); }}
      >
        <span className="cm-dot" data-state={state} />
        <span className="cm-name-text">{group?.name ?? confName ?? 'Companion'}</span>
      </button>
      <MoodMenu group={group} current={current} onSelectMood={onSelectMood} />
    </div>
  );
}
