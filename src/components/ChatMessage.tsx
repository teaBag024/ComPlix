import type { ReactNode } from 'react';

export function ChatMessage({ role, error = false, children }: {
  role: string; error?: boolean; children: ReactNode;
}) {
  return <div className={'chat-message-row chat-message-row-' + role}>
    <span className="chat-speaker">{role === 'user' ? 'You' : 'ComPlix'}</span>
    <p className={'chat-bubble chat-bubble-' + role + (error ? ' chat-bubble-error' : '')}>{children}</p>
  </div>;
}
