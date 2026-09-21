import { useState } from 'react';
import './companion.css';
import { Live2D } from '@/engine/live2d-canvas';
import { useBgUrl } from '@/context/bgurl-context';
import { Captions } from './captions';
import { ChatBar } from './chat-bar';
import { ChatThread } from './chat-thread';
import { Dock } from './dock';
import { type UiMode, loadMode, saveMode } from './logic/chat-logic';
import { Toasts } from './toasts';
import { TopStrip } from './top-strip';
import { useKeyboardInset } from './use-keyboard-inset';

export function CompanionApp(): JSX.Element {
  const { backgroundUrl } = useBgUrl();
  const [mode, setModeState] = useState<UiMode>(() => loadMode(window.localStorage));
  const setMode = (next: UiMode) => { setModeState(next); saveMode(window.localStorage, next); };
  const inset = useKeyboardInset();
  return (
    <div className="cm-root" data-mode={mode}>
      <div className="cm-bg" style={backgroundUrl ? { backgroundImage: `url("${backgroundUrl}")` } : undefined} />
      <div className="cm-canvas-host" data-layer="canvas">
        <Live2D />
      </div>
      {/* While the keyboard is up its height replaces the safe-area padding (the home indicator is covered). */}
      <div className="cm-overlay" style={{ paddingBottom: inset ? `${inset}px` : undefined }}>
        <TopStrip mode={mode} onToggleMode={() => setMode(mode === 'voice' ? 'chat' : 'voice')} />
        {mode === 'voice' ? (
          <>
            <Captions />
            <Dock onOpenChat={() => setMode('chat')} />
          </>
        ) : (
          <div className="cm-chat">
            <ChatThread />
            <ChatBar />
          </div>
        )}
      </div>
      <Toasts />
    </div>
  );
}
