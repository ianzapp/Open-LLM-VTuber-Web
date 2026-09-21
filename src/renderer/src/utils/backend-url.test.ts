import { describe, expect, it } from 'vitest';
import { deriveBackendUrls, migrateStoredUrl } from './backend-url';

const fakeStorage = (initial: Record<string, string>) => {
  const data = { ...initial };
  return {
    data,
    getItem: (k: string) => (k in data ? data[k] : null),
    setItem: (k: string, v: string) => { data[k] = v; },
  };
};

describe('deriveBackendUrls', () => {
  it('uses the page host over plain http', () => {
    expect(deriveBackendUrls({ protocol: 'http:', host: '192.168.1.50:12393' })).toEqual({
      wsUrl: 'ws://192.168.1.50:12393/client-ws',
      baseUrl: 'http://192.168.1.50:12393',
    });
  });

  it('uses wss on https pages', () => {
    expect(deriveBackendUrls({ protocol: 'https:', host: 'box.tail1.ts.net' })).toEqual({
      wsUrl: 'wss://box.tail1.ts.net/client-ws',
      baseUrl: 'https://box.tail1.ts.net',
    });
  });

  it('keeps the legacy loopback default under Electron (file:)', () => {
    expect(deriveBackendUrls({ protocol: 'file:', host: '' })).toEqual({
      wsUrl: 'ws://127.0.0.1:12393/client-ws',
      baseUrl: 'http://127.0.0.1:12393',
    });
  });

  it('prefers an explicit dev origin', () => {
    expect(
      deriveBackendUrls({ protocol: 'http:', host: 'localhost:3000' }, 'http://localhost:12393'),
    ).toEqual({ wsUrl: 'ws://localhost:12393/client-ws', baseUrl: 'http://localhost:12393' });
  });
});

describe('migrateStoredUrl', () => {
  it('replaces a stale loopback value when the page is remote', () => {
    const s = fakeStorage({ wsUrl: JSON.stringify('ws://127.0.0.1:12393/client-ws') });
    migrateStoredUrl(s, 'wsUrl', 'wss://box.tail1.ts.net/client-ws');
    expect(JSON.parse(s.data.wsUrl)).toBe('wss://box.tail1.ts.net/client-ws');
  });

  it('replaces an insecure value on a secure page', () => {
    const s = fakeStorage({ baseUrl: JSON.stringify('http://192.168.1.50:12393') });
    migrateStoredUrl(s, 'baseUrl', 'https://box.tail1.ts.net');
    expect(JSON.parse(s.data.baseUrl)).toBe('https://box.tail1.ts.net');
  });

  it('leaves a custom value alone when the page itself is loopback', () => {
    const s = fakeStorage({ wsUrl: JSON.stringify('ws://127.0.0.1:9999/client-ws') });
    migrateStoredUrl(s, 'wsUrl', 'ws://localhost:12393/client-ws');
    expect(JSON.parse(s.data.wsUrl)).toBe('ws://127.0.0.1:9999/client-ws');
  });

  it('ignores missing or corrupt entries', () => {
    const s = fakeStorage({ wsUrl: '{not json' });
    migrateStoredUrl(s, 'wsUrl', 'ws://a/client-ws');
    migrateStoredUrl(s, 'baseUrl', 'http://a');
    expect(s.data).toEqual({ wsUrl: '{not json' });
  });
});
