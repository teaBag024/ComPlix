import type { ReactNode } from 'react';

export function ChatMessage({ role, error = false, label, extra, children }: {
  role: string; error?: boolean; label?: string; extra?: ReactNode; children: ReactNode;
}) {
  return <div className={'chat-message-row chat-message-row-' + role}>
    <span className="chat-speaker">{label ?? (role === 'user' ? 'You' : 'ComPlix')}</span>
    <p className={'chat-bubble chat-bubble-' + role + (error ? ' chat-bubble-error' : '')}>{children}</p>
    {extra}
  </div>;
}
