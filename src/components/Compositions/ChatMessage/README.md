# ChatMessage (Composition)

One message row in a chat stream (style guide: Chat Message Stream). User messages are right-aligned black/white blocks. Assistant messages are left-aligned surface blocks with a 3px strong left border. System messages are full-width, dashed and monospace.

```tsx
import { ChatMessage, toChatMessageRole } from '../components/Compositions/ChatMessage';

<ChatMessage role="user">Make the button green.</ChatMessage>
<ChatMessage role="assistant" extra={<ChangeSummary job={job} />}>Updated Button.tsx.</ChatMessage>
<ChatMessage role={toChatMessageRole(row.role)}>{row.content}</ChatMessage>
```

## Props

| Prop | Type | Default | Notes |
|---|---|---|---|
| `role` | `'user' \| 'ai' \| 'assistant' \| 'system'` | required | `ai` and `assistant` render the same. Use `toChatMessageRole(string)` for stored rows. |
| `children` | `ReactNode` | required | Body; line breaks are preserved. |
| `label` | `string` | `YOU`, `COMPLIX ASSISTANT`, `SYSTEM` | Speaker text (shown uppercase). |
| `timestamp` | `string` | | Shown in the header. |
| `badge` | `ReactNode` | | Header badge, for example `<Badge variant="lemon">Unverified draft</Badge>`. |
| `error` | `boolean` | `false` | Rose error styling. |
| `extra` | `ReactNode` | | Rendered under the bubble (diffs, actions). Hidden for system messages. |
| `className` | `string` | | Merged onto the row. |

Stable class hooks: `chat-message-row chat-message-row-{role}` on the row; `chat-bubble chat-bubble-{role}` (plus `chat-bubble-error`) on the bubble. `ai` maps to `assistant`. Tests select on these.
