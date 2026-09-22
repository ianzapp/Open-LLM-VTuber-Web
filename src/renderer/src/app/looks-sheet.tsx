import { useEffect } from 'react';
import { useLook } from '@/context/look-context';
import { useBgUrl } from '@/context/bgurl-context';
import { useWebSocket } from '@/context/websocket-context';
import { useLive2DConfig } from '@/context/live2d-config-context';
import { saveScene } from '@/engine/look-composer';
import { chipOn, sceneOptions, visibleSections } from './logic/looks-ui';

export function LooksSheet({ onClose }: { onClose: () => void }): JSX.Element {
  const {
    catalogue, state, setPose, setHand, setColour, toggleAccessory, toggleEffect, reset,
    allowHerChanges, setAllowHerChanges,
  } = useLook();
  const { backgroundUrl, setBackgroundUrl, backgroundFiles } = useBgUrl();
  const { baseUrl } = useWebSocket();
  const { modelInfo } = useLive2DConfig();
  const model = modelInfo?.name ?? '';

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const sections = visibleSections(catalogue);
  const scenes = sceneOptions(backgroundFiles, baseUrl);

  const setterFor = (section: string): ((id: string) => void) => {
    if (section === 'poses') return (id) => setPose(id);
    if (section === 'hands') return (id) => setHand(id);
    if (section === 'colours') return (id) => setColour(id);
    if (section === 'accessories') return (id) => toggleAccessory(id);
    return (id) => toggleEffect(id);
  };

  const entriesFor = (key: string) => ((catalogue as Record<string, Array<{ id: string; label: string }>> | null)?.[key] ?? []);

  const chooseScene = (option: { name: string; url: string }) => {
    setBackgroundUrl(option.url);
    // Store the file name (or '' for None), not the URL — see sceneFileFromStored.
    saveScene(window.localStorage, model, option.url ? option.name : '');
  };

  return (
    <section className="cm-sheet cm-looks-sheet cm-island" data-testid="looks-sheet" aria-label="Looks">
      <header className="cm-sheet-head">
        <span>Looks</span>
        <button type="button" className="cm-round cm-sheet-close" aria-label="Close looks sheet" onClick={onClose}>✕</button>
      </header>
      <div className="cm-looks-body">
        {sections.map((section) => {
          const setValue = setterFor(section.key);
          const entries = entriesFor(section.key);
          return (
            <div className="cm-looks-row" key={section.key}>
              <h3>{section.label}</h3>
              <div
                className="cm-chips"
                role={section.kind === 'single' ? 'radiogroup' : undefined}
                aria-label={section.kind === 'single' ? section.label : undefined}
              >
                {entries.map((entry) => {
                  const on = chipOn(state, section.key, entry.id);
                  const common = {
                    key: entry.id,
                    className: 'cm-chip',
                    'data-testid': `look-${section.key}-${entry.id}`,
                    'data-on': on ? 'on' : 'off',
                    onPointerDown: (e: React.PointerEvent) => e.preventDefault(),
                    onClick: () => setValue(entry.id),
                  } as const;
                  return section.kind === 'single' ? (
                    <button type="button" role="radio" aria-checked={on} {...common}>{entry.label}</button>
                  ) : (
                    <button type="button" aria-pressed={on} {...common}>{entry.label}</button>
                  );
                })}
              </div>
            </div>
          );
        })}

        {scenes.length > 1 && (
          <div className="cm-looks-row">
            <h3>Scene</h3>
            <div className="cm-chips">
              {scenes.map((o) => (
                <button
                  type="button"
                  key={o.name}
                  className="cm-scene"
                  data-testid={`scene-${o.name}`}
                  aria-pressed={o.url === backgroundUrl}
                  style={o.url ? { backgroundImage: `url("${o.url}")` } : undefined}
                  onPointerDown={(e) => e.preventDefault()}
                  onClick={() => chooseScene(o)}
                >
                  {!o.url && 'None'}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="cm-looks-foot">
          {sections.length > 0 && (
            <>
              <button type="button" className="cm-pill" data-testid="look-reset" onPointerDown={(e) => e.preventDefault()} onClick={() => reset()}>Reset look</button>
              <label className="cm-switch">
                <input
                  type="checkbox"
                  data-testid="look-by-her"
                  checked={allowHerChanges}
                  onChange={(e) => setAllowHerChanges(e.target.checked)}
                />
                Let her change her look
              </label>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
