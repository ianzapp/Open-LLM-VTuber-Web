import { useConfig } from '@/context/character-config-context';
import { useWebSocket } from '@/context/websocket-context';

const DOT: Record<string, 'open' | 'connecting' | 'closed'> = {
  OPEN: 'open', CONNECTING: 'connecting', CLOSING: 'closed', CLOSED: 'closed',
};

export function TopStrip(): JSX.Element {
  const { confName } = useConfig();
  const { wsState, reconnect } = useWebSocket();
  const state = DOT[wsState] ?? 'closed';
  return (
    <div className="cm-top" data-testid="top-strip">
      <button
        type="button"
        className="cm-pill cm-island"
        aria-label={state === 'closed' ? 'Reconnect' : 'Connection status'}
        onClick={() => { if (state === 'closed') reconnect(); }}
      >
        <span className="cm-dot" data-state={state} />
        <span>{confName || 'Companion'}</span>
      </button>
    </div>
  );
}
