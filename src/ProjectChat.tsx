import { Badge } from './components/Badge';
import { ChatMessage } from './components/ChatMessage';
import { Button } from './components/Button';
import { isChatMode } from '../shared/generationWorkflow';
import { useEffect, useRef, useState } from 'react';
import type { Component, ComponentMessage, GenerationJob } from './useWorkspace';

export function ProjectChat({ component, messages, clear, jobs, editable, available, pending, statusLabel, cancel, send }: {
  component?: Component; messages?: ComponentMessage[]; clear?: () => Promise<void>; jobs: GenerationJob[]; editable: boolean; available: boolean; pending: boolean; statusLabel: string; cancel: () => Promise<void>; send: (message: string) => Promise<void>;
}) {
  const confirmation = useRef<HTMLDialogElement>(null);
  const [clearing, setClearing] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [now, setNow] = useState(Date.now());
  const messageInput = useRef<HTMLTextAreaElement>(null);
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
  return <aside className="project-chat" aria-label="Chat with ComPlix">
    <div className="chat-heading"><h3>{component ? `Chat: ${component.name}` : 'Project chat'}</h3><Badge className={`chat-connection${available ? ' is-available' : ''}`}>{statusLabel}</Badge></div>
    {component && <><p>{component.category === 'common' ? 'Common primitive' : 'Composition'}</p>{editable && <Button type="button" variant="secondary" onClick={() => confirmation.current?.showModal()}>Clear chat</Button>}
      <dialog ref={confirmation} aria-labelledby="clear-chat-title"><h3 id="clear-chat-title">Clear chat: {component.name}</h3><p>Are you sure you want to clear the chat transcript for {component.name}? Your draft code will not be changed.</p>{error && <p role="alert">{error}</p>}<Button disabled={clearing} onClick={() => confirmation.current?.close()}>Keep chat</Button><Button disabled={clearing} onClick={() => { setClearing(true); void clear?.().then(() => confirmation.current?.close()).catch(() => setError('Chat could not be cleared. Check your connection and access.')).finally(() => setClearing(false)); }}>Confirm clear chat</Button></dialog></>}
    <p className="chat-intro">Ask about your library or request a component change. Drafts are not verified builds.</p>
    {!available && <p className="chat-unavailable" role="status">Chat is unavailable until the ComPlix operator configures the AI service.</p>}
    <div className="chat-history" aria-label="Project conversation" aria-live="polite">
      {component && !messages?.length && <p className="chat-empty">Conversation memory starts from the current draft files and project guidance.</p>}
      {component && messages?.map(row => <ChatMessage key={row.id.toString()} role={row.role}>{row.content}</ChatMessage>)}
      {!component && !turns.length && <p className="chat-empty">Start with a question about this project or ask for a component change.</p>}
      {!component && turns.map(job => {
        let reply = ''; try { reply = JSON.parse(job.artifacts || '{}').reply ?? ''; } catch { /* Legacy or incomplete result. */ }
        const failed = job.state === 'failed' || job.state === 'cancelled';
        return <article key={job.id.toString()}>
          <ChatMessage role="user">{job.request}</ChatMessage>
          <ChatMessage role="assistant" error={failed}>{failed ? job.diagnostic : reply || (job.state === 'draft_ready' ? 'An unverified draft is available in Code.' : 'Thinking…')}</ChatMessage>
        </article>;
      })}
    </div>
    {(pending || waiting) && <div className="chat-activity" role="status">
      <p>{waiting ? `${waiting.state === 'generating_code' ? 'Nemotron is generating changes' : 'Gemini is coordinating'} (${elapsed}s).` : 'Sending your message…'} Replies appear when the complete response arrives.</p>
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
        <Button type="submit" disabled={!available || pending || !message.trim()}>{pending ? 'Sending…' : 'Send message'}</Button>
      </div>
    </form>}
  </aside>;
}
