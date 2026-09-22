import { describe, expect, it } from 'vitest';
import {
  deriveFromBase,
  negativeThresholdFor,
  sensitivityToThreshold,
  thresholdToSensitivity,
} from './settings-logic';

describe('deriveFromBase', () => {
  it('derives a secure pair from an https host with no port', () => {
    expect(deriveFromBase('https://box.tail1.ts.net')).toEqual({
      baseUrl: 'https://box.tail1.ts.net',
      wsUrl: 'wss://box.tail1.ts.net/client-ws',
    });
  });

  it('derives an insecure pair from an http host and port, trimming the trailing slash', () => {
    expect(deriveFromBase('http://192.0.2.10:12393/')).toEqual({
      baseUrl: 'http://192.0.2.10:12393',
      wsUrl: 'ws://192.0.2.10:12393/client-ws',
    });
  });

  it('strips a path from the input', () => {
    expect(deriveFromBase('http://192.0.2.10:12393/some/path')).toEqual({
      baseUrl: 'http://192.0.2.10:12393',
      wsUrl: 'ws://192.0.2.10:12393/client-ws',
    });
  });

  it('trims surrounding whitespace', () => {
    expect(deriveFromBase('  https://box.tail1.ts.net  ')).toEqual({
      baseUrl: 'https://box.tail1.ts.net',
      wsUrl: 'wss://box.tail1.ts.net/client-ws',
    });
  });

  it('rejects an empty string', () => {
    expect(deriveFromBase('')).toBeNull();
  });

  it('rejects a value with no scheme', () => {
    expect(deriveFromBase('notaurl')).toBeNull();
  });

  it('rejects a non-http(s) scheme', () => {
    expect(deriveFromBase('ftp://box.tail1.ts.net')).toBeNull();
  });

  it('rejects garbage input', () => {
    expect(deriveFromBase('http://')).toBeNull();
  });
});

describe('sensitivityToThreshold / thresholdToSensitivity', () => {
  it('maps the five steps onto the engine scale, 1 = most sensitive', () => {
    expect(sensitivityToThreshold(1)).toBe(20);
    expect(sensitivityToThreshold(2)).toBe(35);
    expect(sensitivityToThreshold(3)).toBe(50);
    expect(sensitivityToThreshold(4)).toBe(65);
    expect(sensitivityToThreshold(5)).toBe(80);
  });

  it('maps the engine default (50) back to step 3', () => {
    expect(thresholdToSensitivity(50)).toBe(3);
  });

  it('rounds an arbitrary threshold to the nearest step', () => {
    expect(thresholdToSensitivity(0)).toBe(1);
    expect(thresholdToSensitivity(100)).toBe(5);
    expect(thresholdToSensitivity(40)).toBe(2);
    expect(thresholdToSensitivity(55)).toBe(3);
    expect(thresholdToSensitivity(60)).toBe(4);
  });
});

describe('negativeThresholdFor', () => {
  it('keeps the engine default gap of 15 below the positive threshold', () => {
    expect(negativeThresholdFor(50)).toBe(35);
  });

  it('clamps to zero rather than going negative', () => {
    expect(negativeThresholdFor(10)).toBe(0);
  });
});
