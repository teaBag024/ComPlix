import { useEffect, useState } from 'react';
import type { PreviewSession, StackAdapter, StackRuntime, WorkspaceRevision } from '../shared/stackAdapters';

/** The runtime is injected by trusted orchestration; candidate files never supply URLs. */
export function StackPreview({ adapter, revision, runtime }: {
  adapter?: StackAdapter; revision: WorkspaceRevision; runtime?: StackRuntime;
}) {
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');
  useEffect(() => {
    let cancelled = false;
    let session: PreviewSession | undefined;
    setUrl(''); setError('');
    if (!adapter || !runtime) return;
    void adapter.startPreview(revision, runtime).then(async result => {
      session = result;
      if (cancelled) { await result.dispose(); return; }
      const parsed = new URL(result.url);
      if (parsed.protocol !== 'https:' || parsed.username || parsed.password || parsed.search || parsed.hash || parsed.origin === window.location.origin) {
        await result.dispose(); session = undefined;
        throw new Error('Invalid isolated preview endpoint.');
      }
      setUrl(result.url);
    }).catch(() => { if (!cancelled) setError('Preview could not start. The current library is unchanged.'); });
    return () => { cancelled = true; if (session) void session.dispose().catch(() => {}); };
  }, [adapter, revision, runtime]);
  if (!adapter) return <p>Unsupported target stack: preview unavailable.</p>;
  if (!runtime) return <p>{adapter.label}: isolated build/runtime is not connected. No generated preview has run.</p>;
  if (!url) return <p role="status">{error || 'Checking and starting isolated preview…'}</p>;
  return <iframe title="Component preview" sandbox="allow-scripts" referrerPolicy="no-referrer" src={url} />;
}
