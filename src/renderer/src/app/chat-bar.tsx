import { useLayoutEffect, useRef } from 'react';
import { useAiState } from '@/context/ai-state-context';
import { useSubtitle } from '@/context/subtitle-context';
import { useTextInput } from '@/hooks/footer/use-text-input';
import { useInterrupt } from '@/hooks/utils/use-interrupt';
import { useMicToggle } from '@/hooks/utils/use-mic-toggle';
import { useWebSocket } from '@/context/websocket-context';
import { notify } from '@/utils/notify';
import { micVisualState, type MicVisual } from './logic/mic-state';

const MIC_LABEL: Record<MicVisual, string> = {
  off: 'Turn microphone on',
  listening: 'Listening — tap to turn the microphone off',
  thinking: 'Thinking',
  speaking: 'She is speaking',
  unavailable: 'Voice needs the HTTPS address',
};

export function ChatBar({ threadOpen, onToggleThread }: { threadOpen: boolean; onToggleThread: () => void }): JSX.Element {
  const text = useTextInput();
  const area = useRef<HTMLTextAreaElement>(null);
  const { aiState } = useAiState();
  const { subtitleText } = useSubtitle();
  const { handleMicToggle, micOn } = useMicToggle();
  const { interrupt } = useInterrupt();
  const { wsState } = useWebSocket();

  const speaking = aiState === 'thinking-speaking';
  const visual = micVisualState({
    secure: window.isSecureContext,
    micOn,
    aiState,
    audioPlaying: speaking && !!subtitleText && subtitleText !== 'Thinking...',
  });
  const canSend = text.inputText.trim().length > 0;

  // Grow with the text, up to the CSS max-height.
  useLayoutEffect(() => {
    const el = area.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [text.inputText]);

  const send = () => {
    if (!canSend) return;
    if (wsState !== 'OPEN') {
      notify('warning', 'Reconnecting…', 'Your message was not sent. It is still in the box.');
      return;
    }
    void text.handleSend();
    area.current?.focus(); // keep the keyboard up for the next message
  };

  const onMic = () => {
    if (visual === 'unavailable') {
      notify('info', 'Voice needs HTTPS', 'Open the https:// address (no port number) to use the microphone.');
      return;
    }
    void handleMicToggle();
  };

  return (
    <div className="cm-chatbar cm-island" data-testid="chat-bar">
      <button type="button" className="cm-round" data-testid="thread-toggle" aria-pressed={threadOpen}
        aria-label={threadOpen ? 'Close conversation' : 'Open conversation'}
        onPointerDown={(e) => e.preventDefault()} onClick={onToggleThread}>≡</button>
      <textarea
        ref={area}
        className="cm-input"
        rows={1}
        placeholder="Message…"
        enterKeyHint="send"
        value={text.inputText}
        onChange={(e) => text.setInputText(e as never)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing && wsState !== 'OPEN') {
            e.preventDefault();
            notify('warning', 'Reconnecting…', 'Your message was not sent. It is still in the box.');
            return;
          }
          text.handleKeyPress(e as never);
        }}
        onCompositionStart={text.handleCompositionStart}
        onCompositionEnd={text.handleCompositionEnd}
      />
      {speaking && (
        <button type="button" className="cm-round" aria-label="Interrupt"
          onPointerDown={(e) => e.preventDefault()} onClick={() => interrupt()}>✋</button>
      )}
      {canSend ? (
        <button type="button" className="cm-round cm-send" aria-label="Send"
          onPointerDown={(e) => e.preventDefault()} onClick={send}>↑</button>
      ) : (
        <button type="button" className="cm-round cm-mic-small" data-testid="mic" data-state={visual} aria-label={MIC_LABEL[visual]}
          onPointerDown={(e) => e.preventDefault()} onClick={onMic}><span aria-hidden="true">🎙</span></button>
      )}
    </div>
  );
}
