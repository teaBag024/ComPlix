import type { PreviewSession, StackRuntime, WorkspaceRevision } from '../shared/stackAdapters';

export function createPreviewRuntime(endpoint: string, token: string): StackRuntime {
  const url = new URL(endpoint);
  if (url.protocol !== 'http:' || url.hostname !== '127.0.0.1' || url.username || url.password || url.search || url.hash) throw new Error('Use the local trusted preview controller.');
  const pending = new Map<string, { id: string; url: string; versions: string; expiresAt: number }>();
  const controllers = new Map<string, AbortController>();
  const key = (revision: WorkspaceRevision) => `${revision.projectId}:${revision.sourceJobId}:${revision.draftRevision}`;
  async function request(path: string, method = 'GET', body?: object, signal?: AbortSignal) {
    const response = await fetch(new URL(path, url), { method, credentials: 'omit', signal, headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
    const result = await response.json();
    if (!response.ok) throw new Error(typeof result.error === 'string' ? result.error.slice(0, 6000) : 'Preview controller rejected the request.');
    return result;
  }
  return {
    cancelBuild: revision => {
      controllers.get(key(revision))?.abort();
      const artifact = pending.get(key(revision));
      if (artifact) { pending.delete(key(revision)); void request('/sessions/' + artifact.id, 'DELETE').catch(() => {}); }
    },
    resolveDependencies: async adapterId => {
      try {
        const result = await request('/health');
        return result.stacks.includes(adapterId) ? { passed: true, diagnostics: [] } : { passed: false, diagnostics: ['This stack has no provisioned E2B template.'] };
      } catch { return { passed: false, diagnostics: ['The trusted preview controller is unavailable. Start npm run preview:start.'] }; }
    },
    compile: async (_adapterId, revision) => {
      const controller = new AbortController(); controllers.set(key(revision), controller);
      try {
        if (!revision.sourceJobId || revision.draftRevision === undefined) throw new Error('Select a saved generated draft before building.');
        const result = await request('/build', 'POST', { projectId: revision.projectId, jobId: revision.sourceJobId, revision: revision.draftRevision }, controller.signal);
        pending.set(key(revision), result);
        return { passed: true, diagnostics: [] };
      } catch (cause) { return { passed: false, diagnostics: [controller.signal.aborted ? 'Preview build cancelled.' : cause instanceof Error ? cause.message : 'Preview build failed.'] }; }
      finally { controllers.delete(key(revision)); }
    },
    validate: async (_adapterId, revision) => ({ passed: pending.has(key(revision)), diagnostics: pending.has(key(revision)) ? [] : ['No compiled artifact is available for this revision.'] }),
    startPreview: async (_adapterId, revision) => {
      const result = pending.get(key(revision));
      if (!result) throw new Error('No compiled preview artifact.');
      pending.delete(key(revision));
      let current = result; let disposed = false;
      const session: PreviewSession = { get url() { return current.url; }, get versions() { return current.versions; }, get expiresAt() { return current.expiresAt; },
        refresh: async next => {
          const replacement = pending.get(key(next));
          if (!replacement || disposed) throw new Error('No replacement preview artifact.');
          pending.delete(key(next));
          const previous = current; current = replacement;
          await request('/sessions/' + previous.id, 'DELETE').catch(() => {});
        },
        dispose: async () => { if (!disposed) { disposed = true; await request('/sessions/' + current.id, 'DELETE'); } },
      };
      return session;
    },
  };
}
