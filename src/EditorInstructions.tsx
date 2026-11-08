import { useEffect, useMemo, useRef, useState } from 'react';
import { detectEditorInstructions, INSTRUCTION_IDLE_MS } from '../shared/editorInstructions';
import type { WorkspaceFile } from '../shared/stackAdapters';
import type { DbConnection } from './module_bindings';
import type { GenerationJob, SavedEditorInstruction } from './useWorkspace';
import { Button } from './components/Button';

export function EditorInstructions({ componentId, sourceJobId, revision, files, unsaved, saveError, editable, available, busy, connection, instructions, jobs, onResult }: {
  componentId: bigint; sourceJobId: bigint; revision: bigint; files: WorkspaceFile[]; unsaved: boolean; saveError: string;
  editable: boolean; available: boolean; busy: boolean; connection: DbConnection;
  instructions: SavedEditorInstruction[]; jobs: GenerationJob[]; onResult: (jobId: bigint, sourceJobId: bigint, revision: bigint) => void;
}) {
  const markers = useMemo(() => detectEditorInstructions(files), [files]);
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const [stopping, setStopping] = useState(false);
  const attempted = useRef(new Set<string>());
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
      }).catch(() => setError('Instruction could not be confirmed. Check your connection, access, project context and request limit. Retry explicitly; it will not automatically repeat.'))
        .finally(() => setSending(false));
    }, INSTRUCTION_IDLE_MS);
    return () => window.clearTimeout(timer);
  }, [attemptKey, revision, sourceJobId, editable, available, unsaved, saveError, busy, sending, connection, files]);

  async function enable(key: string) {
    setError('');
    try { await connection.reducers.enableEditorInstruction({ sourceJobId, expectedRevision: revision, instructionKey: key }); }
    catch { setError('Instruction could not be enabled. Save the latest draft and check your access before retrying.'); }
  }

  return <section aria-label="Editor instructions" className="editor-instructions">
    <p className="note">Add a JSX <code>{'{/* @complix Make this green */}'}</code> or Razor <code>@* @complix Make this green *@</code> comment. New editor instructions run automatically after saving and a two-second pause. Keep comments complete and specific. Razor comments must precede executable Razor sections. Duplicate markers and unsupported syntax stay inactive.</p>
    <p role="status">{!editable ? 'Read-only instructions.' : !available ? 'Automatic instructions unavailable for this stack or provider configuration.' : saveError ? 'Instructions paused until the draft save succeeds.' : unsaved ? 'Waiting for autosave.' : busy || active || sending ? 'Generation in progress; further instructions wait.' : pending ? 'Instruction ready; waiting for typing to stop.' : 'No new instructions waiting.'}</p>
    {error && <p role="alert">{error}</p>}
    <ul>{markers.map(marker => {
      const record = records.find(row => row.key === `${componentId}:${marker.key}`);
      const job = jobs.find(job => job.id === record?.jobId);
      const status = job ? job.state === 'draft_ready' ? 'Completed (unverified)' : job.state === 'failed' ? job.diagnostic : job.state : record?.state ?? 'Inactive: inherited comment';
      return <li key={marker.key}><strong>{marker.path}:{marker.line}</strong> — {marker.text}<p>{status}</p>
        {editable && <Button type="button" variant="secondary" disabled={unsaved || !!saveError || busy || sending || !available} onClick={() => void enable(marker.key)}>{record?.state === 'pending' ? 'Retry instruction' : 'Run again / enable'}</Button>}
        {editable && record?.state === 'pending' && <Button type="button" variant="secondary" onClick={() => { void connection.reducers.dismissEditorInstruction({ instructionId: record.id }).catch(() => setError('Stopping this pending instruction could not be confirmed.')); }}>Dismiss instruction</Button>}
      </li>;
    })}</ul>
    {editable && active && <Button type="button" disabled={stopping} onClick={() => {
      setStopping(true); setError('');
      void connection.reducers.cancelGeneration({ jobId: active.id }).catch(() => setError('Stop could not be confirmed. Retry after checking your connection.')).finally(() => setStopping(false));
    }}>{stopping ? 'Stopping…' : 'Stop generation'}</Button>}
  </section>;
}
