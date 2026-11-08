import { useEffect, useRef, useState } from 'react';
import type { DbConnection } from './module_bindings';
import type { ComponentDraft } from './useWorkspace';
import type { WorkspaceFile } from '../shared/stackAdapters';
import { validateDraftFiles } from '../shared/draftFiles';

const safeErrors = ['Draft changed. Your local edits were not overwritten.', 'Project edit access is required.',
  'Only generated code drafts can be edited.', 'Draft files exceed 256 KiB.', 'Remove credentials from draft files.'];
// Failures that a fresh connection can fix: an expired sign-in (renewal reconnects) or a dropped/slow connection.
export const SESSION_WAIT = 'Your sign-in is being renewed. Edits are kept and will save automatically.';
const CONNECTION_WAIT = 'Draft save could not be confirmed. Your local edits are still shown and will retry when the connection is restored.';
const transient = (message: string) => message.includes('Your session expired') || message.includes('timed out') || /disconnect|not connected|websocket|closed/i.test(message);
type EditorState = { id?: bigint; files: WorkspaceFile[]; saved: string; revision: bigint; saving: boolean; error: string; failedOn?: DbConnection };

export function useDraftEditor(connection: DbConnection, jobId: bigint | undefined, original: WorkspaceFile[], saved?: ComponentDraft) {
  const [, render] = useState(0);
  const makeState = (): EditorState => {
    const files = saved?.files ?? original;
    return { id: jobId, files, saved: JSON.stringify(files), revision: saved?.revision ?? 0n, saving: false, error: '' };
  };
  const state = useRef<EditorState>(makeState());
  const inFlight = useRef<Promise<void> | undefined>(undefined);
  const mounted = useRef(true);
  const update = () => { if (mounted.current) render(value => value + 1); };
  // Navigation within the library is disabled while dirty. A different project gets a new hook.
  if (state.current.id !== jobId) state.current = makeState();
  const current = state.current;
  const dirty = () => JSON.stringify(state.current.files) !== state.current.saved;
  async function flush() {
    if (inFlight.current) await inFlight.current;
    if (!dirty() || state.current.id === undefined) return state.current.revision;
    if (state.current.error) throw new Error(state.current.error);
    const attempt = state.current;
    const save = async () => {
      attempt.saving = true; update();
      try {
        while (state.current === attempt && JSON.stringify(attempt.files) !== attempt.saved) {
          const files = validateDraftFiles(attempt.files);
          const serialized = JSON.stringify(files);
          let timer: number | undefined;
          try {
            await Promise.race([
              connection.reducers.saveComponentDraft({ jobId: attempt.id!, expectedRevision: attempt.revision, files }),
              new Promise<never>((_, reject) => { timer = window.setTimeout(() => reject(new Error('Draft save confirmation timed out.')), 10000); }),
            ]);
          } finally { window.clearTimeout(timer); }
          attempt.revision += 1n;
          attempt.saved = serialized;
        }
      } catch (cause) {
        const message = String(cause);
        attempt.error = safeErrors.find(item => message.includes(item))
          ?? (message.includes('Your session expired') ? SESSION_WAIT : transient(message) ? CONNECTION_WAIT : 'Draft save could not be confirmed. Your local edits are still shown. Check your connection and retry.');
        attempt.failedOn = connection;
        throw new Error(attempt.error);
      } finally { attempt.saving = false; update(); }
    };
    const promise = save(); inFlight.current = promise;
    try { await promise; } finally { if (inFlight.current === promise) inFlight.current = undefined; }
    return attempt.revision;
  }
  useEffect(() => {
    mounted.current = true;
    const warn = (event: BeforeUnloadEvent) => { if (dirty() || state.current.saving) { event.preventDefault(); event.returnValue = ''; } };
    window.addEventListener('beforeunload', warn);
    return () => {
      // Flush the final checkpoint when leaving a project or route without waiting for the debounce.
      void flush().catch(() => {});
      mounted.current = false; window.removeEventListener('beforeunload', warn);
    };
  }, []);
  // An incoming collaborator edit is adopted only while clean. Never replace unsaved local text.
  useEffect(() => {
    // A selected job can finish generation without changing its ID.
    if (!saved && current.revision === 0n && !current.saving && !dirty() && current.saved !== JSON.stringify(original)) {
      current.files = original; current.saved = JSON.stringify(original); update(); return;
    }
    if (!saved || saved.jobId !== current.id || current.saving || saved.revision <= current.revision) return;
    if (dirty() && JSON.stringify(current.files) !== JSON.stringify(saved.files)) {
      if (current.error === 'Draft changed. Your local edits were not overwritten.') return;
      current.error = 'Draft changed. Your local edits were not overwritten.';
    }
    else { current.files = saved.files; current.saved = JSON.stringify(saved.files); current.revision = saved.revision; current.error = ''; }
    update();
  });
  useEffect(() => {
    if (!dirty() || current.error || current.saving) return;
    const timer = window.setTimeout(() => { void flush().catch(() => {}); }, 500);
    return () => window.clearTimeout(timer);
  });
  // A renewed sign-in or restored connection arrives as a new connection object: retry the waiting save on it.
  useEffect(() => {
    if (!current.error || !(current.error === SESSION_WAIT || current.error === CONNECTION_WAIT) || current.failedOn === connection) return;
    current.error = ''; current.failedOn = undefined; update();
    void flush().catch(() => {});
  }, [connection, current.error]);
  return {
    files: current.files, revision: current.revision, unsaved: dirty() || current.saving,
    error: current.error, status: current.error === SESSION_WAIT || current.error === CONNECTION_WAIT ? 'Waiting to save…' : current.error ? 'Draft not saved' : current.saving ? 'Saving draft…' : dirty() ? 'Unsaved draft changes' : saved || current.revision ? 'Draft saved' : 'Unverified generated draft',
    change(path: string, content: string) {
      current.files = current.files.map(file => file.path === path ? { ...file, content } : file);
      update();
    },
    flush,
    isUnsaved: () => dirty() || state.current.saving,
    retry() { if (current.error.includes('Draft changed.')) return; current.error = ''; update(); void flush().catch(() => {}); },
    reload() { state.current = makeState(); update(); },
  };
}
