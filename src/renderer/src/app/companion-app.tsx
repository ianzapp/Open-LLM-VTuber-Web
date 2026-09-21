import { useState } from 'react';
import './companion.css';
import { Live2D } from '@/engine/live2d-canvas';
import { useBgUrl } from '@/context/bgurl-context';
import { Captions } from './captions';
import { Dock } from './dock';
import { Toasts } from './toasts';
import { TopStrip } from './top-strip';

export function CompanionApp(): JSX.Element {
  const { backgroundUrl } = useBgUrl();
  const [mode, setMode] = useState<'voice' | 'chat'>('voice');
  return (
    <div className="cm-root" data-mode={mode}>
      <div className="cm-bg" style={backgroundUrl ? { backgroundImage: `url("${backgroundUrl}")` } : undefined} />
      <div className="cm-canvas-host" data-layer="canvas">
        <Live2D />
      </div>
      <div className="cm-overlay">
        <TopStrip />
        <Captions />
        <Dock onOpenChat={() => setMode('chat')} />
      </div>
      <Toasts />
    </div>
  );
}
