# CodeEditor (Composition)

Draft source editor in the style guide's code shell: a file tab, an "Unverified draft" badge, a read-only badge and a copy action, then a line-number gutter beside the textarea, then a status bar. Uses the Common `Badge` and `Button`. Source stays escaped text in a `<textarea>`; nothing is executed or rendered as HTML.

```tsx
import { CodeEditor, AGENT_HIGHLIGHT_MS } from '../components/Compositions/CodeEditor';

<CodeEditor filename={file.path} value={file.content} readOnly={!canEdit} onChange={value => save(file.path, value)}
  before={snapshotContent} generated={agentContent} highlightUntil={Date.now() + AGENT_HIGHLIGHT_MS} />
```

## Props

| Prop | Type | Default | Notes |
|---|---|---|---|
| `value` | `string` | required | Current text. |
| `onChange` | `(value: string) => void` | | Called on each edit. |
| `readOnly` | `boolean` | `false` | Shows the Read-only badge. Copy still works. |
| `filename` | `string` | `Source.tsx` | Tab label (basename; full path on hover). The extension sets the language label. |
| `before` / `generated` | `string` | `''` | Source before and after the latest agent change. Lines the agent added are highlighted, and the status bar shows +added / −removed. |
| `highlightUntil` | `number` | `0` | Epoch ms when the highlight ends; 0 disables it. The highlight also stops once the user edits or `value` differs from `generated`. |
| `className` | `string` | | Merged onto the shell. |

## Behavior

- The highlight uses the `agent-code-highlight` class and the `--agent-change-color` animation in `src/style.css`. It fades over `AGENT_HIGHLIGHT_MS` (10 s), and remounting partway through keeps the fade in step. Under reduced motion the fade becomes a single step.
- Line diffs come from `src/lineDiff.ts`, the same tested diff the chat change summary uses.
- The textarea doesn't wrap lines (`wrap="off"`), and the gutter scrolls with it, so line numbers stay aligned. The editor area is vertically resizable (420px default, 240px minimum).
- Test hooks: `aria-label="Candidate code"` and `data-testid="candidate-source"` on the textarea; `data-testid="code-editor"` on the shell.
