import { useAiState } from '@/context/ai-state-context';
import { useSubtitle } from '@/context/subtitle-context';
import { useInterrupt } from '@/hooks/utils/use-interrupt';
import { useMicToggle } from '@/hooks/utils/use-mic-toggle';
import { notify } from '@/utils/notify';
import { micVisualState } from './logic/mic-state';

const MIC_LABEL = {
  unavailable: 'Voice needs the HTTPS address',
  off: 'Turn microphone on',
  listening: 'Listening — tap to turn microphone off',
  thinking: 'Thinking',
  speaking: 'Speaking',
} as const;

/** Voice-mode controls. Typing lives in chat mode (Task 9); the keyboard button switches to it. */
export function Dock({ onOpenChat }: { onOpenChat: () => void }): JSX.Element {
  const { aiState } = useAiState();
  const { subtitleText } = useSubtitle();
  const { handleMicToggle, micOn } = useMicToggle();
  const { interrupt } = useInterrupt();

  const speaking = aiState === 'thinking-speaking';
  const visual = micVisualState({
    secure: window.isSecureContext,
    micOn,
    aiState,
    audioPlaying: speaking && !!subtitleText && subtitleText !== 'Thinking...',
  });

  const onMic = () => {
    if (visual === 'unavailable') {
      notify('info', 'Voice needs HTTPS', 'Open the https:// address (no port number) to use the microphone.');
      return;
    }
    void handleMicToggle();
  };

  return (
    <div className="cm-dock" data-testid="dock">
      <div className="cm-buttons">
        <button type="button" className="cm-round cm-island" aria-label="Open chat" onClick={onOpenChat}>⌨</button>
        <button type="button" className="cm-mic cm-island" data-state={visual} aria-label={MIC_LABEL[visual]} onClick={onMic}>
          <span aria-hidden="true">🎙</span>
        </button>
        <button type="button" className="cm-round cm-island" aria-label="Interrupt" disabled={!speaking} onClick={() => interrupt()}>✋</button>
      </div>
    </div>
  );
}
