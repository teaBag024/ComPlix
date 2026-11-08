import { ChatMessage } from '..';
import { Badge } from '../../../Common/Badge';

// Demonstration only.
export default function ChatMessagePreview() {
  return (
    <div className="flex flex-col gap-3 rounded-[2px] border border-subtle bg-surface p-3.5">
      <ChatMessage role="system">Session started · context: Button.tsx</ChatMessage>
      <ChatMessage role="user" timestamp="14:22">Add a danger variant to Button.</ChatMessage>
      <ChatMessage role="assistant" timestamp="14:22" badge={<Badge variant="lemon">Unverified draft</Badge>}>
        Added `danger` with rose pastel tokens.{'\n'}Open the Code view to review it.
      </ChatMessage>
      <ChatMessage role="assistant" error>The reply could not be generated. Check the connection and retry.</ChatMessage>
    </div>
  );
}
