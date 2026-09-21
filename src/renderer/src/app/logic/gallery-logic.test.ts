import { describe, expect, it } from 'vitest';
import { groupAvatars, loadLastMood, parseRoute, pickMood, routeFor, saveLastMood, talkedLine, type ApiCharacter } from './gallery-logic';

const c = (over: Partial<ApiCharacter>): ApiCharacter => ({
  filename: 'x.yaml', name: 'x', conf_uid: 'x_001', character_name: 'X', live2d_model_name: 'x',
  avatar: 'x.png', mood_label: 'Default', last_talked: null, snapshot: '', ...over,
});

describe('groupAvatars', () => {
  it('groups by model, drops the conf.yaml twin of a characters/ file, and names the avatar', () => {
    const groups = groupAvatars([
      c({ filename: 'conf.yaml', conf_uid: 'beach_001', live2d_model_name: 'beach', character_name: 'Beach', mood_label: 'Companion', avatar: 'beach.jpg' }),
      c({ filename: 'beach_companion.yaml', conf_uid: 'beach_001', live2d_model_name: 'beach', character_name: 'Beach', mood_label: 'Companion', avatar: 'beach.jpg' }),
      c({ filename: 'beach_sultry.yaml', conf_uid: 'beach_002', live2d_model_name: 'beach', character_name: 'Beach_sultry', mood_label: 'Sultry', avatar: 'beach.jpg' }),
    ]);
    expect(groups).toHaveLength(1);
    expect(groups[0].model).toBe('beach');
    expect(groups[0].name).toBe('Beach');
    expect(groups[0].moods.map((m) => m.filename)).toEqual(['beach_companion.yaml', 'beach_sultry.yaml']);
    expect(groups[0].image).toBe('/avatars/beach.jpg');
  });
  it('keeps conf.yaml when nothing else has its conf_uid', () => {
    const groups = groupAvatars([c({ filename: 'conf.yaml', conf_uid: 'solo_001', live2d_model_name: 'solo' })]);
    expect(groups[0].moods.map((m) => m.filename)).toEqual(['conf.yaml']);
  });
  it('puts the Default mood first and keeps the API order after it', () => {
    const groups = groupAvatars([
      c({ filename: 'a.yaml', conf_uid: 'a', mood_label: 'Calm' }),
      c({ filename: 'b.yaml', conf_uid: 'b', mood_label: 'Default' }),
      c({ filename: 'c.yaml', conf_uid: 'c', mood_label: 'Sassy' }),
    ]);
    expect(groups[0].moods.map((m) => m.label)).toEqual(['Default', 'Calm', 'Sassy']);
  });
  it('sorts avatars by most recently talked-to, never-talked last, and prefers the snapshot image', () => {
    const groups = groupAvatars([
      c({ filename: 'm.yaml', conf_uid: 'm', live2d_model_name: 'mao', character_name: 'Mao', last_talked: null }),
      c({ filename: 's.yaml', conf_uid: 's', live2d_model_name: 'shizuku', character_name: 'Shizuku', last_talked: '2026-09-20T10:00:00' }),
      c({ filename: 'b1.yaml', conf_uid: 'b1', live2d_model_name: 'beach', character_name: 'Beach', last_talked: '2026-09-01T10:00:00', snapshot: '/avatars/snapshots/beach.jpg' }),
      c({ filename: 'b2.yaml', conf_uid: 'b2', live2d_model_name: 'beach', character_name: 'Beach', last_talked: '2026-09-21T10:00:00' }),
    ]);
    expect(groups.map((g) => g.model)).toEqual(['beach', 'shizuku', 'mao']);
    expect(groups[0].image).toBe('/avatars/snapshots/beach.jpg');
    expect(groups[0].lastTalked).toBe(Date.parse('2026-09-21T10:00:00'));
    expect(groups[2].lastTalked).toBeNull();
  });
  it('skips rows without a model and falls back to a title-cased model name', () => {
    const groups = groupAvatars([c({ live2d_model_name: '' }), c({ filename: 'p.yaml', conf_uid: 'p', live2d_model_name: 'mao_pro', character_name: '' })]);
    expect(groups.map((g) => g.name)).toEqual(['Mao Pro']);
  });
  it('has no image when there is neither a snapshot nor an avatar picture', () => {
    expect(groupAvatars([c({ avatar: '' })])[0].image).toBe('');
  });
});

describe('talkedLine', () => {
  const now = Date.parse('2026-09-21T12:00:00');
  it('reads naturally at every distance', () => {
    expect(talkedLine(null, now)).toBe('Not talked yet');
    expect(talkedLine(now - 20_000, now)).toBe('Talked just now');
    expect(talkedLine(now - 5 * 60_000, now)).toBe('Talked 5 min ago');
    expect(talkedLine(now - 3 * 3_600_000, now)).toBe('Talked 3 h ago');
    expect(talkedLine(now - 2 * 86_400_000, now)).toBe('Talked 2 d ago');
    expect(talkedLine(now - 21 * 86_400_000, now)).toBe('Talked 3 w ago');
    expect(talkedLine(now + 60_000, now)).toBe('Talked just now');
  });
});

describe('routes', () => {
  it('parses and builds', () => {
    expect(parseRoute('')).toEqual({ screen: 'gallery' });
    expect(parseRoute('#/')).toEqual({ screen: 'gallery' });
    expect(parseRoute('#/c/mao_pro')).toEqual({ screen: 'companion', model: 'mao_pro' });
    expect(parseRoute('#/c/my%20model')).toEqual({ screen: 'companion', model: 'my model' });
    expect(parseRoute('#/c/')).toEqual({ screen: 'gallery' });
    expect(parseRoute('#/nonsense')).toEqual({ screen: 'gallery' });
    expect(routeFor('my model')).toBe('#/c/my%20model');
  });
});

describe('last-used mood', () => {
  const group = groupAvatars([
    c({ filename: 'a.yaml', conf_uid: 'a', mood_label: 'Default' }),
    c({ filename: 'b.yaml', conf_uid: 'b', mood_label: 'Calm' }),
  ])[0];
  const store = () => { const d: Record<string, string> = {}; return { getItem: (k: string) => d[k] ?? null, setItem: (k: string, v: string) => { d[k] = v; } }; };
  it('round-trips per model and falls back to the first mood', () => {
    const s = store();
    expect(pickMood(group, loadLastMood(s, 'x')).filename).toBe('a.yaml');
    saveLastMood(s, 'x', 'b.yaml');
    expect(pickMood(group, loadLastMood(s, 'x')).filename).toBe('b.yaml');
    expect(pickMood(group, 'deleted.yaml').filename).toBe('a.yaml');
    expect(loadLastMood(s, 'other')).toBeNull();
  });
  it('survives blocked storage', () => {
    const broken = { getItem: () => { throw new Error('no'); }, setItem: () => { throw new Error('no'); } };
    expect(loadLastMood(broken, 'x')).toBeNull();
    expect(() => saveLastMood(broken, 'x', 'a.yaml')).not.toThrow();
  });
});
