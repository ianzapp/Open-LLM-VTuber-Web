import { useState } from 'react';
import { useWebSocket } from '@/context/websocket-context';
import { routeFor, talkedLine, type AvatarGroup } from './logic/gallery-logic';

interface GalleryProps {
  groups: AvatarGroup[];
  state: 'loading' | 'ready' | 'error';
  onRetry: () => void;
}

function AvatarCard({ group }: { group: AvatarGroup }): JSX.Element {
  const { baseUrl } = useWebSocket();
  const src = group.image ? `${baseUrl}${group.image}` : '';
  const [broken, setBroken] = useState(!src);
  const moodCount = group.moods.length;
  const meta = `${moodCount} ${moodCount === 1 ? 'mood' : 'moods'} · ${talkedLine(group.lastTalked, Date.now())}`;

  return (
    <a
      href={routeFor(group.model)}
      className="cm-card"
      data-testid="avatar-card"
      style={!broken ? { backgroundImage: `url("${src}")` } : undefined}
    >
      {!broken && (
        // An invisible probe: if the real image 404s, fall back to the initial placeholder.
        <img src={src} alt="" className="cm-card-probe" onError={() => setBroken(true)} />
      )}
      {broken && (
        <div className="cm-card-placeholder" aria-hidden="true">
          <span>{group.name.charAt(0).toUpperCase() || '?'}</span>
        </div>
      )}
      <div className="cm-card-scrim">
        <div className="cm-card-name">{group.name}</div>
        <div className="cm-card-meta">{meta}</div>
      </div>
      <span className="cm-card-talk">Talk</span>
    </a>
  );
}

function SkeletonCard({ index }: { index: number }): JSX.Element {
  return <div className="cm-card cm-card-skeleton" data-testid="gallery-skeleton" key={index} />;
}

export function Gallery({ groups, state, onRetry }: GalleryProps): JSX.Element {
  return (
    <main className="cm-gallery cm-island" data-testid="gallery">
      <div className="cm-gallery-head">
        <div className="cm-gallery-title">Companion</div>
        <div className="cm-gallery-actions" />
      </div>
      {state === 'loading' && (
        <div className="cm-cards">
          {[0, 1, 2].map((i) => <SkeletonCard index={i} key={i} />)}
        </div>
      )}
      {state === 'error' && (
        <div className="cm-gallery-empty">
          <p>Can&apos;t reach the server.</p>
          <button type="button" className="cm-gallery-retry" data-testid="gallery-retry" onClick={onRetry}>
            Retry
          </button>
        </div>
      )}
      {state === 'ready' && groups.length === 0 && (
        <div className="cm-gallery-empty">
          <p>No avatars found. Add a character file on the server.</p>
          <button type="button" className="cm-gallery-retry" data-testid="gallery-retry" onClick={onRetry}>
            Retry
          </button>
        </div>
      )}
      {state === 'ready' && groups.length > 0 && (
        <div className="cm-cards">
          {groups.map((g) => <AvatarCard group={g} key={g.model} />)}
        </div>
      )}
    </main>
  );
}
