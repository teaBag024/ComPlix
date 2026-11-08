import { useEffect, useMemo, useRef, useState } from 'react';
import { detectEditorInstructions, INSTRUCTION_IDLE_MS } from '../shared/editorInstructions';
import type { WorkspaceFile } from '../shared/stackAdapters';
import type { DbConnection } from './module_bindings';
import type { GenerationJob, SavedEditorInstruction } from './useWorkspace';
import { Button } from './components/Common/Button';

export function EditorInstructions({ componentId, sourceJobId, revision, files, unsaved, saveError, editable, available, busy, connection, instructions, jobs, onResult }: {
  componentId: bigint; sourceJobId: bigint; revision: bigint; files: WorkspaceFile[]; unsaved: boolean; saveError: string;
  editable: boolean; available: boolean; busy: boolean; connection: DbConnection;
  instructions: SavedEditorInstruction[]; jobs: GenerationJob[]; onResult: (jobId: bigint, sourceJobId: bigint, revision: bigint) => void;
}) {
  const markers = useMemo(() => detectEditorInstructions(files), [files]);
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const attempted = useRef(new Set<string>());
  // A run rejected for an expired sign-in or lost connection is retried once a new connection exists.
  const retryAfter = useRef<{ key: string; connection: DbConnection } | undefined>(undefined);
  if (retryAfter.current && retryAfter.current.connection !== connection) { attempted.current.delete(retryAfter.current.key); retryAfter.current = undefined; }
  const latest = useRef({ onResult, sourceJobId, revision });
  latest.current = { onResult, sourceJobId, revision };
  const records = instructions.filter(row => row.componentId === componentId);
  const pending = records.find(row => row.sourceJobId === sourceJobId && row.revision === revision && row.state === 'pending' && markers.some(marker => row.key === `${componentId}:${marker.key}`));
  const attemptKey = pending ? `${pending.id}:${pending.updatedAt.microsSinceUnixEpoch}` : '';
  const active = records.map(row => jobs.find(job => job.id === row.jobId)).find(job => job && !['draft_ready', 'failed', 'cancelled'].includes(job.state));

  useEffect(() => {
    if (!pending || !editable || !available || unsaved || saveError || busy || sending || attempted.current.has(attemptKey)) return;
    const timer = window.setTimeout(() => {
      attempted.current.add(attemptKey);
      setSending(true); setError('');
      void connection.procedures.runEditorInstruction({ instructionId: pending.id, expectedRevision: revision }).then(() => {
        const record = [...connection.db.visibleEditorInstructions.iter()].find(row => row.id === pending.id);
        const result = record && [...connection.db.visibleGenerationJobs.iter()].find(job => job.id === record.jobId);
        if (result?.state === 'draft_ready' && latest.current.sourceJobId === sourceJobId && latest.current.revision === revision) latest.current.onResult(result.id, sourceJobId, revision);
      }).catch(cause => {
        const message = String(cause);
        if (message.includes('Your session expired') || /disconnect|not connected|websocket|closed|timed out/i.test(message)) {
          retryAfter.current = { key: attemptKey, connection };
          setError('Waiting for your sign-in to renew; the instruction will run automatically.');
        } else setError('Instruction could not be confirmed. Check your connection, access, project context and request limit. Retry explicitly; it will not automatically repeat.');
      })
        .finally(() => setSending(false));
    }, INSTRUCTION_IDLE_MS);
    return () => window.clearTimeout(timer);
  }, [attemptKey, revision, sourceJobId, editable, available, unsaved, saveError, busy, sending, connection, files]);

  async function enable(key: string) {
    setError('');
    try { await connection.reducers.enableEditorInstruction({ sourceJobId, expectedRevision: revision, instructionKey: key }); }
    catch { setError('Instruction could not be enabled. Save the latest draft and check your access before retrying.'); }
  }

  // Submitted instructions continue in the chat transcript; this panel shows only comments not yet sent.
  const waitingMarkers = markers.filter(marker => !records.find(row => row.key === `${componentId}:${marker.key}`)?.jobId);
  const waitingLabel = !available ? 'Unavailable for this stack or provider configuration.' : saveError ? 'Paused until your draft saves.' : unsaved ? 'Waiting for autosave…'
    : busy || active || sending ? 'Waiting for the current reply to finish…' : 'Sending when you stop typing…';
  return <section aria-label="Editor instructions" className="chat-instructions">
    {!waitingMarkers.length && !error && editable && !active && !busy && !sending && <p className="chat-instructions-hint">Tip: write a comment like <code>{'// @complix make this green'}</code> in the code and ComPlix picks it up here.</p>}
    {error && <p role="alert" className="chat-instructions-error">{error}</p>}
    <ul>{waitingMarkers.map(marker => {
      const record = records.find(row => row.key === `${componentId}:${marker.key}`);
      const state = record?.state ?? 'inherited';
      const status = state === 'pending' ? waitingLabel : state === 'blocked' ? 'Couldn’t start (another reply running or the request limit). Retry when ready.'
        : state === 'dismissed' ? 'Dismissed.' : 'Already in the code before your edit, so it won’t run by itself.';
      return <li key={marker.key} className="chat-message-row chat-message-row-user">
        <span className="chat-speaker">You · from your comment in {marker.path.split('/').pop()}:{marker.line}</span>
        <div className="chat-instruction-bubble">{marker.text}</div>
        <span className="chat-instruction-status" role="status">{!editable ? 'Read-only.' : status}</span>
        {editable && state !== 'pending' && <Button type="button" variant="secondary" size="sm" disabled={unsaved || !!saveError || busy || sending || !available} onClick={() => void enable(marker.key)}>{state === 'blocked' ? 'Retry instruction' : 'Run again / enable'}</Button>}
        {editable && state === "pending" && record && <Button type="button" variant="secondary" size="sm" onClick={() => { void connection.reducers.dismissEditorInstruction({ instructionId: record.id }).catch(() => setError('Stopping this pending instruction could not be confirmed.')); }}>Dismiss instruction</Button>}
      </li>;
    })}</ul>
    {/* A running instruction is stopped with "Cancel reply" on the chat's typing bubble. */}
  </section>;
}
