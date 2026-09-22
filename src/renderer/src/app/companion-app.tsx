import { useEffect, useRef, useState } from 'react';
import './companion.css';
import { Live2D } from '@/engine/live2d-canvas';
import { useBgUrl } from '@/context/bgurl-context';
import { useInterrupt } from '@/hooks/utils/use-interrupt';
import { useProactiveSpeak } from '@/context/proactive-speak-context';
import { useVAD } from '@/context/vad-context';
import { useLook } from '@/context/look-context';
import { useLive2DConfig } from '@/context/live2d-config-context';
import { useWebSocket } from '@/context/websocket-context';
import { loadScene, sceneFileFromStored } from '@/engine/look-composer';
import { notify } from '@/utils/notify';
import { ChatBar } from './chat-bar';
import { FloatingBubbles } from './floating-bubbles';
import { Gallery } from './gallery';
import { LooksSheet } from './looks-sheet';
import { ThreadSheet } from './thread-sheet';
import { Toasts } from './toasts';
import { TopStrip } from './top-strip';
import { useActiveCharacter } from './use-active-character';
import { useCharacters } from './use-characters';
import { useHashRoute } from './use-hash-route';
import { useKeyboardInset } from './use-keyboard-inset';
import { hasLooksUI } from './logic/looks-ui';

export function CompanionApp(): JSX.Element {
  const { backgroundUrl, setBackgroundUrl, backgroundFiles, resetBackground } = useBgUrl();
  const [threadOpen, setThreadOpen] = useState(false);
  const [looksOpen, setLooksOpen] = useState(false);
  const inset = useKeyboardInset();
  const route = useHashRoute();
  const { groups, state, reload } = useCharacters();
  const { interrupt } = useInterrupt();
  const { stopMic } = useVAD();
  const { settings: proactiveSpeakSettings, updateSettings: updateProactiveSpeakSettings } = useProactiveSpeak();
  const { catalogue } = useLook();
  const { modelInfo } = useLive2DConfig();
  const { baseUrl } = useWebSocket();
  const showLooks = hasLooksUI(catalogue, backgroundFiles.length);

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
      setLooksOpen(false);
    }
  }, [route.screen]);

  // Returning to the gallery refreshes the list (silently — see use-characters).
  useEffect(() => { if (route.screen === 'gallery') reload(); }, [route.screen, reload]);

  // Per-avatar scene: reapply the background stored for this model, unless the gallery
  // (which keeps the default) is showing. An empty string means "None".
  useEffect(() => {
    if (route.screen === 'gallery') {
      resetBackground();
      return;
    }
    const model = modelInfo?.name ?? '';
    if (!model) return;
    const stored = loadScene(window.localStorage, model);
    if (stored === null) {
      resetBackground();
    } else {
      const file = sceneFileFromStored(stored);
      const url = file ? `${baseUrl}/bg/${file}` : '';
      if (url !== backgroundUrl) setBackgroundUrl(url);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modelInfo?.name, route.screen]);

  // The old UI could turn this on; the new UI has no control for it and she must not start talking under the gallery.
  useEffect(() => {
    if (proactiveSpeakSettings.allowProactiveSpeak) {
      updateProactiveSpeakSettings({ ...proactiveSpeakSettings, allowProactiveSpeak: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const group = groups.find((g) => route.screen === 'companion' && g.model === route.model);
  const { current, selectMood } = useActiveCharacter(group);

  useEffect(() => {
    if (route.screen === 'companion' && (state === 'ready' || state === 'error') && !group) {
      notify('warning', state === 'error' ? "Can't reach the server" : 'That avatar is not available');
      window.location.hash = '#/';
    }
  }, [route, state, group]);

  return (
    <div className="cm-root" data-looks-open={looksOpen}>
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
            ) : looksOpen ? (
              <LooksSheet onClose={() => setLooksOpen(false)} />
            ) : threadOpen ? (
              <ThreadSheet onClose={() => setThreadOpen(false)} />
            ) : (
              <FloatingBubbles />
            )}
          </div>
          <ChatBar
            threadOpen={threadOpen}
            onToggleThread={() => { setLooksOpen(false); setThreadOpen((v) => !v); }}
            looksOpen={looksOpen}
            showLooks={showLooks}
            onToggleLooks={() => { setThreadOpen(false); setLooksOpen((v) => !v); }}
          />
        </div>
      ) : (
        <Gallery groups={groups} state={state} onRetry={reload} />
      )}
      <Toasts />
    </div>
  );
}
