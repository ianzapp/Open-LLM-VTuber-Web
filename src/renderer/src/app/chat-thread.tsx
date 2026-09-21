import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useAiState } from '@/context/ai-state-context';
import { useChatHistory } from '@/context/chat-history-context';
import { isNearBottom } from './logic/chat-logic';
import { stripCaptionTags } from './logic/caption-text';

export function ChatThread(): JSX.Element {
  const { messages } = useChatHistory();
  const { aiState } = useAiState();
  const box = useRef<HTMLDivElement>(null);
  const follow = useRef(true);
  const [showJump, setShowJump] = useState(false);

  const last = messages[messages.length - 1];
  const waiting = aiState === 'thinking-speaking' && (!last || last.role === 'human');

  const onScroll = () => {
    const el = box.current;
    if (!el) return;
    follow.current = isNearBottom(el.scrollTop, el.clientHeight, el.scrollHeight);
    setShowJump(!follow.current);
  };

  const toBottom = () => {
    const el = box.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
    follow.current = true;
    setShowJump(false);
  };

  // Follow new text only while the reader is at the bottom; never yank them down.
  useLayoutEffect(() => {
    if (follow.current) toBottom();
    else setShowJump(true);
  }, [messages, waiting]);

  useEffect(() => { toBottom(); }, []);

  return (
    <div className="cm-thread-wrap">
      <div className="cm-thread cm-island" ref={box} onScroll={onScroll} data-testid="chat-thread" role="log" aria-live="polite">
        {messages.length === 0 && <p className="cm-empty">Say hi — type below or tap the mic.</p>}
        {messages.map((m) => {
          if (m.type === 'tool_call_status') {
            return <p key={m.id} className="cm-tool">{m.tool_name || 'tool'} · {m.status || 'running'}</p>;
          }
          const text = stripCaptionTags(m.content);
          if (!text) return null;
          return <div key={m.id} className="cm-bubble" data-role={m.role}>{text}</div>;
        })}
        {waiting && <div className="cm-bubble cm-typing" data-role="ai" aria-label="She is typing"><i /><i /><i /></div>}
      </div>
      {showJump && (
        <button type="button" className="cm-jump cm-island" onClick={toBottom} aria-label="Jump to newest message">↓</button>
      )}
    </div>
  );
}
