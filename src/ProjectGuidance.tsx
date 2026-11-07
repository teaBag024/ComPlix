import { useEffect, useRef, useState } from 'react';
import type { DbConnection } from './module_bindings';
import { endpoint, database, type Guidance } from './useWorkspace';

const questions = {
  audience: 'Audience and component needs', technical: 'Technical requirements and integration constraints',
  style: 'Visual style', colors: 'Colors', typography: 'Typography', spacing: 'Spacing and density',
  accessibility: 'Accessibility requirements', guidance: 'Project design guidance',
};
type Answers = Record<keyof typeof questions, string>;
const blank: Answers = { audience: '', technical: '', style: '', colors: '', typography: '', spacing: '', accessibility: '', guidance: '' };
function answers(row?: Guidance): Answers {
  return Object.fromEntries(Object.keys(blank).map(key => [key, row?.[key as keyof Answers] ?? ''])) as Answers;
}
type Draft = { values: Answers; revision: string; dirty: boolean };

export function ProjectGuidance({ projectId, identity, saved, editable, connection }: {
  projectId: bigint; identity: string; saved?: Guidance; editable: boolean; connection: DbConnection;
}) {
  const storageKey = `complix.guidance.${endpoint}.${database}.${identity}.${projectId}`;
  const [draft, setDraft] = useState<Draft>(() => {
    try {
      const item = JSON.parse(sessionStorage.getItem(storageKey) ?? 'null');
      if (item?.dirty === true && /^\d+$/.test(item.revision) && Object.keys(blank).every(key => typeof item.values?.[key] === 'string')) return item;
    } catch { /* Server state remains available when browser storage is unavailable. */ }
    return { values: answers(saved), revision: String(saved?.revision ?? 0n), dirty: false };
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const current = useRef(draft);
  current.current = draft;
  const conflict = draft.dirty && BigInt(draft.revision) !== (saved?.revision ?? 0n);
  useEffect(() => {
    if (busy || draft.dirty || (saved?.revision ?? 0n) < BigInt(draft.revision)) return;
    setDraft({ values: answers(saved), revision: String(saved?.revision ?? 0n), dirty: false });
  }, [saved, busy, draft.dirty, draft.revision]);
  useEffect(() => {
    try {
      if (draft.dirty) sessionStorage.setItem(storageKey, JSON.stringify(draft));
      else sessionStorage.removeItem(storageKey);
    } catch { /* Autosave still works; no claim of offline durable storage. */ }
  }, [draft, storageKey]);
  useEffect(() => {
    if (!editable || !draft.dirty || conflict || busy || error) return;
    const timer = window.setTimeout(() => {
      const snapshot = draft;
      setBusy(true);
      void connection.reducers.saveGuidance({ projectId, expectedRevision: BigInt(snapshot.revision), ...snapshot.values })
        .then(() => {
          const latest = current.current;
          setDraft({ ...latest, revision: String(BigInt(snapshot.revision) + 1n), dirty: latest.values !== snapshot.values });
        }).catch(cause => {
          const message = cause instanceof Error ? cause.message : '';
          const known = ['Your session expired. Sign in again and retry.', 'Project edit access is required.',
            'Guidance changed. Review the latest saved version.', 'Each guidance answer must be at most 4000 characters without control characters.'];
          const reason = known.find(text => message.includes(text));
          setError((reason ? reason + ' ' : 'Autosave could not be confirmed. Check your connection and access, then retry. ') + 'Your draft is retained in this tab.');
        })
        .finally(() => setBusy(false));
    }, 700);
    return () => window.clearTimeout(timer);
  }, [draft, editable, conflict, busy, error, connection, projectId]);
  const displayed = editable ? draft.values : answers(saved);
  return <section className="panel">
    <h2>Questionnaire and design guidance</h2>
    <p className="note">Describe reusable components, not a complete application. Answers are draft requirements; they do not generate or validate components yet. Leave undecided answers blank.</p>
    <p role="status" data-testid="guidance-status">{!editable ? 'Read-only project guidance' : busy ? 'Saving guidance…' : conflict ? 'Conflicting changes — your draft has not overwritten the saved version.' : draft.dirty ? 'Unsaved guidance' : saved ? 'Guidance saved' : 'No guidance saved yet'}</p>
    {error && <p role="alert">{error}</p>}
    <div className="guidance-grid">{Object.entries(questions).map(([field, label]) => <label key={field} className="guidance-question">{label}
      <textarea aria-label={label} maxLength={4000} rows={field === 'guidance' ? 6 : 2} readOnly={!editable}
        value={displayed[field as keyof Answers]} onChange={event => {
          setError(''); setDraft(old => ({ ...old, dirty: true, values: { ...old.values, [field]: event.target.value } }));
        }} />
    </label>)}</div>
    {editable && error && !conflict && <button type="button" onClick={() => setError('')}>Retry guidance save</button>}
    {editable && conflict && <>
      <p>Your text is preserved above. Copy anything you want to keep before loading the latest saved answers.</p>
      <details><summary>Latest saved answers</summary><pre>{Object.entries(questions).map(([key, label]) => `${label}: ${answers(saved)[key as keyof Answers] || '(undecided)'}`).join('\n\n')}</pre></details>
      <button type="button" disabled={busy} onClick={() => { setError(''); setDraft({ values: answers(saved), revision: String(saved?.revision ?? 0n), dirty: false }); }}>Discard my draft and load latest</button>
    </>}
    <details><summary>Design guidance document</summary><p className="note">Text preview of the current answers, including unsaved edits. No generated code is changed.</p>
      <pre data-testid="design-document">{'# Project design guidance\n\n' + Object.entries(questions).map(([key, label]) => `## ${label}\n${displayed[key as keyof Answers] || 'Undecided'}`).join('\n\n')}</pre>
    </details>
  </section>;
}
