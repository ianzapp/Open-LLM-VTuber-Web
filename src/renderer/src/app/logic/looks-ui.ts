import type { LooksCatalogue, LookState } from '@/engine/look-composer';

export interface SectionView { key: string; label: string; kind: 'single' | 'toggle' }
export interface SceneOption { name: string; url: string }

const ORDER: SectionView[] = [
  { key: 'poses', label: 'Pose', kind: 'single' },
  { key: 'hands', label: 'Hands', kind: 'single' },
  { key: 'accessories', label: 'Accessories', kind: 'toggle' },
  { key: 'colours', label: 'Colour', kind: 'single' },
  { key: 'effects', label: 'Effects', kind: 'toggle' },
];

export function visibleSections(catalogue: LooksCatalogue | null): SectionView[] {
  if (!catalogue) return [];
  return ORDER.filter((s) => ((catalogue as Record<string, unknown[]>)[s.key] ?? []).length > 0);
}

export function chipOn(state: LookState, section: string, id: string): boolean {
  if (section === 'poses') return state.pose === id;
  if (section === 'hands') return state.hand === id;
  if (section === 'colours') return state.colour === id;
  if (section === 'accessories') return state.accessories.includes(id);
  if (section === 'effects') return state.effects.includes(id);
  return false;
}

/** The server sends plain filenames; older code typed them as objects. Accept both. */
export function sceneOptions(files: ReadonlyArray<string | { name?: string; url?: string }>, baseUrl: string): SceneOption[] {
  const out: SceneOption[] = [{ name: 'None', url: '' }];
  (files ?? []).forEach((file) => {
    const name = typeof file === 'string' ? file : (file?.name ?? '');
    if (!name) return;
    out.push({ name, url: `${baseUrl}/bg/${encodeURIComponent(name)}` });
  });
  return out;
}

export const hasLooksUI = (catalogue: LooksCatalogue | null, backgroundCount: number): boolean => visibleSections(catalogue).length > 0 || backgroundCount > 0;
