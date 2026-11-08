import { useState } from 'react';
import { CodeEditor, AGENT_HIGHLIGHT_MS } from '..';
import { Button } from '../../../Common/Button';

const before = `export function Button({ children }: { children: string }) {
  return <button className="btn">{children}</button>;
}
`;
const generated = `export function Button({ children, tone = 'primary' }: { children: string; tone?: 'primary' | 'danger' }) {
  const className = tone === 'danger' ? 'btn btn-danger' : 'btn';
  return <button className={className}>{children}</button>;
}
`;

// Demonstration only: simulates an agent edit and its fading highlight.
export default function CodeEditorPreview() {
  const [value, setValue] = useState(generated);
  const [until, setUntil] = useState(() => Date.now() + AGENT_HIGHLIGHT_MS);
  return (
    <div className="flex flex-col gap-2">
      <Button type="button" variant="secondary" size="sm" className="m-0 self-start" onClick={() => { setValue(generated); setUntil(Date.now() + AGENT_HIGHLIGHT_MS); }}>
        Replay agent change
      </Button>
      <CodeEditor key={until} filename="Common/Button/Button.tsx" value={value} onChange={setValue} before={before} generated={generated} highlightUntil={until} />
    </div>
  );
}
