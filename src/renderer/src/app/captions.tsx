import { useEffect, useRef, useState } from 'react';
import { useAiState } from '@/context/ai-state-context';
import { useChatHistory } from '@/context/chat-history-context';
import { useSubtitle } from '@/context/subtitle-context';
import { isFreshMessage, stripCaptionTags } from './logic/caption-text';

const FADE_AFTER_MS = 3000;
const HEARD_FOR_MS = 2500;

export function Captions(): JSX.Element {
  const { subtitleText } = useSubtitle();
  const { aiState } = useAiState();
  const { messages } = useChatHistory();
  const [visible, setVisible] = useState(true);
  const [heard, setHeard] = useState('');
  const lastHumanId = useRef<string | number | undefined>(undefined);
  const heardTimer = useRef<number | undefined>(undefined);

  const text = stripCaptionTags(subtitleText || '');

  // Fade out 3 s after she stops speaking; come back whenever the text changes.
  useEffect(() => {
    setVisible(true);
    if (aiState === 'thinking-speaking') return undefined;
    const timer = window.setTimeout(() => setVisible(false), FADE_AFTER_MS);
    return () => window.clearTimeout(timer);
  }, [text, aiState]);

  // Briefly show what she heard — only for a message created just now, never for loaded history.
  useEffect(() => {
    const last = [...messages].reverse().find((m) => m.role === 'human');
    if (!last || last.id === lastHumanId.current) return undefined;
    lastHumanId.current = last.id;
    if (!isFreshMessage(last.timestamp, Date.now())) return undefined;
    setHeard(last.content);
    window.clearTimeout(heardTimer.current);
    heardTimer.current = window.setTimeout(() => setHeard(''), HEARD_FOR_MS);
  }, [messages]);

  // The hide timer must survive later message updates; clear it only when the component unmounts.
  useEffect(() => () => window.clearTimeout(heardTimer.current), []);

  return (
    <div className="cm-captions" data-testid="captions" aria-live="polite">
      {heard && <p className="cm-heard">{heard}</p>}
      <p className="cm-caption" data-visible={visible && !!text}>{text}</p>
    </div>
  );
}
