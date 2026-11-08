import { Badge } from './components/Common/Badge';
import { ChatMessage, toChatMessageRole } from './components/Compositions/ChatMessage';
import { Modal } from './components/Compositions/Modal';
import { Button } from './components/Common/Button';
import { isChatMode } from '../shared/generationWorkflow';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { diffFiles } from './lineDiff';
import type { Component, ComponentMessage, GenerationJob } from './useWorkspace';

export function ProjectChat({ component, messages, clear, jobs, editable, available, pending, statusLabel, cancel, send, instructionPanel, openJob }: {
  component?: Component; messages?: ComponentMessage[]; clear?: () => Promise<void>; jobs: GenerationJob[]; editable: boolean; available: boolean; pending: boolean; statusLabel: string; cancel: () => Promise<void>; send: (message: string) => Promise<void>;
  /** Code-comment instructions not yet sent; rendered as part of the conversation. */
  instructionPanel?: ReactNode;
  /** Shows a generated draft in the Code view. */
  openJob?: (jobId: bigint) => void;
}) {
  const [confirmingClear, setConfirmingClear] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [now, setNow] = useState(Date.now());
  const messageInput = useRef<HTMLTextAreaElement>(null);
  // Follow the conversation: new messages, the thinking indicator and replies scroll into view, but only
  // while the reader is already at the bottom, so reading older messages is never interrupted.
  const history = useRef<HTMLDivElement>(null);
  const following = useRef(true);
  const followKey = `${messages?.length ?? 0}:${jobs.length}:${jobs.map(job => job.state).join(',')}`;
  useEffect(() => {
    const element = history.current;
    if (element && following.current) element.scrollTop = element.scrollHeight;
  }, [followKey]);
  // Parts of a reply (such as the edited-code block) can render after the message itself; keep pinned.
  useEffect(() => {
    const element = history.current;
    if (!element || typeof MutationObserver === 'undefined') return;
    const observer = new MutationObserver(() => { if (following.current) element.scrollTop = element.scrollHeight; });
    observer.observe(element, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['open'] });
    return () => observer.disconnect();
  }, []);
  const waiting = jobs.find(job => isChatMode(job.mode) && ['queued', 'generating', 'generating_code'].includes(job.state));
  useEffect(() => {
    if (!pending && !waiting) return;
    setNow(Date.now());
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [pending, waiting?.id]);
  const elapsed = waiting ? Math.max(0, Math.floor((now - Number(waiting.createdAt.microsSinceUnixEpoch / 1000n)) / 1000)) : 0;
  useEffect(() => {
    const input = messageInput.current;
    if (!input) return;
    input.style.height = 'auto';
    input.style.height = `${Math.min(input.scrollHeight, 180)}px`;
  }, [message]);

  const turns = jobs.filter(job => isChatMode(job.mode)).sort((a, b) => a.id < b.id ? -1 : 1);
  const ordered = [...(messages ?? [])].sort((a, b) => a.id < b.id ? -1 : 1);
  const stage = waiting?.state === 'generating_code' ? 'Nemotron is writing the code changes' : 'Gemini is coordinating the change';
  const cancelReply = () => { void cancel().catch(() => setError('Cancellation could not be confirmed. Check your connection and access.')); };
  return <aside className="project-chat" aria-label="Chat with ComPlix">
    <div className="chat-heading"><h3>{component ? `Chat: ${component.name}` : 'Project chat'}</h3><Badge variant={available ? 'mint' : 'mono'} withDot className="chat-connection">{statusLabel}</Badge></div>
    {component && <><p>{component.category === 'common' ? 'Common primitive' : 'Composition'}</p>{editable && <Button type="button" variant="secondary" size="sm" className="m-0 mb-2 self-start" onClick={() => setConfirmingClear(true)}>Clear chat</Button>}
      <Modal open={confirmingClear} title={`Clear chat: ${component.name}`} onClose={() => { if (!clearing) setConfirmingClear(false); }}
        footer={<><Button type="button" variant="secondary" size="sm" className="m-0" disabled={clearing} onClick={() => setConfirmingClear(false)}>Keep chat</Button>
          <Button type="button" variant="danger" size="sm" className="m-0" disabled={clearing} onClick={() => { setClearing(true); void clear?.().then(() => setConfirmingClear(false)).catch(() => setError('Chat could not be cleared. Check your connection and access.')).finally(() => setClearing(false)); }}>Confirm clear chat</Button></>}>
        <p>Are you sure you want to clear the chat transcript for {component.name}? Your draft code will not be changed.</p>{error && <p role="alert" className="error">{error}</p>}
      </Modal></>}
    <p className="chat-intro">Ask about your library or request a component change. Drafts are not verified builds.</p>
    {!available && <p className="chat-unavailable" role="status">Chat is unavailable until the ComPlix operator configures the AI service.</p>}
    <div ref={history} className="chat-history" aria-label="Project conversation" aria-live="polite"
      onScroll={event => { const element = event.currentTarget; following.current = element.scrollHeight - element.scrollTop - element.clientHeight < 48; }}>
      {component && !messages?.length && <p className="chat-empty">Conversation memory starts from the current draft files and project guidance.</p>}
      {component && ordered.map(row => {
        const job = row.jobId === undefined ? undefined : jobs.find(item => item.id === row.jobId);
        const comment = job ? commentOrigin(job) : undefined;
        if (row.role === 'user' && comment) return <ChatMessage key={row.id.toString()} role="user" label={`You · from your comment in ${comment.file}:${comment.line}`}>{comment.text}</ChatMessage>;
        if (row.role === 'assistant' && job) return <ChatMessage key={row.id.toString()} role="assistant" extra={<ChangeSummary job={job} openJob={openJob} />}>{row.content}</ChatMessage>;
        return <ChatMessage key={row.id.toString()} role={toChatMessageRole(row.role)}>{row.content}</ChatMessage>;
      })}
      {component && waiting && <div className="chat-message-row chat-message-row-assistant chat-typing-row" role="status" aria-label="ComPlix is thinking">
        <span className="chat-speaker">ComPlix assistant</span>
        <div className="chat-typing"><span className="chat-typing-dots" aria-hidden="true"><i /><i /><i /></span>{stage}… {elapsed}s</div>
        {elapsed >= 60 && <span className="chat-typing-note">This is taking longer than expected. Requests have bounded deadlines; if it remains stuck, cancel and check your connection before retrying.</span>}
        {editable && <Button type="button" variant="secondary" size="sm" className="chat-typing-cancel" title="Discards the reply; provider usage already started may still be billed." onClick={cancelReply}>Cancel reply</Button>}
      </div>}
      {!component && !turns.length && <p className="chat-empty">Start with a question about this project or ask for a component change.</p>}
      {instructionPanel}
      {!component && turns.map(job => {
        let reply = ''; try { reply = JSON.parse(job.artifacts || '{}').reply ?? ''; } catch { /* Legacy or incomplete result. */ }
        const failed = job.state === 'failed' || job.state === 'cancelled';
        return <article key={job.id.toString()}>
          <ChatMessage role="user">{job.request}</ChatMessage>
          <ChatMessage role="assistant" error={failed} extra={failed ? undefined : <ChangeSummary job={job} openJob={openJob} />}>{failed ? job.diagnostic : reply || (job.state === 'draft_ready' ? 'An unverified draft is available in Code.' : 'Thinking…')}</ChatMessage>
        </article>;
      })}
    </div>
    {/* Component chats show progress as a typing bubble in the conversation instead. */}
    {(pending || waiting) && !(component && waiting) && <div className="chat-activity" role="status">
      <p>{waiting ? `${waiting.state === 'generating_code' ? 'Nemotron is generating changes' : 'Gemini is coordinating'} (${elapsed}s).` : 'Sending your message…'} The reply and edited code appear in the conversation when complete.</p>
      {elapsed >= 60 && <p>This is taking longer than expected. Requests have bounded deadlines; if it remains stuck, cancel and check your connection before retrying.</p>}
      {editable && waiting && <Button type="button" variant="secondary" onClick={() => { void cancel().catch(() => setError('Cancellation could not be confirmed. Check your connection and access.')); }}>Cancel reply</Button>}
      {editable && waiting && <p className="note">Cancelling discards the reply; it cannot refund or guarantee stopping provider usage.</p>}
    </div>}
    {!editable && <p className="chat-readonly">Read-only conversation. An editor can send messages.</p>}
    {error && <p className="chat-error" role="alert">{error}</p>}
    {editable && <form onSubmit={event => {
      event.preventDefault(); setError('');
      const submitted = message;
      void send(submitted).then(() => setMessage(current => current === submitted ? '' : current)).catch(cause => setError(cause instanceof Error ? cause.message : 'Message could not be confirmed. Check connection and project access.'));
    }}>
      <label htmlFor="component-chat-message">Your message</label>
      <textarea ref={messageInput} id="component-chat-message" required maxLength={4000} rows={2} disabled={pending} value={message} onChange={event => setMessage(event.target.value)} placeholder="Ask about your library or describe a change…" />
      <div className="chat-composer-footer">
        <span className="chat-character-count">{message.length} / 4000</span>
        <Button type="submit" size="sm" disabled={!available || pending || !message.trim()}>{pending ? 'Sending…' : 'Send message'}</Button>
      </div>
    </form>}
  </aside>;
}

/** The original code comment behind an editor-instruction job, if any. */
function commentOrigin(job: GenerationJob) {
  try {
    const snapshot = JSON.parse(job.snapshot);
    if (snapshot.origin !== 'editor_comment' || !snapshot.editorInstruction) return undefined;
    const { path, line, text } = snapshot.editorInstruction as { path: string; line: number; text: string };
    return { file: String(path).split('/').pop(), line, text };
  } catch { return undefined; }
}

const MAX_DIFF_LINES = 60;
/** The edited portion of a generated draft, compared with the code the request started from. */
function ChangeSummary({ job, openJob }: { job: GenerationJob; openJob?: (jobId: bigint) => void }) {
  const diffs = useMemo(() => {
    try {
      const after = JSON.parse(job.artifacts || '{}').files ?? [];
      if (!after.length) return [];
      const before = JSON.parse(job.snapshot || '{}').candidateFiles ?? [];
      return diffFiles(before, after);
    } catch { return []; }
  }, [job.id, job.artifacts, job.snapshot]);
  if (!diffs.length) return null;
  return <div className="chat-diff" aria-label="Edited code">
    {diffs.map(diff => <details key={diff.path} open={diffs.length <= 2}>
      <summary><code>{diff.path.split('/').pop()}</code>{diff.created ? ' (new file)' : ''} <span className="diff-count-added">+{diff.added}</span> <span className="diff-count-removed">−{diff.removed}</span></summary>
      <pre>{diff.lines.slice(0, MAX_DIFF_LINES).map((line, index) => <span key={index} className={'diff-line diff-' + line.kind}>
        {line.kind === 'gap' ? '⋯' : (line.kind === 'added' ? '+ ' : line.kind === 'removed' ? '− ' : '  ') + line.text}{'\n'}</span>)}
        {diff.lines.length > MAX_DIFF_LINES && <span className="diff-line diff-gap">… {diff.lines.length - MAX_DIFF_LINES} more lines{'\n'}</span>}</pre>
    </details>)}
    {openJob && <Button type="button" variant="secondary" size="sm" className="chat-diff-open" onClick={() => openJob(job.id)}>Open in editor</Button>}
  </div>;
}
