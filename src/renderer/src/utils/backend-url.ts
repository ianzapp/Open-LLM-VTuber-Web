export interface BackendUrls {
  wsUrl: string;
  baseUrl: string;
}

const LEGACY: BackendUrls = {
  wsUrl: 'ws://127.0.0.1:12393/client-ws',
  baseUrl: 'http://127.0.0.1:12393',
};

const LOOPBACK = /^(wss?|https?):\/\/(127\.0\.0\.1|localhost)(:\d+)?(\/|$)/;
const INSECURE = /^(ws|http):\/\//;
const SECURE = /^(wss|https):\/\//;

const build = (protocol: string, host: string): BackendUrls => ({
  wsUrl: `${protocol === 'https:' ? 'wss' : 'ws'}://${host}/client-ws`,
  baseUrl: `${protocol}//${host}`,
});

/** The server that served this page is the server to talk to. */
export function deriveBackendUrls(
  loc: { protocol: string; host: string },
  envOrigin?: string,
): BackendUrls {
  if (envOrigin) {
    const url = new URL(envOrigin);
    return build(url.protocol, url.host);
  }
  if (loc.protocol !== 'http:' && loc.protocol !== 'https:') return LEGACY;
  return build(loc.protocol, loc.host);
}

/**
 * Settings saved while browsing on the server machine point at loopback and
 * break every other device; insecure URLs are blocked on https pages.
 * Values are JSON-encoded because useLocalStorage stores them that way.
 */
export function migrateStoredUrl(
  storage: Pick<Storage, 'getItem' | 'setItem'>,
  key: string,
  derived: string,
): void {
  try {
    const raw = storage.getItem(key);
    if (!raw) return;
    const stored = JSON.parse(raw);
    if (typeof stored !== 'string' || stored === derived) return;
    const staleLoopback = LOOPBACK.test(stored) && !LOOPBACK.test(derived);
    const mixedContent = INSECURE.test(stored) && SECURE.test(derived);
    if (staleLoopback || mixedContent) storage.setItem(key, JSON.stringify(derived));
  } catch {
    // unreadable storage or corrupt JSON: leave it for useLocalStorage to handle
  }
}
