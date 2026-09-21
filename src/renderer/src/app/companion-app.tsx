import { useState } from 'react';
import './companion.css';
import { Live2D } from '@/engine/live2d-canvas';
import { useBgUrl } from '@/context/bgurl-context';
import { ChatBar } from './chat-bar';
import { FloatingBubbles } from './floating-bubbles';
import { ThreadSheet } from './thread-sheet';
import { Toasts } from './toasts';
import { TopStrip } from './top-strip';
import { useKeyboardInset } from './use-keyboard-inset';

export function CompanionApp(): JSX.Element {
  const { backgroundUrl } = useBgUrl();
  const [threadOpen, setThreadOpen] = useState(false);
  const inset = useKeyboardInset();
  return (
    <div className="cm-root">
      <div className="cm-bg" style={backgroundUrl ? { backgroundImage: `url("${backgroundUrl}")` } : undefined} />
      <div className="cm-canvas-host" data-layer="canvas">
        <Live2D />
      </div>
      {/* While the keyboard is up its height replaces the safe-area padding (the home indicator is covered). */}
      <div className="cm-overlay" style={{ paddingBottom: inset ? `${inset}px` : undefined }}>
        <TopStrip />
        <div className="cm-stage">
          {threadOpen ? <ThreadSheet onClose={() => setThreadOpen(false)} /> : <FloatingBubbles />}
        </div>
        <ChatBar threadOpen={threadOpen} onToggleThread={() => setThreadOpen((v) => !v)} />
      </div>
      <Toasts />
    </div>
  );
}
