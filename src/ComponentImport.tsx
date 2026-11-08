import { useRef, useState } from 'react';
import type { DbConnection } from './module_bindings';
import type { ProjectSummary } from './module_bindings/types';
import type { Component, ImportRecord, ProjectReference } from './useWorkspace';
import { Button } from './components/Button';
import { Badge } from './components/Badge';
import { referencePurposes } from '../shared/referenceFiles';
import { planImportFromZip, planToPayload, projectConflicts, type ImportPlan } from '../shared/componentImport';
import { chunkImportPayload, encodeImportPayload } from '../shared/importPayload';

const megabytes = (bytes: number) => (bytes / (1024 * 1024)).toFixed(bytes < 1024 * 1024 ? 2 : 1) + ' MiB';
// Server and parser messages are written for users; anything unexpected gets a generic message.
function failure(cause: unknown) {
  const text = cause instanceof Error ? cause.message.replace(/^.*?SenderError:\s*/, '') : '';
  return text && text.length < 400 && !/\n\s+at /.test(text) ? text : 'The import could not be completed. Check your connection and project access, then retry.';
}
async function digestHex(bytes: Uint8Array) {
  const digest = await crypto.subtle.digest('SHA-256', Uint8Array.from(bytes).buffer);
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Optional intake step: review an existing ComPlix library ZIP, then upload it in chunks and commit it
 * atomically. Nothing is saved until the user confirms; a failed import leaves the project unchanged.
 */
export function ComponentImport({ project, references, components, imports, connection }: {
  project: ProjectSummary; references: ProjectReference[]; components: Component[]; imports: ImportRecord[]; connection: DbConnection;
}) {
  const [plan, setPlan] = useState<ImportPlan>();
  const [filename, setFilename] = useState('');
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const input = useRef<HTMLInputElement>(null);
  const imported = imports.reduce((sum, row) => ({ components: sum.components + row.componentCount, references: sum.references + row.referenceCount }), { components: 0, references: 0 });

  async function choose(file: File | undefined) {
    if (!file) return;
    setError(''); setPlan(undefined); setFilename(file.name); setBusy('Reading ZIP…');
    try {
      setPlan(await planImportFromZip(new Uint8Array(await file.arrayBuffer())));
    } catch (cause) { setError(failure(cause)); }
    finally { setBusy(''); if (input.current) input.current.value = ''; }
  }
  async function confirm(current: ImportPlan) {
    setError('');
    try {
      setBusy('Preparing upload…');
      const encoded = encodeImportPayload(planToPayload(current));
      const digest = await digestHex(encoded);
      const chunks = chunkImportPayload(encoded);
      const requestId = crypto.randomUUID();
      for (let sequence = 0; sequence < chunks.length; sequence++) {
        setBusy(`Uploading ${sequence + 1} of ${chunks.length}…`);
        await connection.reducers.appendImportChunk({ projectId: project.id, requestId, sequence, chunkCount: chunks.length, totalBytes: BigInt(encoded.length), digest, bytes: chunks[sequence] });
      }
      setBusy('Saving imported library…');
      await connection.reducers.finalizeImport({ projectId: project.id, requestId });
      setPlan(undefined); setFilename('');
    } catch (cause) { setError(failure(cause)); }
    finally { setBusy(''); }
  }

  if (imports.length && !plan) return <section className="panel setup-panel" aria-label="Import existing components">
    <h2>Existing components imported</h2>
    <p role="status" data-testid="import-status">Imported {imported.components} component{imported.components === 1 ? '' : 's'} and {imported.references} reference{imported.references === 1 ? '' : 's'}. Imported code is unverified until you preview it.</p>
  </section>;

  return <section className="panel setup-panel" aria-label="Import existing components">
    <h2>Import existing components <span className="note">(optional)</span></h2>
    <p className="note">Upload a component library ZIP exported from ComPlix. Its components become editable drafts in this project, and its references are restored with it. Supporting documents above are only context; this import adds code.</p>
    <label className="import-picker">
      <span>Component library ZIP</span>
      <input ref={input} type="file" accept=".zip,application/zip" aria-label="Component library ZIP" disabled={!!busy} onChange={event => void choose(event.target.files?.[0])} />
    </label>
    {busy && <p role="status" aria-live="polite">{busy}</p>}
    {error && <p role="alert" className="error">{error}</p>}
    {plan && <ImportReview plan={plan} filename={filename} references={references} components={components} busy={!!busy} confirm={() => void confirm(plan)} cancel={() => { setPlan(undefined); setFilename(''); setError(''); }} />}
  </section>;
}

function ImportReview({ plan, filename, references, components, busy, confirm, cancel }: {
  plan: ImportPlan; filename: string; references: ProjectReference[]; components: Component[]; busy: boolean; confirm: () => void; cancel: () => void;
}) {
  // Recomputed on every render, so removing an intake upload above clears its conflict immediately.
  const issues = projectConflicts(plan, { componentNames: components.map(row => row.name), referenceFilenames: references.map(row => row.filename) });
  const technologies = Object.entries(plan.technologies).filter(([, value]) => value);
  return <div className="import-review" data-testid="import-review">
    <p role="status">Recognized a ComPlix library export in {filename}: {plan.totals.files} files, {megabytes(plan.totals.expandedBytes)} expanded.</p>
    <h3>Components ({plan.components.length})</h3>
    <ul className="import-list">{plan.components.map(item => <li key={item.name} aria-label={'Imported component ' + item.name}>
      <strong>{item.name}</strong> <Badge>{item.category === 'common' ? 'Common' : 'Composition'}</Badge> <span className="note">{item.rootPath} · {item.files.length} file{item.files.length === 1 ? '' : 's'}</span>
      {item.warnings.length > 0 && <ul className="note">{item.warnings.map(text => <li key={text}>{text}</li>)}</ul>}
    </li>)}</ul>
    <h3>References ({plan.references.length})</h3>
    <ul className="import-list">{plan.references.map(item => <li key={item.filename}>
      <strong>{item.filename}</strong> <span className="note">{referencePurposes[item.purpose]} · {megabytes(item.bytes.length)}{item.origin === 'design-guidance' ? ' · archived design guidance' : ''}</span>
    </li>)}</ul>
    {technologies.length > 0 && <p className="note">Archived technologies: {technologies.map(([key, value]) => `${key} ${value}`).join('; ')}. Your project keeps the technologies you entered.</p>}
    <details><summary>All files in the ZIP ({plan.files.length})</summary>
      <ul className="import-files">{plan.files.map(file => <li key={file.path}><code>{file.path}</code> <span className="note">{file.disposition}: {file.detail}</span></li>)}</ul>
    </details>
    <ul className="note">{plan.warnings.map(text => <li key={text}>{text}</li>)}</ul>
    {issues.length > 0 && <div role="alert" className="error"><p>Resolve these before importing:</p><ul>{issues.map(text => <li key={text}>{text}</li>)}</ul></div>}
    <p className="note">If you reload before confirming, choose the ZIP again. Nothing is saved until you import.</p>
    <div className="setup-actions">
      <Button type="button" variant="secondary" disabled={busy} onClick={cancel}>Choose a different file</Button>
      <Button type="button" disabled={busy || issues.length > 0} onClick={confirm}>Import {plan.components.length} component{plan.components.length === 1 ? '' : 's'}</Button>
    </div>
  </div>;
}

