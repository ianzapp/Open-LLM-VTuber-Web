import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const PUBLIC = path.resolve(__dirname, '../../../public');
const manifest = () => JSON.parse(readFileSync(path.join(PUBLIC, 'manifest.webmanifest'), 'utf8'));

describe('web manifest', () => {
  it('is installable: standalone, named, with relative start_url and scope', () => {
    const m = manifest();
    expect(m.display).toBe('standalone');
    expect(m.name).toBeTruthy();
    expect(m.short_name.length).toBeLessThanOrEqual(12);
    expect(m.start_url).toBe('./');
    expect(m.scope).toBe('./');
    expect(m.background_color).toBe('#090a10');
    expect(m.theme_color).toBe('#090a10');
  });

  it('lists 192 and 512 icons plus a maskable one, all relative and present on disk', () => {
    const icons: Array<{ src: string; sizes: string; type: string; purpose?: string }> = manifest().icons;
    expect(icons.map((i) => i.sizes).sort()).toEqual(['192x192', '512x512', '512x512']);
    expect(icons.some((i) => i.purpose === 'maskable')).toBe(true);
    for (const icon of icons) {
      expect(icon.src.startsWith('./')).toBe(true);
      expect(icon.type).toBe('image/png');
      expect(existsSync(path.join(PUBLIC, icon.src))).toBe(true);
    }
  });

  it('has an apple touch icon on disk', () => {
    expect(existsSync(path.join(PUBLIC, 'icons/apple-touch-icon.png'))).toBe(true);
  });
});
