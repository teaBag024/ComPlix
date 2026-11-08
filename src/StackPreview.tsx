import { Button } from './components/Common/Button';
import { useEffect, useRef, useState } from 'react';
import type { StackAdapter } from '../shared/stackAdapters';
import type { ComponentPreview } from './useWorkspace';
import type { DbConnection } from './module_bindings';

type AgentStatus = { status: 'idle' | 'building' | 'ready' | 'failed'; requested: string; built: string; log: string };
const SAVE_SETTLE_MS = 1000;
const safeMessages = ['Previews are not configured.', 'Unsupported target stack', 'Preview sandbox', 'Add a runnable preview entry', 'Draft changed.', 'Project edit access is required.', 'Remove credentials', 'Select a saved draft', 'Unsafe preview file manifest.', 'Preview source exceeds', 'Preview requires', 'Your session expired.'];

/**
 * Sandbox-hosted preview. Every confirmed draft save (once edits settle) pushes that revision to the
 * component's E2B sandbox through SpacetimeDB; the sandbox builds and serves it on its own origin.
 * The last successful render stays visible under a loading overlay while a rebuild runs.
 */
export function StackPreview({ adapter, connection, jobId, savedRevision, unsaved, preview, editable, active }: {
  adapter?: StackAdapter; connection: DbConnection; jobId?: bigint; savedRevision: bigint; unsaved: boolean;
  preview?: ComponentPreview; editable: boolean; active: boolean;
}) {
  const [requesting, setRequesting] = useState(false);
  const [error, setError] = useState('');
  const [agent, setAgent] = useState<AgentStatus>();
  const [frameKey, setFrameKey] = useState('');
  const inFlight = useRef<bigint | undefined>(undefined);
  // A failed revision is not retried automatically, except a session-expiry rejection: that one is
  // retried once the workspace reconnects with the renewed sign-in token (a new connection object).
  const failed = useRef<{ key: string; staleConnection?: DbConnection }>({ key: '' });
  const [awaitingSession, setAwaitingSession] = useState(false);
  const expired = !!preview && Number(preview.expiresAt.microsSinceUnixEpoch / 1000n) < Date.now() + 15000;
  const current = !!preview && !expired && preview.revision === savedRevision;

  async function build(revision: bigint) {
    if (!jobId || inFlight.current !== undefined) return;
    inFlight.current = revision; setRequesting(true); setError('');
    try { await connection.procedures.buildComponentPreview({ jobId, expectedRevision: revision }); failed.current = { key: '' }; setAwaitingSession(false); }
    catch (cause) {
      const text = typeof cause === 'string' ? cause : cause instanceof Error ? cause.message : '';
      if (text.includes('Your session expired')) {
        failed.current = { key: `${jobId}:${revision}`, staleConnection: connection };
        setAwaitingSession(true);
        return;
      }
      failed.current = { key: `${jobId}:${revision}` };
      setError(safeMessages.some(prefix => text.includes(prefix)) ? text.slice(0, 400) : 'Preview could not be started. Check your connection and try again.');
    } finally { inFlight.current = undefined; setRequesting(false); }
  }

  // Rebuild on save: once the saved revision is stable and differs from the sandbox's revision.
  useEffect(() => {
    if (!active || !editable || !adapter || !jobId || unsaved || current || requesting) return;
    const previous = failed.current;
    if (previous.key === `${jobId}:${savedRevision}` && (!previous.staleConnection || previous.staleConnection === connection)) return;  // Wait for the next save, a renewed connection or a manual retry.
    const timer = window.setTimeout(() => void build(savedRevision), SAVE_SETTLE_MS);
    return () => window.clearTimeout(timer);
  }, [active, editable, adapter, jobId, unsaved, current, requesting, savedRevision, connection]);

  // Follow the sandbox build status; reload the frame when a new revision has been built.
  useEffect(() => {
    if (!active || !preview || expired) { setAgent(undefined); return; }
    let stopped = false; let timer = 0; let misses = 0;
    const poll = async () => {
      try {
        const response = await fetch(preview.url + '__status', { cache: 'no-store', credentials: 'omit' });
        const status = await response.json() as AgentStatus;
        if (stopped) return;
        misses = 0; setAgent(status);
        if (status.built) setFrameKey(key => key === `${preview.url}:${status.built}` ? key : `${preview.url}:${status.built}`);
        const settled = status.status !== 'building' && status.requested === preview.revision.toString();
        timer = window.setTimeout(poll, settled ? 5000 : 1000);
      } catch {
        if (stopped) return;
        if (++misses === 5) setError('Preview sandbox is unreachable. Choose Rebuild to start a new one.');
        timer = window.setTimeout(poll, 2000);
      }
    };
    void poll();
    return () => { stopped = true; window.clearTimeout(timer); };
  }, [active, preview?.url, preview?.revision, expired]);

  if (!adapter) return <p>Unsupported target stack: preview unavailable. Code and Docs remain available.</p>;
  if (!jobId) return <p>Select a saved draft to preview it.</p>;
  const building = requesting || unsaved || agent?.status === 'building' || (!!preview && agent?.requested !== undefined && agent.requested !== preview.revision.toString());
  const label = unsaved ? 'Saving changes…' : requesting ? 'Starting preview sandbox…' : 'Building preview…';
  return <div className="actual-preview">
    <div className="preview-toolbar">
      <span role="status">{awaitingSession && !requesting ? 'Renewing your sign-in, then retrying the preview…' : building ? label : agent?.status === 'failed' ? 'Last build failed — showing the previous successful render.' : preview && !expired ? `Preview of saved revision ${agent?.built || preview.revision.toString()}.` : editable ? 'Preview starts automatically.' : 'No live preview. An editor must open Preview to start one.'}</span>
      {editable && <Button type="button" variant="secondary" size="sm" disabled={requesting || unsaved} onClick={() => { failed.current = { key: '' }; void build(savedRevision); }}>Rebuild</Button>}
    </div>
    {error && <div role="alert"><p>Preview build failed. The saved draft is unchanged.</p><pre>{error}</pre></div>}
    {agent?.status === 'failed' && agent.log && <div role="alert"><p>Build errors</p><pre>{agent.log}</pre></div>}
    <div className="preview-stage">
      {active && preview && !expired && agent?.built && <iframe key={frameKey} title="Component preview" sandbox="allow-scripts allow-same-origin" referrerPolicy="no-referrer" src={preview.url} />}
      {(building || (preview && !agent?.built)) && <div className="preview-loading" aria-hidden="true"><div className="preview-spinner" /><p>{label}</p></div>}
    </div>
    <p className="note">Runs in an isolated E2B sandbox and uses E2B credits. A successful preview does not promote the draft or establish full component validation.</p>
  </div>;
}
