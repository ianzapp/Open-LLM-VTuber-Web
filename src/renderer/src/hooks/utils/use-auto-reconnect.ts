import { useEffect, useRef } from 'react';
import { useWebSocket } from '@/context/websocket-context';
import { backoffDelay } from '@/utils/backoff';

/** Reconnects with backoff while the socket is closed; retries at once when the tab returns. */
export function useAutoReconnect(enabled: boolean): void {
  const { wsState, reconnect } = useWebSocket();
  const attempt = useRef(0);

  useEffect(() => {
    if (!enabled) return undefined;
    if (wsState === 'OPEN') { attempt.current = 0; return undefined; }
    if (wsState !== 'CLOSED') return undefined;
    const timer = window.setTimeout(() => { attempt.current += 1; reconnect(); }, backoffDelay(attempt.current));
    return () => window.clearTimeout(timer);
  }, [enabled, wsState, reconnect]);

  useEffect(() => {
    if (!enabled) return undefined;
    const onVisible = () => {
      if (document.visibilityState === 'visible' && wsState === 'CLOSED') { attempt.current = 0; reconnect(); }
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [enabled, wsState, reconnect]);
}
