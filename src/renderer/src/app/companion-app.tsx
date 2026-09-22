import { useEffect, useRef, useState } from 'react';
import './companion.css';
import { Live2D } from '@/engine/live2d-canvas';
import { useBgUrl } from '@/context/bgurl-context';
import { useInterrupt } from '@/hooks/utils/use-interrupt';
import { useVAD } from '@/context/vad-context';
import { notify } from '@/utils/notify';
import { ChatBar } from './chat-bar';
import { FloatingBubbles } from './floating-bubbles';
import { Gallery } from './gallery';
import { ThreadSheet } from './thread-sheet';
import { Toasts } from './toasts';
import { TopStrip } from './top-strip';
import { useActiveCharacter } from './use-active-character';
import { useCharacters } from './use-characters';
import { useHashRoute } from './use-hash-route';
import { useKeyboardInset } from './use-keyboard-inset';

export function CompanionApp(): JSX.Element {
  const { backgroundUrl } = useBgUrl();
  const [threadOpen, setThreadOpen] = useState(false);
  const inset = useKeyboardInset();
  const route = useHashRoute();
  const { groups, state, reload } = useCharacters();
  const { interrupt } = useInterrupt();
  const { stopMic } = useVAD();

  // interrupt/stopMic may not be referentially stable across renders; keep the
  // latest callbacks in refs so this effect only fires when the screen changes.
  const interruptRef = useRef(interrupt);
  const stopMicRef = useRef(stopMic);
  useEffect(() => { interruptRef.current = interrupt; }, [interrupt]);
  useEffect(() => { stopMicRef.current = stopMic; }, [stopMic]);

  useEffect(() => {
    if (route.screen === 'gallery') {
      interruptRef.current();
      stopMicRef.current();
      setThreadOpen(false);
    }
  }, [route.screen]);

  const group = groups.find((g) => route.screen === 'companion' && g.model === route.model);
  const { current, selectMood } = useActiveCharacter(group);

  useEffect(() => {
    if (route.screen === 'companion' && state === 'ready' && !group) {
      notify('warning', 'That avatar is not available');
      window.location.hash = '#/';
    }
  }, [route, state, group]);

  return (
    <div className="cm-root">
      <div className="cm-bg" style={backgroundUrl ? { backgroundImage: `url("${backgroundUrl}")` } : undefined} />
      <div className="cm-canvas-host" data-layer="canvas">
        <Live2D />
      </div>
      {route.screen === 'companion' ? (
        // While the keyboard is up its height replaces the safe-area padding (the home indicator is covered).
        <div className="cm-overlay" style={{ paddingBottom: inset ? `${inset}px` : undefined }}>
          <TopStrip group={group} current={current} onSelectMood={selectMood} />
          <div className="cm-stage">
            {group && !current ? (
              <div className="cm-loading">{`Loading ${group.name}…`}</div>
            ) : threadOpen ? (
              <ThreadSheet onClose={() => setThreadOpen(false)} />
            ) : (
              <FloatingBubbles />
            )}
          </div>
          <ChatBar threadOpen={threadOpen} onToggleThread={() => setThreadOpen((v) => !v)} />
        </div>
      ) : (
        <Gallery groups={groups} state={state} onRetry={reload} />
      )}
      <Toasts />
    </div>
  );
}
