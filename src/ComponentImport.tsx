import { useRef, useState } from 'react';
import type { DbConnection } from './module_bindings';
import type { ProjectSummary } from './module_bindings/types';
import type { Component, ImportRecord, ProjectReference } from './useWorkspace';
import { Button } from './components/Common/Button';
import { Badge } from './components/Common/Badge';
import { referencePurposes } from '../shared/referenceFiles';
import { planToPayload, projectConflicts, type ImportedComponent, type ImportedReference, type ImportPlan } from '../shared/componentImport';
import { buildSourceImport, defaultMapping, planAnyImportFromZip, type AnyImportPlan, type SourceMapping, type SourcePlan } from '../shared/sourceImport';
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
type Reviewed = { components: ImportedComponent[]; references: ImportedReference[] };

/**
 * Optional intake step: review an existing component ZIP (a ComPlix export, or ordinary source with an
 * explicit mapping), then upload it in chunks and commit it atomically. Nothing is saved until the user
 * confirms; a failed import leaves the project unchanged.
 */
export function ComponentImport({ project, references, components, imports, connection }: {
  project: ProjectSummary; references: ProjectReference[]; components: Component[]; imports: ImportRecord[]; connection: DbConnection;
}) {
  const [plan, setPlan] = useState<AnyImportPlan>();
  const [filename, setFilename] = useState('');
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const input = useRef<HTMLInputElement>(null);
  const imported = imports.reduce((sum, row) => ({ components: sum.components + row.componentCount, references: sum.references + row.referenceCount }), { components: 0, references: 0 });

  async function choose(file: File | undefined) {
    if (!file) return;
    setError(''); setPlan(undefined); setFilename(file.name); setBusy('Reading ZIP…');
    try { setPlan(await planAnyImportFromZip(new Uint8Array(await file.arrayBuffer()))); }
    catch (cause) { setError(failure(cause)); }
    finally { setBusy(''); if (input.current) input.current.value = ''; }
  }
  async function confirm(reviewed: Reviewed) {
    setError('');
    try {
      setBusy('Preparing upload…');
      const encoded = encodeImportPayload(planToPayload(reviewed));
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
  const cancel = () => { setPlan(undefined); setFilename(''); setError(''); };
  const shared = { filename, references, components, busy: !!busy, confirm: (reviewed: Reviewed) => void confirm(reviewed), cancel };

  if (imports.length && !plan) return <section className="panel setup-panel" aria-label="Import existing components">
    <h2>Existing components imported</h2>
    <p role="status" data-testid="import-status">Imported {imported.components} component{imported.components === 1 ? '' : 's'} and {imported.references} reference{imported.references === 1 ? '' : 's'}. Imported code is unverified until you preview it.</p>
  </section>;

  return <section className="panel setup-panel" aria-label="Import existing components">
    <h2>Import existing components <span className="note">(optional)</span></h2>
    <p className="note">Upload a ZIP of existing components: a ComPlix library export, or ordinary source files that you map to components. Imported components become editable drafts in this project. Supporting documents above are only context; this import adds code.</p>
    <label className="import-picker">
      <span>Component library ZIP</span>
      <input ref={input} type="file" accept=".zip,application/zip" aria-label="Component library ZIP" disabled={!!busy} onChange={event => void choose(event.target.files?.[0])} />
    </label>
    {busy && <p role="status" aria-live="polite">{busy}</p>}
    {error && <p role="alert" className="error">{error}</p>}
    {plan?.kind === 'complix' && <ComplixReview plan={plan} {...shared} />}
    {plan?.kind === 'source' && <SourceReview key={filename} plan={plan} {...shared} />}
  </section>;
}

type ReviewProps = { filename: string; references: ProjectReference[]; components: Component[]; busy: boolean; confirm: (reviewed: Reviewed) => void; cancel: () => void };
function conflicts(reviewed: Reviewed, components: Component[], references: ProjectReference[]) {
  // Recomputed on every render, so removing a clashing intake upload clears its conflict immediately.
  return projectConflicts(reviewed, { componentNames: components.map(row => row.name), referenceFilenames: references.map(row => row.filename) });
}
function ComponentList({ items }: { items: ImportedComponent[] }) {
  return <ul className="import-list">{items.map(item => <li key={item.name} aria-label={'Imported component ' + item.name}>
    <strong>{item.name}</strong> <Badge variant={item.category === "common" ? "sky" : "lilac"}>{item.category === "common" ? "Common" : "Composition"}</Badge> <span className="note">{item.rootPath} · {item.files.length} file{item.files.length === 1 ? '' : 's'}</span>
    {item.warnings.length > 0 && <ul className="note">{item.warnings.map(text => <li key={text}>{text}</li>)}</ul>}
  </li>)}</ul>;
}
function Confirm({ issues, count, busy, onConfirm, cancel }: { issues: string[]; count: number; busy: boolean; onConfirm: () => void; cancel: () => void }) {
  return <>
    {issues.length > 0 && <div role="alert" className="error"><p>Resolve these before importing:</p><ul>{issues.map(text => <li key={text}>{text}</li>)}</ul></div>}
    <p className="note">If you reload before confirming, choose the ZIP again. Nothing is saved until you import. Imported code is unverified, and import validates storage only, not compilation.</p>
    <div className="setup-actions">
      <Button type="button" variant="secondary" disabled={busy} onClick={cancel}>Choose a different file</Button>
      <Button type="button" disabled={busy || issues.length > 0 || !count} onClick={onConfirm}>Import {count} component{count === 1 ? '' : 's'}</Button>
    </div>
  </>;
}

function ComplixReview({ plan, filename, references, components, busy, confirm, cancel }: ReviewProps & { plan: ImportPlan }) {
  const issues = conflicts(plan, components, references);
  const technologies = Object.entries(plan.technologies).filter(([, value]) => value);
  return <div className="import-review" data-testid="import-review">
    <p role="status">Recognized a ComPlix library export in {filename}: {plan.totals.files} files, {megabytes(plan.totals.expandedBytes)} expanded.</p>
    <h3>Components ({plan.components.length})</h3>
    <ComponentList items={plan.components} />
    <h3>References ({plan.references.length})</h3>
    <ul className="import-list">{plan.references.map(item => <li key={item.filename}>
      <strong>{item.filename}</strong> <span className="note">{referencePurposes[item.purpose]} · {megabytes(item.bytes.length)}{item.origin === 'design-guidance' ? ' · archived design guidance' : ''}</span>
    </li>)}</ul>
    {technologies.length > 0 && <p className="note">Archived technologies: {technologies.map(([key, value]) => `${key} ${value}`).join('; ')}. Your project keeps the technologies you entered.</p>}
    <details><summary>All files in the ZIP ({plan.files.length})</summary>
      <ul className="import-files">{plan.files.map(file => <li key={file.path}><code>{file.path}</code> <span className="note">{file.disposition}: {file.detail}</span></li>)}</ul>
    </details>
    <ul className="note">{plan.warnings.map(text => <li key={text}>{text}</li>)}</ul>
    <Confirm issues={issues} count={plan.components.length} busy={busy} onConfirm={() => confirm(plan)} cancel={cancel} />
  </div>;
}

function SourceReview({ plan, filename, references, components, busy, confirm, cancel }: ReviewProps & { plan: SourcePlan }) {
  const [mapping, setMapping] = useState<SourceMapping>(() => defaultMapping(plan));
  const built = buildSourceImport(plan, mapping);
  const reviewed: Reviewed = { components: built.components, references: [] };
  const issues = [...built.issues, ...conflicts(reviewed, components, references)];
  const included = plan.files.filter(file => !file.excluded);
  const excluded = plan.files.filter(file => file.excluded);
  const edit = (index: number, change: Partial<SourceMapping['components'][number]>) => setMapping(old => ({ ...old, components: old.components.map((item, at) => at === index ? { ...item, ...change } : item) }));
  const remove = (index: number) => setMapping(old => ({
    components: old.components.filter((_, at) => at !== index),
    // Files of a removed component become "don't import"; later indexes shift down.
    assignment: Object.fromEntries(Object.entries(old.assignment).map(([path, owner]) => [path, owner === index ? -1 : owner > index ? owner - 1 : owner])),
  }));
  const add = () => setMapping(old => {
    let name = 'NewComponent';
    for (let index = 2; old.components.some(item => item.name.toLowerCase() === name.toLowerCase()); index++) name = 'NewComponent' + index;
    return { ...old, components: [...old.components, { name, category: 'composition' }] };
  });
  return <div className="import-review" data-testid="import-review">
    <p role="status">No ComPlix manifest in {filename}: mapping ordinary source ({plan.totals.files} files, {megabytes(plan.totals.expandedBytes)} expanded). Folder names are only suggestions; check each component and file below.</p>
    {plan.detectedTechnologies.length > 0 && <p className="note">Detected in the source: {plan.detectedTechnologies.join('; ')}. Your project keeps the technologies you entered.</p>}
    <h3>Components ({mapping.components.length})</h3>
    <ul className="import-list import-mapping">{mapping.components.map((item, index) => {
      const result = built.components.find(row => row.name === item.name);
      return <li key={index} aria-label={'Mapped component ' + (index + 1)}>
        <label>Name <input aria-label={`Component ${index + 1} name`} value={item.name} maxLength={80} disabled={busy} onChange={event => edit(index, { name: event.target.value.trim() })} /></label>
        <label>Category <select aria-label={`Component ${index + 1} category`} value={item.category} disabled={busy} onChange={event => edit(index, { category: event.target.value as 'common' | 'composition' })}>
          <option value="common">Common</option><option value="composition">Composition</option></select></label>
        <Button type="button" variant="secondary" disabled={busy} onClick={() => remove(index)}>Remove {item.name || 'component'}</Button>
        {result && <span className="note">{result.rootPath} · {result.files.length} file{result.files.length === 1 ? '' : 's'}</span>}
        {result && result.warnings.length > 0 && <ul className="note">{result.warnings.map(text => <li key={text}>{text}</li>)}</ul>}
      </li>;
    })}</ul>
    <Button type="button" variant="secondary" disabled={busy} onClick={add}>Add component</Button>
    <h3>Files to import ({included.length - built.skipped.length} of {included.length})</h3>
    <ul className="import-files">{included.map(file => <li key={file.path}>
      <label><code>{file.path}</code>{' '}
        <select aria-label={'Assign ' + file.path} value={mapping.assignment[file.path] ?? -1} disabled={busy}
          onChange={event => { const owner = Number(event.target.value); setMapping(old => ({ ...old, assignment: { ...old.assignment, [file.path]: owner } })); }}>
          <option value={-1}>Don't import</option>
          {mapping.components.map((item, index) => <option key={index} value={index}>{item.name || `Component ${index + 1}`}</option>)}
        </select></label>
    </li>)}</ul>
    {excluded.length > 0 && <details><summary>Files that cannot be imported ({excluded.length})</summary>
      <ul className="import-files">{excluded.map(file => <li key={file.path}><code>{file.path}</code> <span className="note">{file.excluded}</span></li>)}</ul>
    </details>}
    <Confirm issues={issues} count={built.components.length} busy={busy} onConfirm={() => confirm(reviewed)} cancel={cancel} />
  </div>;
}
