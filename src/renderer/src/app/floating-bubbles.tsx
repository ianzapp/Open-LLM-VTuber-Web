import { useEffect, useState } from 'react';
import { useAiState } from '@/context/ai-state-context';
import { useChatHistory } from '@/context/chat-history-context';
import { stripCaptionTags } from './logic/caption-text';
import { floatingBubbles } from './logic/float-logic';

/** The newest messages, floating over the avatar. Display only: never takes a touch. */
export function FloatingBubbles(): JSX.Element {
  const { messages } = useChatHistory();
  const { aiState } = useAiState();
  const [, tick] = useState(0);

  const speaking = aiState === 'thinking-speaking';
  const bubbles = floatingBubbles(messages, Date.now(), speaking, stripCaptionTags);
  const last = messages[messages.length - 1];
  const waiting = speaking && (!last || last.role === 'human');
  const active = bubbles.length > 0;

  // Re-evaluate ages only while something is on screen.
  useEffect(() => {
    if (!active) return undefined;
    const timer = window.setInterval(() => tick((n) => n + 1), 350);
    return () => window.clearInterval(timer);
  }, [active]);

  return (
    <div className="cm-float" data-testid="floating-bubbles" role="log" aria-live="off" aria-label="Latest messages">
      {bubbles.map((b) => (
        <div key={b.id} className="cm-bubble" data-role={b.role} data-fading={b.fading}><span>{b.text}</span></div>
      ))}
      {waiting && <div className="cm-bubble cm-typing" data-role="ai" aria-label="She is typing"><i /><i /><i /></div>}
    </div>
  );
}
