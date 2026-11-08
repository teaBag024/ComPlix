import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { diffLines } from '../lineDiff';

export const AGENT_HIGHLIGHT_MS = 10000;

export function CodeEditor({ value, readOnly, onChange, before, generated, highlightUntil = 0 }: {
  value: string; readOnly: boolean; onChange: (value: string) => void;
  before: string; generated: string; highlightUntil?: number;
}) {
  const [expired, setExpired] = useState(false);
  const [edited, setEdited] = useState(false);
  const animationDelay = useMemo(() => Math.min(0, highlightUntil - Date.now() - AGENT_HIGHLIGHT_MS), [highlightUntil]);
  useEffect(() => {
    setExpired(Date.now() >= highlightUntil);
    const timer = window.setTimeout(() => setExpired(true), Math.max(0, highlightUntil - Date.now()));
    return () => window.clearTimeout(timer);
  }, [highlightUntil]);
  const ranges = useMemo(() => {
    if (!highlightUntil) return [];
    const lines = diffLines(before, generated, 0).lines.filter(line => line.kind === 'added' && line.newLine !== undefined);
    const groups: Array<{ start: number; end: number }> = [];
    for (const line of lines) {
      const index = line.newLine!;
      const last = groups[groups.length - 1];
      if (last && last.end + 1 === index) last.end = index;
      else groups.push({ start: index, end: index });
    }
    return groups;
  }, [before, generated, highlightUntil]);
  const highlight = !expired && !edited && highlightUntil > Date.now() && value === generated && ranges.length > 0;
  const style: CSSProperties | undefined = highlight ? {
    backgroundImage: 'linear-gradient(to bottom, ' + ranges.flatMap(range => {
      const start = `calc(var(--code-line-height) * ${range.start})`;
      const end = `calc(var(--code-line-height) * ${range.end + 1})`;
      return [`transparent ${start}`, `var(--agent-change-color) ${start}`, `var(--agent-change-color) ${end}`, `transparent ${end}`];
    }).join(', ') + ')',
    backgroundSize: `100% calc(var(--code-line-height) * ${value.split('\n').length})`,
    animationDelay: `${animationDelay}ms`,
  } : undefined;
  return <textarea className={'code-editor' + (highlight ? ' agent-code-highlight' : '')} style={style}
    aria-label="Candidate code" data-testid="candidate-source" spellCheck={false} readOnly={readOnly} value={value}
    onChange={event => { setEdited(true); onChange(event.target.value); }} />;
}
