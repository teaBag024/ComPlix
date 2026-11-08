import type { ReactNode } from 'react';
import { cn } from '../../../lib/utils';

export type ChatMessageRole = 'user' | 'ai' | 'assistant' | 'system';

export type ChatMessageProps = {
  role: ChatMessageRole;
  timestamp?: string;
  label?: string;
  badge?: ReactNode;
  error?: boolean;
  extra?: ReactNode;
  children: ReactNode;
  className?: string;
};

/** Maps a stored message role (free text in the database) onto a rendered role. */
export function toChatMessageRole(role: string): ChatMessageRole {
  return role === 'user' || role === 'system' ? role : 'assistant';
}

export function ChatMessage({
  role,
  timestamp,
  label,
  badge,
  error = false,
  extra,
  children,
  className,
}: ChatMessageProps) {
  const isUser = role === 'user';
  const isSystem = role === 'system';
  // `ai` and `assistant` render identically; the class name stays `assistant` for existing selectors.
  const roleClass = role === 'ai' ? 'assistant' : role;
  const defaultLabel = isUser ? 'YOU' : isSystem ? 'SYSTEM' : 'COMPLIX ASSISTANT';
  const speaker = label ?? defaultLabel;

  const messageClasses = error
    ? 'max-w-[88%] bg-[#FFE4E6] text-[#9F1239] border border-[#FDA4AF] dark:bg-[rgba(251,113,133,0.16)] dark:text-[#FDA4AF] dark:border-[rgba(251,113,133,0.45)]'
    : isUser
    ? 'max-w-[88%] bg-[#111827] text-white border border-[#111827] dark:bg-[#F4F4F5] dark:text-[#09090B] dark:border-[#F4F4F5]'
    : isSystem
    ? 'w-full bg-[#F3F4F6] dark:bg-[#1E1E22] border border-dashed border-[#E5E7EB] dark:border-[#27272A] font-mono text-[11px] text-[#4B5563] dark:text-[#A1A1AA]'
    : 'max-w-[88%] bg-white dark:bg-[#1F1F23] border border-[#E5E7EB] dark:border-[#27272A] border-l-[3px] border-l-[#111827] dark:border-l-[#F4F4F5] text-[#111827] dark:text-[#FAFAFA]';

  return (
    <div className={cn(
      'chat-message-row flex w-full flex-col gap-1',
      `chat-message-row-${roleClass}`,
      isUser ? 'items-end' : 'items-start',
      className
    )}>
      {!isSystem && (
        <div className="chat-speaker flex max-w-[88%] items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-ink-muted">
          <span>{speaker}</span>
          {timestamp && <span>{timestamp}</span>}
          {badge && <span className="normal-case">{badge}</span>}
        </div>
      )}
      <div className={cn(
        'chat-bubble rounded-[2px] px-3 py-2 text-[12px] leading-[1.55] whitespace-pre-wrap [overflow-wrap:anywhere]',
        `chat-bubble-${roleClass}`,
        error && 'chat-bubble-error',
        messageClasses
      )}>{children}</div>
      {!isSystem && extra}
    </div>
  );
}

ChatMessage.displayName = 'ChatMessage';
