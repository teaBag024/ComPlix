import { isChatMode } from '../shared/generationWorkflow';
import { useEffect, useState } from 'react';
import type { GenerationJob } from './useWorkspace';

export function ProjectChat({ jobs, editable, available, pending, statusLabel, cancel, send }: {
  jobs: GenerationJob[]; editable: boolean; available: boolean; pending: boolean; statusLabel: string; cancel: () => Promise<void>; send: (message: string) => Promise<void>;
}) {
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [now, setNow] = useState(Date.now());
  const waiting = jobs.find(job => isChatMode(job.mode) && ['queued', 'generating', 'generating_code'].includes(job.state));
  useEffect(() => {
    if (!pending && !waiting) return;
    setNow(Date.now());
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [pending, waiting?.id]);
  const elapsed = waiting ? Math.max(0, Math.floor((now - Number(waiting.createdAt.microsSinceUnixEpoch / 1000n)) / 1000)) : 0;

  const turns = jobs.filter(job => isChatMode(job.mode)).sort((a, b) => a.id < b.id ? -1 : 1);
  return <aside className="project-chat" aria-label="Chat with ComPlix">
    <div className="chat-heading"><h3>Project chat</h3><span className="badge">{available ? 'Connected' : 'Unavailable'}</span></div>
    <p className="status"><strong>{statusLabel}</strong></p>
    <p className="note">Ask about this library or request a component change. Gemini coordinates chat and asks Nemotron for code changes. Drafts are not verified builds.</p>
    {!available && <p role="status">Chat is unavailable until the ComPlix operator configures the AI service.</p>}
    <div className="chat-history" aria-label="Project conversation" aria-live="polite">
      {!turns.length && <p>No messages yet. Ask about your library or describe your first Common component.</p>}
      {turns.map(job => {
        let reply = ''; try { reply = JSON.parse(job.artifacts || '{}').reply ?? ''; } catch { /* Legacy or incomplete result. */ }
        return <article key={job.id.toString()}>
          <p><strong>Project member</strong></p><p className="chat-message">{job.request}</p>
          <p><strong>ComPlix</strong></p><p className="chat-message">{job.state === 'failed' || job.state === 'cancelled' ? job.diagnostic : reply || (job.state === 'draft_ready' ? 'An unverified draft is available in Code.' : 'Thinking…')}</p>
        </article>;
      })}
    </div>
    {(pending || waiting) && <div role="status">
      <p>{waiting ? `${waiting.state === 'generating_code' ? 'Nemotron is generating changes' : 'Gemini is coordinating'} (${elapsed}s).` : 'Sending your message…'} Replies appear when the complete response arrives.</p>
      {elapsed >= 60 && <p>This is taking longer than expected. Requests have bounded deadlines; if it remains stuck, cancel and check your connection before retrying.</p>}
      {editable && waiting && <button type="button" className="secondary" onClick={() => { void cancel().catch(() => setError('Cancellation could not be confirmed. Check your connection and access.')); }}>Cancel reply</button>}
      {editable && waiting && <p className="note">Cancelling discards the reply; it cannot refund or guarantee stopping provider usage.</p>}
    </div>}
    {!editable && <p>Read-only conversation. An editor can send messages.</p>}
    {error && <p role="alert">{error}</p>}
    {editable && <form onSubmit={event => {
      event.preventDefault(); setError('');
      const submitted = message;
      void send(submitted).then(() => setMessage(current => current === submitted ? '' : current)).catch(cause => setError(cause instanceof Error ? cause.message : 'Message could not be confirmed. Check connection and project access.'));
    }}>
      <label htmlFor="component-chat-message">Your message</label>
      <textarea id="component-chat-message" required maxLength={4000} rows={4} disabled={pending} value={message} onChange={event => setMessage(event.target.value)} placeholder="For example: create a compact Common Button using this project's stack" />
      <button type="submit" disabled={!available || pending || !message.trim()}>{pending ? 'Waiting for ComPlix…' : 'Send message'}</button>
    </form>}
  </aside>;
}
