export interface ApiCharacter {
  filename: string; name: string; conf_uid: string; character_name: string; live2d_model_name: string;
  avatar: string; mood_label: string; last_talked: string | null; snapshot?: string; mode?: string;
}
export interface Mood { filename: string; confUid: string; label: string; lastTalked: number | null }
export interface AvatarGroup { model: string; name: string; image: string; moods: Mood[]; lastTalked: number | null }
export type Route = { screen: 'gallery' } | { screen: 'companion'; model: string };

// last_talked has no zone: the server writes its local wall-clock time and the browser reads it as its own local time. Correct whenever phone and server share a time zone (this deployment).
const toTime = (iso: string | null | undefined): number | null => {
  if (!iso) return null;
  const t = Date.parse(iso);
  return Number.isNaN(t) ? null : t;
};

const titleCase = (s: string) => s.split(/[_\s-]+/).filter(Boolean).map((w) => w[0].toUpperCase() + w.slice(1)).join(' ');

/** One card per Live2D model; its character files become that avatar's moods. */
export function groupAvatars(chars: readonly ApiCharacter[]): AvatarGroup[] {
  // conf.yaml (the server default) often duplicates a characters/ file: keep the file, drop the twin.
  const uidsWithFile = new Set(chars.filter((c) => c.filename !== 'conf.yaml' && c.conf_uid).map((c) => c.conf_uid));
  const rows = chars.filter((c) => c.live2d_model_name && !(c.filename === 'conf.yaml' && uidsWithFile.has(c.conf_uid)));

  const byModel = new Map<string, ApiCharacter[]>();
  rows.forEach((c) => { byModel.set(c.live2d_model_name, [...(byModel.get(c.live2d_model_name) ?? []), c]); });

  const groups = [...byModel.entries()].map(([model, list]): AvatarGroup => {
    const moods = list.map((c): Mood => ({ filename: c.filename, confUid: c.conf_uid, label: c.mood_label || 'Default', lastTalked: toTime(c.last_talked) }));
    moods.sort((a, b) => Number(b.label === 'Default') - Number(a.label === 'Default')); // stable: API order otherwise

    // Determine avatar name: first mood with Default label (if non-empty), then shortest non-empty character_name, else title-cased model
    const defaultMood = moods.find((m) => m.label === 'Default');
    const defaultCharName = defaultMood ? list.find((c) => c.mood_label === 'Default' || (c.mood_label || 'Default') === 'Default')?.character_name : null;
    let name: string;
    if (defaultCharName) {
      name = defaultCharName;
    } else {
      const nonEmpty = list.map((c) => c.character_name).filter((cn): cn is string => !!cn);
      if (nonEmpty.length > 0) {
        nonEmpty.sort((a, b) => a.length - b.length || nonEmpty.indexOf(a) - nonEmpty.indexOf(b));
        name = nonEmpty[0];
      } else {
        name = titleCase(model);
      }
    }

    const times = moods.map((m) => m.lastTalked).filter((t): t is number => t !== null);
    const withPicture = list.find((c) => c.snapshot) ?? list.find((c) => c.avatar);
    const image = withPicture?.snapshot || (withPicture?.avatar ? `/avatars/${withPicture.avatar.split('/').map(encodeURIComponent).join('/')}` : '');
    return { model, name, image, moods, lastTalked: times.length ? Math.max(...times) : null };
  });

  return groups.sort((a, b) => (b.lastTalked ?? -1) - (a.lastTalked ?? -1) || a.name.localeCompare(b.name));
}

export function talkedLine(lastTalked: number | null, nowMs: number): string {
  if (lastTalked === null) return 'Not talked yet';
  const s = Math.max(0, Math.floor((nowMs - lastTalked) / 1000));
  if (s < 60) return 'Talked just now';
  if (s < 3600) return `Talked ${Math.floor(s / 60)} min ago`;
  if (s < 86_400) return `Talked ${Math.floor(s / 3600)} h ago`;
  if (s < 7 * 86_400) return `Talked ${Math.floor(s / 86_400)} d ago`;
  return `Talked ${Math.floor(s / (7 * 86_400))} w ago`;
}

export function parseRoute(hash: string): Route {
  const m = /^#\/c\/([^/?#]+)/.exec(hash);
  if (!m) return { screen: 'gallery' };
  try { return { screen: 'companion', model: decodeURIComponent(m[1]) }; } catch { return { screen: 'gallery' }; }
}
export const routeFor = (model: string): string => `#/c/${encodeURIComponent(model)}`;

export function pickMood(group: AvatarGroup, storedFilename: string | null): Mood {
  return group.moods.find((m) => m.filename === storedFilename) ?? group.moods[0];
}

const moodKey = (model: string) => `companion.mood.${model}`;
export function loadLastMood(storage: Pick<Storage, 'getItem'>, model: string): string | null {
  try { return storage.getItem(moodKey(model)); } catch { return null; }
}
export function saveLastMood(storage: Pick<Storage, 'setItem'>, model: string, filename: string): void {
  try { storage.setItem(moodKey(model), filename); } catch { /* not remembered, that is all */ }
}
