import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { Badge } from '../../Common/Badge';
import { Button } from '../../Common/Button';
import { cn } from '../../../lib/utils';
import { diffLines } from '../../../lineDiff';

export const AGENT_HIGHLIGHT_MS = 10000;

export type CodeEditorProps = {
  value: string;
  readOnly?: boolean;
  onChange?: (value: string) => void;
  /** Source before the latest agent change; with `generated`, drives the fading change highlight. */
  before?: string;
  /** Source the agent produced. Highlights show only while `value` still equals it. */
  generated?: string;
  /** Epoch milliseconds when the agent-change highlight ends; 0 disables it. */
  highlightUntil?: number;
  /** File path shown in the tab; its extension picks the status-bar language label. */
  filename?: string;
  className?: string;
};

type Range = { start: number; end: number };

const languages: Record<string, string> = {
  tsx: 'TypeScript JSX', ts: 'TypeScript', jsx: 'JavaScript JSX', js: 'JavaScript', razor: 'Razor', cs: 'C#',
  css: 'CSS', scss: 'SCSS', html: 'HTML', md: 'Markdown', mdx: 'MDX', json: 'JSON', xml: 'XML',
};

function languageOf(filename: string) {
  const extension = filename.split('.').pop()?.toLowerCase() ?? '';
  return languages[extension] ?? 'Plain text';
}

/** Zero-based line ranges added by the agent, in the generated file's line numbering. */
function addedRanges(before: string, generated: string) {
  const diff = diffLines(before, generated, 0);
  const ranges: Range[] = [];
  for (const line of diff.lines) {
    if (line.kind !== 'added' || line.newLine === undefined) continue;
    const last = ranges[ranges.length - 1];
    if (last && last.end + 1 === line.newLine) last.end = line.newLine;
    else ranges.push({ start: line.newLine, end: line.newLine });
  }
  return { ranges, added: diff.added, removed: diff.removed };
}

export function CodeEditor({
  value,
  readOnly = false,
  onChange,
  before = '',
  generated = '',
  highlightUntil = 0,
  filename = 'Source.tsx',
  className,
}: CodeEditorProps) {
  const [edited, setEdited] = useState(false);
  const [expired, setExpired] = useState(false);
  const [copied, setCopied] = useState<'idle' | 'copied' | 'failed'>('idle');
  const [cursor, setCursor] = useState(0);
  const textarea = useRef<HTMLTextAreaElement>(null);
  const gutter = useRef<HTMLDivElement>(null);

  const lineCount = Math.max(1, value.split('\n').length);
  const beforeCursor = value.slice(0, cursor).split('\n');
  const currentLine = beforeCursor.length;
  const currentCol = (beforeCursor[beforeCursor.length - 1] ?? '').length + 1;

  // Keep the CSS fade in step with the real expiry, even when the editor mounts partway through it.
  const animationDelay = useMemo(() => Math.min(0, highlightUntil - Date.now() - AGENT_HIGHLIGHT_MS), [highlightUntil]);
  useEffect(() => {
    setExpired(Date.now() >= highlightUntil);
    const timer = window.setTimeout(() => setExpired(true), Math.max(0, highlightUntil - Date.now()));
    return () => window.clearTimeout(timer);
  }, [highlightUntil]);

  // A new file has an empty `before`, so all of its lines count as agent additions.
  const changes = useMemo(() => generated ? addedRanges(before, generated) : undefined, [before, generated]);
  const highlight = !!highlightUntil && !expired && !edited && highlightUntil > Date.now() && value === generated && !!changes?.ranges.length;
  const highlightStyle: CSSProperties | undefined = highlight ? {
    backgroundImage: 'linear-gradient(to bottom, ' + changes!.ranges.flatMap(range => {
      const start = `calc(var(--code-line-height) * ${range.start})`;
      const end = `calc(var(--code-line-height) * ${range.end + 1})`;
      return [`transparent ${start}`, `var(--agent-change-color) ${start}`, `var(--agent-change-color) ${end}`, `transparent ${end}`];
    }).join(', ') + ')',
    backgroundSize: `100% calc(var(--code-line-height) * ${lineCount})`,
    animationDelay: `${animationDelay}ms`,
  } : undefined;

  useEffect(() => {
    if (copied === 'idle') return;
    const timer = window.setTimeout(() => setCopied('idle'), 1800);
    return () => window.clearTimeout(timer);
  }, [copied]);

  const trackCursor = () => setCursor(textarea.current?.selectionStart ?? 0);

  return (
    <section
      className={cn('code-editor-shell overflow-hidden rounded-[2px] border border-strong bg-elevated font-mono', className)}
      style={{ '--code-line-height': '20px' } as CSSProperties}
      aria-label="Code editor"
      data-testid="code-editor"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-subtle bg-header px-2.5 py-1.5">
        <span className="max-w-full truncate rounded-[2px] border border-strong bg-tab-active px-2.5 py-1 text-[11px] font-semibold text-ink" title={filename}>
          {filename.split('/').pop()}
        </span>
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant="lemon" withDot>Unverified draft</Badge>
          {readOnly && <Badge variant="rose">Read-only</Badge>}
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="m-0 font-mono"
            aria-label="Copy source"
            onClick={() => {
              void navigator.clipboard?.writeText(value).then(() => setCopied('copied'), () => setCopied('failed'));
            }}
          >
            {copied === 'copied' ? 'Copied' : copied === 'failed' ? 'Copy failed' : 'Copy'}
          </Button>
        </div>
      </div>

      <div className="grid h-[420px] min-h-[240px] resize-y grid-cols-[44px_minmax(0,1fr)] overflow-hidden bg-canvas">
        <div
          ref={gutter}
          className="overflow-hidden border-r border-subtle bg-surface py-3 pr-2 text-right text-[11px] leading-(--code-line-height) text-ink-muted select-none"
          aria-hidden="true"
        >
          {Array.from({ length: lineCount }, (_, index) => <div key={index}>{index + 1}</div>)}
        </div>
        <textarea
          ref={textarea}
          className={cn(
            'code-editor m-0 block h-full w-full resize-none overflow-auto rounded-none border-0 bg-transparent p-3 font-mono text-[12px] leading-(--code-line-height) whitespace-pre text-ink [tab-size:2] outline-none focus-visible:outline-none',
            highlight && 'agent-code-highlight'
          )}
          style={highlightStyle}
          wrap="off"
          aria-label="Candidate code"
          data-testid="candidate-source"
          spellCheck={false}
          readOnly={readOnly}
          value={value}
          onChange={event => { setEdited(true); onChange?.(event.target.value); trackCursor(); }}
          onSelect={trackCursor}
          onScroll={event => { if (gutter.current) gutter.current.scrollTop = event.currentTarget.scrollTop; }}
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-subtle bg-surface px-2.5 py-1 text-[10.5px] text-ink-secondary">
        <div className="flex flex-wrap items-center gap-3">
          <span>UTF-8 · {languageOf(filename)}</span>
          <span>Ln {currentLine}, Col {currentCol}</span>
          <span>Lines {lineCount}</span>
        </div>
        {changes && (changes.added > 0 || changes.removed > 0) && (
          <div className="flex items-center gap-2 font-medium" title="Lines changed by the latest generation">
            <span className="text-[#065F46] dark:text-[#6EE7B7]">+{changes.added}</span>
            <span className="text-[#9F1239] dark:text-[#FDA4AF]">−{changes.removed}</span>
          </div>
        )}
      </div>
    </section>
  );
}
