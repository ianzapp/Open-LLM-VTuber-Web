import { ChatThread } from './chat-thread';

export function ThreadSheet({ onClose }: { onClose: () => void }): JSX.Element {
  return (
    <section className="cm-sheet cm-island" data-testid="thread-sheet" aria-label="Conversation">
      <header className="cm-sheet-head">
        <span>Conversation</span>
        <button type="button" className="cm-round cm-sheet-close" aria-label="Close conversation" onClick={onClose}>✕</button>
      </header>
      <ChatThread />
    </section>
  );
}
