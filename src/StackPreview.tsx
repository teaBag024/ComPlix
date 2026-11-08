import { useEffect, useRef, useState } from 'react';
import type { PreviewSession, StackAdapter, StackRuntime, WorkspaceRevision } from '../shared/stackAdapters';

/** Builds are explicit to control spend. Failed replacements retain the previous iframe. */
export function StackPreview({ adapter, revision, runtime, editable = true, active = true, flush }: {
  adapter?: StackAdapter; revision: WorkspaceRevision; runtime?: StackRuntime; editable?: boolean; active?: boolean;
  flush?: () => Promise<WorkspaceRevision>;
}) {
  const [session, setSession] = useState<PreviewSession>();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [builtRevision, setBuiltRevision] = useState('');
  const handle = useRef<PreviewSession | undefined>(undefined);
  const requested = useRef(revision);
  const mounted = useRef(true);
  const lifecycle = useRef(0);
  useEffect(() => {
    mounted.current = true;
    setSession(undefined); setBusy(false);
    return () => { lifecycle.current++; mounted.current = false; runtime?.cancelBuild?.(requested.current); void handle.current?.dispose().catch(() => {}); handle.current = undefined; };
  }, [runtime]);
  async function build() {
    if (!adapter || !runtime || busy) return;
    setBusy(true); setError('');
    const started = lifecycle.current;
    let result: PreviewSession | undefined;
    try {
      const saved = flush ? await flush() : revision;
      if (!mounted.current || lifecycle.current !== started) return;
      requested.current = saved;
      result = await adapter.startPreview(saved, runtime);
      const parsed = new URL(result.url);
      const local = parsed.protocol === 'http:' && /^127\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(parsed.hostname) && parsed.hostname !== window.location.hostname;
      if ((!local && parsed.protocol !== 'https:') || parsed.username || parsed.password || parsed.search || parsed.hash || parsed.origin === window.location.origin) throw new Error('Invalid isolated preview endpoint.');
      if (!mounted.current || lifecycle.current !== started) { await result.dispose(); return; }
      const previous = handle.current;
      handle.current = result; setSession(result); setBuiltRevision(saved.revisionId);
      void previous?.dispose().catch(() => {});
    } catch (cause) {
      if (result && handle.current !== result) void result.dispose().catch(() => {});
      if (mounted.current && lifecycle.current === started) setError(cause instanceof Error ? cause.message : 'Preview build failed.');
    } finally { if (mounted.current && lifecycle.current === started) setBusy(false); }
  }
  if (!adapter) return <p>Unsupported target stack: preview unavailable.</p>;
  if (!runtime) return <p>{adapter.label}: isolated build/runtime is not connected. No generated preview has run.</p>;
  return <div className="actual-preview">
    <button type="button" disabled={!editable || busy || !revision.sourceJobId} onClick={() => void build()}>{busy ? 'Building isolated preview...' : session ? 'Rebuild preview' : 'Build preview'}</button>
    {busy && <button type="button" className="secondary" onClick={() => runtime.cancelBuild?.(requested.current)}>Cancel preview build</button>}
    <p className="note">Builds use E2B credits. Preview compilation does not promote the draft or establish full component validation.</p>
    {error && <div role="alert"><p>Preview build failed. {session ? 'The previous preview is retained.' : 'The saved draft is unchanged.'}</p><pre>{error}</pre></div>}
    {session && <><p role="status">Compiled preview: {session.versions}. {builtRevision !== revision.revisionId ? 'Showing an earlier saved revision.' : ''}</p>{active && <iframe title="Component preview" sandbox="allow-scripts allow-same-origin" referrerPolicy="no-referrer" src={session.url} />}</>}
  </div>;
}
