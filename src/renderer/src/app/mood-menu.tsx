import { useEffect, useRef, useState } from 'react';
import type { AvatarGroup, Mood } from './logic/gallery-logic';

interface MoodMenuProps {
  group?: AvatarGroup;
  current?: Mood;
  onSelectMood: (m: Mood) => void;
}

/** A pill showing the current mood; tapping opens a small menu of the avatar's other moods. */
export function MoodMenu({ group, current, onSelectMood }: MoodMenuProps): JSX.Element | null {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener('pointerdown', onPointerDown);
    return () => window.removeEventListener('pointerdown', onPointerDown);
  }, [open]);

  if (!group || group.moods.length <= 1) return null;

  return (
    <div className="cm-mood-wrap" ref={rootRef}>
      <button
        type="button"
        className="cm-pill cm-island"
        data-testid="mood-button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="cm-mood-label">{current?.label ?? '…'}</span>
        <span aria-hidden="true">▾</span>
      </button>
      {open && (
        <div
          className="cm-menu cm-island"
          role="menu"
          onKeyDown={(e) => { if (e.key === 'Escape') setOpen(false); }}
        >
          {group.moods.map((m) => {
            const checked = m.filename === current?.filename;
            return (
              <button
                key={m.filename}
                type="button"
                role="menuitemradio"
                aria-checked={checked}
                className="cm-menu-item"
                onClick={() => { onSelectMood(m); setOpen(false); }}
              >
                <span className="cm-menu-check">{checked ? '✓' : ''}</span>
                <span>{m.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
