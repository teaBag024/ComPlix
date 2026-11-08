import { Button } from './components/Button';
import { EditorInstructions } from './EditorInstructions';
import { isChatMode } from '../shared/generationWorkflow';
import { useDraftEditor } from './useDraftEditor';
import { StackPreview } from './StackPreview';
import { selectStackAdapter, type TargetStack } from '../shared/stackAdapters';
import { useState, useRef, useEffect, useMemo } from 'react';
import type { DbConnection } from './module_bindings';
import type { GenerationJob, ProjectReference, ComponentDraft, ComponentPreview, Component, ComponentMessage, SavedEditorInstruction } from './useWorkspace';
import { generationStages } from '../shared/generationWorkflow';
import { ProjectChat } from './ProjectChat';

const stages: Record<string, string> = { queued: 'Queued', generating: 'Simulating generation', building: 'Simulating build', testing: 'Simulating tests', preview_ready: 'Mock preview ready', generating_code: 'Nemotron generating changes', draft_ready: 'Draft ready', failed: 'Failed', cancelled: 'Cancelled' };
const hasFiles = (job: GenerationJob) => { try { return JSON.parse(job.artifacts).files?.length > 0; } catch { return false; } };
const active = (job: GenerationJob) => !['preview_ready', 'draft_ready', 'failed', 'cancelled'].includes(job.state);
const examples = [
  { id: 'button', name: 'Button', group: 'Common foundation', source: '<!doctype html>\n<style>body{font:14px Inter,Arial,sans-serif;padding:24px}.button{border:0;border-radius:7px;padding:9px 16px;font-weight:600}.primary{background:#214e34;color:white}</style>\n<button class="button primary">Primary action</button>' },
  { id: 'input', name: 'Input', group: 'Common foundation', source: '<!doctype html>\n<style>body{font:14px Inter,Arial,sans-serif;padding:24px}label{display:block;color:#26352b}input{display:block;margin-top:6px;padding:9px 12px;border:1px solid #cbd6ce;border-radius:7px}</style>\n<label>Email address<input type="email" placeholder="you@example.com"></label>' },
  { id: 'login-form', name: 'LoginForm', group: 'Compositions', source: '<!doctype html>\n<style>body{font:14px Inter,Arial,sans-serif;padding:24px}.form{max-width:320px;display:grid;gap:12px}label{display:grid;gap:5px}input{padding:9px;border:1px solid #cbd6ce;border-radius:7px}button{padding:9px;background:#214e34;color:white;border:0;border-radius:7px}</style>\n<form class="form"><strong>Welcome back</strong><label>Email<input type="email"></label><label>Password<input type="password"></label><button type="button">Sign in</button></form>' },
  { id: 'filter-panel', name: 'FilterPanel', group: 'Compositions', source: '<!doctype html>\n<style>body{font:14px Inter,Arial,sans-serif;padding:24px}.panel{max-width:320px;padding:16px;border:1px solid #e1e8e3;border-radius:9px;display:grid;gap:12px}label{display:grid;gap:5px}input,select{padding:8px;border:1px solid #cbd6ce;border-radius:7px}</style>\n<form class="panel"><strong>Filter results</strong><label>Search<input placeholder="Search components"></label><label>Category<select><option>All components</option><option>Common</option></select></label></form>' },
];
export function ProjectLibrary({ projectId, target, instructions = [], draftGuard, editable, jobs: allJobs, components, messages, drafts, previews, references, mode, chatEnabled = false, connection }: {
  instructions?: SavedEditorInstruction[];
  projectId: bigint; target: TargetStack; draftGuard?: { current: (() => Promise<unknown>) | undefined }; editable: boolean; jobs: GenerationJob[]; components: Component[]; messages: ComponentMessage[]; drafts: ComponentDraft[]; previews: ComponentPreview[]; references: ProjectReference[]; mode: string; chatEnabled?: boolean; connection: DbConnection;
}) {
  const [selectedComponentId, setSelectedComponentId] = useState(() => new URLSearchParams(location.search).get('selected') ?? '');
  const component = components.find(row => row.id.toString() === selectedComponentId);
  const jobs = allJobs.filter(row => row.componentId === (component?.id ?? 0n));
  const creation = useRef<HTMLDialogElement>(null);
  const [name, setName] = useState('');
  const [category, setCategory] = useState('common');
  const [initialPrompt, setInitialPrompt] = useState('');
  const [creationError, setCreationError] = useState('');
  const [creating, setCreating] = useState(false);
  function selectComponent(id: string) {
    const url = new URL(location.href); url.searchParams.set('selected', id); history.pushState(null, '', url);
    chatAttempt.current++; setChatPending(false);
    setSelectedComponentId(id); setSelectedExample(''); setSelectedJob(''); setSelectedFile('');
  }
  useEffect(() => {
    const restore = () => { void editor.flush().then(() => { chatAttempt.current++; setChatPending(false); setSelectedComponentId(new URLSearchParams(location.search).get('selected') ?? ''); setSelectedJob(''); setSelectedExample(''); }).catch(cause => { setError(String(cause)); const url = new URL(location.href); if (selectedComponentId) url.searchParams.set('selected', selectedComponentId); else url.searchParams.delete('selected'); history.replaceState(null, '', url); }); };
    window.addEventListener('popstate', restore); return () => window.removeEventListener('popstate', restore);
  }, []);
  const adapter = selectStackAdapter(target);
  const [request, setRequest] = useState('Create a reusable Common Button with documentation and an example.');
  const [scenario, setScenario] = useState('success');
  const [selectedJob, setSelectedJob] = useState('');
  const [selectedExample, setSelectedExample] = useState(jobs.length || selectedComponentId ? '' : 'button');
  const [view, setView] = useState('source');
  const [selectedFile, setSelectedFile] = useState('');
  const [componentListOpen, setComponentListOpen] = useState(true);
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [busy, setBusy] = useState(false);
  const running = useRef(false);
  const chatAttempt = useRef(0);
  const [chatPending, setChatPending] = useState(false);
  const ordered = [...jobs].sort((a, b) => a.id > b.id ? -1 : 1);
  const lastSelectedJob = useRef<GenerationJob | undefined>(undefined);
  const job = selectedExample ? undefined : jobs.find(row => row.id.toString() === selectedJob) ?? (selectedJob && lastSelectedJob.current?.id.toString() === selectedJob ? lastSelectedJob.current : undefined) ?? ordered.find(row => ['draft_ready', 'preview_ready'].includes(row.state) && hasFiles(row)) ?? ordered[0];
  lastSelectedJob.current = job;
  const selectedJobDeleted = !!job && !jobs.some(row => row.id === job.id);
  useEffect(() => { if (job && !selectedJob && !selectedExample) setSelectedJob(job.id.toString()); }, [job?.id, selectedJob, selectedExample]);
  const example = examples.find(item => item.id === selectedExample) ?? (!component && !job && !ordered.length ? examples[0] : undefined);
  const candidates = ordered.filter(row => ['preview_ready', 'draft_ready'].includes(row.state) && (() => { try { return JSON.parse(row.artifacts).files?.length > 0; } catch { return false; } })());
  const hasActive = jobs.some(active);
  const previewedJobs = useRef(new Set<string>());
  useEffect(() => {
    let newlyReady: GenerationJob | undefined;
    for (const row of ordered) {
      if (row.mode === 'mock' && row.state === 'preview_ready' && !previewedJobs.current.has(row.id.toString())) newlyReady = row;
      if (row.state === 'preview_ready') previewedJobs.current.add(row.id.toString());
    }
    if (newlyReady && !selectedExample && !editor.isUnsaved()) {
      setSelectedJob(newlyReady.id.toString());
      setView('preview');
    }
  }, [jobs, selectedExample]);
  let files: Array<{ path: string; content: string }> = [];
  try { files = JSON.parse(job?.artifacts || '{"files":[]}').files; } catch { /* No usable artifacts. */ }
  const editor = useDraftEditor(connection, job?.id, files, drafts.find(row => row.jobId === job?.id));
  useEffect(() => {
    if (draftGuard) draftGuard.current = () => editor.flush();
    return () => { if (draftGuard) draftGuard.current = undefined; };
  }, [draftGuard]);
  files = editor.files;
  const canEdit = editable && !selectedJobDeleted && job && isChatMode(job.mode) && job.state === 'draft_ready' && files.length > 0;
  const file = files.find(item => item.path === selectedFile) ?? files[0];
  const documents = adapter?.documentation(files) ?? files.filter(item => /\.(md|mdx|xml)$/i.test(item.path));
  const document = documents.find(item => item.path === selectedFile) ?? documents[0];
  const preview = job?.mode === 'mock' && (() => { try { return JSON.parse(job.artifacts).files.find((item: { path: string }) => item.path === 'examples/mock-preview.html'); } catch { return undefined; } })();
  function fail(cause?: unknown) {
    const message = cause instanceof Error ? cause.message : typeof cause === 'string' ? cause : '';
    const safe = ['Draft changed. Your local edits were not overwritten.', 'Draft save could not be confirmed. Your local edits are still shown. Check your connection and retry.', 'Draft files exceed 256 KiB.', 'Remove credentials from draft files.', 'Project edit access is required.', 'Generation providers are not configured.', 'This project already has an active generation job.',
      'Generation history limit reached for this prototype.', 'Complete project context exceeds 64 KiB. Shorten or remove project references or reduce draft/context size before sending.', 'Your session expired. Sign in again and retry.', 'ComPlix chat is not configured. Contact the operator.', 'Chat limit reached. Wait a minute before sending another message.', 'Remove credentials from the request or project context.', 'Draft changed. Review the latest saved version before sending.', 'Selected draft is unavailable. Select a saved draft from this project.', 'Reply could not be confirmed within 75 seconds. Cancel any waiting reply before retrying.'];
    const visible = safe.find(text => message.includes(text)) ?? 'Message could not be confirmed. Check your connection and project access. If a reply is still waiting, cancel it before retrying.';
    setError(visible);
    return visible;
  }
  async function run(job: GenerationJob) {
    if (running.current) return;
    running.current = true; setBusy(true); setError('');
    try {
      const index = generationStages.indexOf(job.state as typeof generationStages[number]);
      for (const expectedState of generationStages.slice(Math.max(0, index), -1)) {
        await new Promise(resolve => window.setTimeout(resolve, 250));
        await connection.reducers.advanceMockGeneration({ jobId: job.id, expectedState });
        const latest = [...connection.db.visibleGenerationJobs.iter()].find(row => row.id === job.id);
        if (!latest || !active(latest)) break;
      } 
    } catch { fail(); }
    finally { running.current = false; setBusy(false); }
  }
  return <section className="component-library">
    <p role="status">{adapter ? `${adapter.label}: saved drafts preview automatically in an isolated E2B sandbox.` : 'Unsupported target stack: no matching adapter. Code and Docs remain available; compilation and preview are unavailable.'}</p>
    <dialog ref={creation} aria-labelledby="create-component-title"><form onSubmit={event => {
      event.preventDefault(); setCreating(true); setCreationError('');
      void (async () => {
        await connection.reducers.createComponent({ projectId, name, category });
        const created = [...connection.db.visibleComponents.iter()].find(row => row.projectId === projectId && row.name.toLowerCase() === name.trim().toLowerCase());
        if (!created) throw new Error('Creation could not be confirmed.');
        selectComponent(created.id.toString()); creation.current?.close(); setName(''); setInitialPrompt('');
        if (initialPrompt.trim()) { const requestId = crypto.randomUUID(); await connection.procedures.generateProjectChat({ projectId, componentId: created.id, requestId, request: initialPrompt }); const result = [...connection.db.visibleGenerationJobs.iter()].find(row => row.requestId === requestId); if (result?.state === 'draft_ready' && hasFiles(result)) setSelectedJob(result.id.toString()); }
      })().catch(cause => setCreationError(cause instanceof Error ? cause.message : 'Component creation failed.')).finally(() => setCreating(false));
    }}><h3 id="create-component-title">New component</h3><label>Component name<input required maxLength={80} pattern="[A-Za-z0-9_-]+" value={name} onChange={event => setName(event.target.value)} /></label><fieldset><legend>Category</legend>{['common', 'composition'].map(value => <label key={value}><input type="radio" name="category" value={value} checked={category === value} onChange={() => setCategory(value)} />{value === 'common' ? 'Common' : 'Composition'}</label>)}</fieldset><label>Initial prompt (optional)<textarea maxLength={4000} value={initialPrompt} onChange={event => setInitialPrompt(event.target.value)} /></label>{creationError && <p role="alert">{creationError}</p>}<Button disabled={creating}>Create component</Button><Button disabled={creating} type="button" onClick={() => creation.current?.close()}>Cancel</Button></form></dialog>
    {creationError && !creation.current?.open && <p role="alert">Component created; initial chat failed. {creationError}</p>}
    {error && <p role="alert">{error}</p>}
    {selectedJobDeleted && <p role="alert">This draft was deleted in another session. Local text is retained here; copy any changes before discarding edits or leaving.</p>}
    <div className={'studio-columns' + (componentListOpen ? '' : ' list-hidden')}>
        {componentListOpen && <aside className="component-list" aria-label="Available components"><div className="component-list-heading"><h3>Components</h3>{editable && <Button disabled={editor.unsaved} type="button" onClick={() => creation.current?.showModal()}>+ New Component</Button>}
          <Button type="button" variant="secondary" aria-expanded="true" onClick={() => setComponentListOpen(false)}>Hide list</Button></div>
          {['Common foundation', 'Compositions'].map(group => <section className="component-group" key={group}>
            <div className="eyebrow">{group}</div><ul>{components.filter(row => row.category === (group === 'Common foundation' ? 'common' : 'composition')).map(row => <li key={row.id.toString()}><Button type="button" className="component-link" disabled={editor.unsaved || chatPending} aria-pressed={component?.id === row.id} onClick={() => selectComponent(row.id.toString())}>{row.name}</Button><span>{row.rootPath}</span>{component?.id === row.id && <ul>{files.map(item => <li key={item.path}><Button className="component-link" type="button" onClick={() => { setSelectedFile(item.path); setView(/\.(md|mdx|xml)$/i.test(item.path) ? 'documentation' : 'source'); }}>{item.path}</Button></li>)}</ul>}</li>)}{!component && examples.filter(item => item.group === group).map(item => <li key={item.id}>
              <Button type="button" className="component-link" disabled={editor.unsaved} aria-pressed={selectedExample === item.id} onClick={() => {
                setSelectedExample(item.id); setSelectedJob(''); setSelectedFile(''); setView('source');
              }}>{item.name}</Button><span>UI example · not in library</span>
            </li>)}</ul>
          </section>)}
          {candidates.length > 0 && <section className="component-group candidate-group"><div className="eyebrow">Draft candidates</div>
          <ul>{candidates.map(candidate => <li key={candidate.id.toString()}>
            <Button type="button" className="component-link" disabled={editor.unsaved} aria-pressed={candidate.id === job?.id} onClick={() => { setSelectedExample(''); setSelectedJob(candidate.id.toString()); setView('preview'); }}>
              {candidate.request}
            </Button><span>{candidate.componentId && !candidate.model ? 'Starter draft - unverified' : candidate.mode === 'gemini' ? 'Gemini + Nemotron draft · unverified' : isChatMode(candidate.mode) ? 'NVIDIA draft · unverified' : 'Mock candidate'}</span>
          </li>)}</ul></section>}
        </aside>}
        <section className="studio-preview-pane" aria-label="Component preview and code">
          {!componentListOpen && <Button type="button" className="secondary show-component-list" aria-expanded="false" onClick={() => setComponentListOpen(true)}>Show component list</Button>}
          <div className="library-views" aria-label="Candidate inspection">{['preview', 'source', 'documentation', 'validation'].map(item => <Button type="button" variant="secondary" key={item} aria-pressed={view === item} onClick={() => setView(item)}>{{ source: 'Code', documentation: 'Docs', preview: 'Preview', validation: 'Validation' }[item]}</Button>)}</div>
          {view === 'preview' && (job && preview && job.state === 'preview_ready'
            ? <iframe title="Mock component preview" sandbox="allow-scripts" referrerPolicy="no-referrer" srcDoc={preview.content} />
            : example ? <><p className="example-disclaimer">Illustrative UI example — not generated or saved to this library.</p><iframe title={'Example preview: ' + example.name} sandbox="allow-scripts" referrerPolicy="no-referrer" srcDoc={example.source} /></>
              : !job ? <div className="library-empty-state"><span className="eyebrow">Current library</span><strong>No published components yet</strong><p>Select a saved draft to build and inspect its actual compiled output.</p></div> : null)}
          {!example && !preview && <div hidden={view !== 'preview'}><StackPreview key={job?.id.toString() ?? 'empty'} adapter={adapter} connection={connection} jobId={job && isChatMode(job.mode) && job.state === 'draft_ready' && files.length ? job.id : undefined} savedRevision={editor.revision} unsaved={editor.unsaved} preview={previews.find(row => row.jobId === job?.id)} editable={editable && !selectedJobDeleted} active={view === 'preview'} /></div>}
          {view === 'source' && <>{files.length ? <><label>Candidate file<select aria-label="Candidate file" value={file?.path ?? ''} onChange={event => setSelectedFile(event.target.value)}>{files.map(item => <option key={item.path}>{item.path}</option>)}</select></label><p role="status" data-testid="draft-save-status">{editor.status}</p>
              <textarea className="code-editor" aria-label="Candidate code" data-testid="candidate-source" spellCheck={false} readOnly={!canEdit} value={file?.content ?? ''} onChange={event => file && editor.change(file.path, event.target.value)} />
              {component && job && <EditorInstructions key={`${component.id}:${job.id}`} componentId={component.id} sourceJobId={job.id} revision={editor.revision}
                files={files} unsaved={editor.unsaved} saveError={editor.error} editable={!!canEdit} available={chatEnabled && !!adapter}
                busy={allJobs.some(active) || chatPending || busy} connection={connection} instructions={instructions} jobs={allJobs}
                onResult={(id, sourceId, revision) => {
                  if (lastSelectedJob.current?.id !== sourceId || editor.isUnsaved() || editor.revision !== revision) return;
                  const result = [...connection.db.visibleGenerationJobs.iter()].find(row => row.id === id);
                  if (result && hasFiles(result)) { setSelectedExample(''); setSelectedJob(id.toString()); setSelectedFile(''); }
                }} />}
              {editor.error && <div role="alert"><p>{editor.error}</p>{!editor.error.includes('Draft changed.') && <Button type="button" onClick={() => editor.retry()}>Retry draft save</Button>}<Button type="button" variant="secondary" onClick={() => editor.reload()}>Discard local edits and load saved draft</Button></div>}
              <p className="note">{canEdit ? 'Edits autosave as an unverified draft. Source, examples and documentation share this file set; build explicitly from Preview to execute a saved revision.' : 'Read-only draft. Illustrative mock fixtures cannot be edited.'}</p></>
            : example ? <><p className="example-disclaimer">Illustrative source — not generated or saved to this library.</p><pre data-testid="example-source">{example.source}</pre></> : <p>No candidate source files yet.</p>}</>}
          {view === 'documentation' && <><label>Documentation file<select aria-label="Documentation file" value={document?.path ?? ''} onChange={event => setSelectedFile(event.target.value)}>{documents.map(item => <option key={item.path}>{item.path}</option>)}</select></label><pre>{document?.content ?? (example ? 'This UI-only example has no project documentation.' : 'No candidate documentation yet.')}</pre></>}
          {view === 'validation' && <p>{!job || !isChatMode(job.mode) ? 'No real validation has run. Build/test stages are simulated.' : 'No complete component validation or promotion has run. Any compilation result appears in Preview.'} No output is marked current or export-ready.</p>}
        </section>
        <div className="chat-pane">
          <p className="chat-reference-context">{references.length
            ? `All ${references.length} saved project reference${references.length === 1 ? ' is' : 's are'} included automatically.`
            : 'No saved project references; any added later will be included automatically.'}</p>
          <p className="note">{job && isChatMode(job.mode) && files.length ? `Chat context: selected draft: ${job.request}` : 'Chat context: project guidance and latest generated draft.'}</p>
          <ProjectChat key={component?.id.toString() ?? 'legacy'} component={component} messages={messages.filter(row => row.componentId === component?.id)} clear={async () => { if (component) await connection.reducers.clearComponentChat({ componentId: component.id }); }} jobs={jobs} editable={editable} available={chatEnabled && (!!component || jobs.length > 0)} pending={busy || chatPending || hasActive}
            statusLabel={chatEnabled ? 'ComPlix chat ready' : mode === 'mock' ? 'Local mock workflow' : 'Providers not configured'} cancel={async () => {
              const waiting = jobs.find(row => isChatMode(row.mode) && active(row));
              if (waiting) await connection.reducers.cancelGeneration({ jobId: waiting.id });
              chatAttempt.current++; setChatPending(false);
            }} send={async message => {
            const attempt = ++chatAttempt.current;
            setChatPending(true); setError('');
            let timer: number | undefined;
            try {
              const sourceJobId = canEdit ? job?.id : undefined;
              const expectedDraftRevision = sourceJobId !== undefined ? await editor.flush() : undefined;
              const requestId = crypto.randomUUID();
              if (sourceJobId !== undefined) setSelectedJob(sourceJobId.toString());
              await Promise.race([
                connection.procedures.generateProjectChat({ projectId, requestId, request: message, sourceJobId, expectedDraftRevision, componentId: component?.id }),
                new Promise<never>((_, reject) => { timer = window.setTimeout(() => reject(new Error('Reply could not be confirmed within 75 seconds. Cancel any waiting reply before retrying.')), 75000); }),
              ]);
              if (attempt === chatAttempt.current && !editor.isUnsaved()) {
                const result = [...connection.db.visibleGenerationJobs.iter()].find(row => row.requestId === requestId);
                if (result?.state === 'draft_ready' && hasFiles(result)) { setSelectedExample(''); setSelectedJob(result.id.toString()); setSelectedFile(''); }
                setView('source');
              }
            } catch (cause) {
              if (attempt !== chatAttempt.current) return;
              throw new Error(fail(cause));
            } finally { window.clearTimeout(timer); if (attempt === chatAttempt.current) setChatPending(false); }
          }} />
        </div>
      </div>
      <details className="mock-workflow"><summary>Developer mock workflow</summary>
        {editable && <form onSubmit={event => {
          event.preventDefault(); setBusy(true); setError('');
          const requestId = crypto.randomUUID();
          void connection.reducers.createGeneration({ projectId, requestId, request, scenario }).then(() => { setSelectedExample(''); const queued = [...connection.db.visibleGenerationJobs.iter()].find(row => row.requestId === requestId); setSelectedJob(queued?.id.toString() ?? ''); }).catch(fail).finally(() => setBusy(false));
        }}><fieldset disabled={busy || hasActive || editor.unsaved || mode !== 'mock'}>
          <label>Component request<textarea aria-label="Component request" required maxLength={4000} value={request} onChange={event => setRequest(event.target.value)} /></label>
          <p className="note">The job captures this project's saved technologies, guidance and all saved references. Past job context remains in history even if a reference is later removed.</p>
          <label>Mock outcome<select aria-label="Mock outcome" value={scenario} onChange={event => setScenario(event.target.value)}><option value="success">Preview success fixture</option><option value="generation_failure">Simulated generation failure</option><option value="build_failure">Simulated build failure</option></select></label>
          <Button>Queue mock generation</Button>
        </fieldset></form>}
        {!editable && <p>Read-only library access. An editor can create or run jobs.</p>}
        {!jobs.length && <p>No generation jobs yet.</p>}
        {jobs.length > 0 && <label>Generation history<select disabled={editor.unsaved} aria-label="Generation history" value={job?.id.toString() ?? ''} onChange={event => { setSelectedJob(event.target.value); setDeleting(false); }}>{ordered.map(row => <option key={row.id.toString()} value={row.id.toString()}>{row.request.slice(0, 55)} — {stages[row.state] ?? row.state}</option>)}</select></label>}
        {job && <>
          <p role="status" data-testid="generation-status">{isChatMode(job.mode) && job.state === 'generating' ? 'ComPlix is thinking' : isChatMode(job.mode) && job.state === 'draft_ready' && !files.length ? 'ComPlix replied' : stages[job.state] ?? job.state} · {job.componentId && !job.model ? 'Starter / unverified draft' : isChatMode(job.mode) ? job.mode === 'gemini' ? 'Gemini + Nemotron / unverified draft' : 'NVIDIA / unverified draft' : 'Mock / unverified candidate'}</p>
          {job.diagnostic && <p role={job.state === 'failed' ? 'alert' : undefined}>{job.diagnostic}</p>}
          {editable && active(job) && <>{job.mode === 'mock' && <Button disabled={busy || mode !== 'mock' || job.mode !== 'mock'} onClick={() => void run(job)}>{job.state === 'queued' ? 'Run mock pipeline' : 'Resume mock pipeline'}</Button>}<Button variant="secondary" onClick={() => void connection.reducers.cancelGeneration({ jobId: job.id }).catch(fail)}>Cancel job</Button></>}
          {editable && !active(job) && <><Button disabled={editor.unsaved} variant="secondary" onClick={() => setDeleting(true)}>Delete job history</Button>{deleting && <><p>Delete this job's conversation turn, stored context and candidate files? This cannot be undone.</p><Button onClick={() => void connection.reducers.removeGeneration({ jobId: job.id }).then(() => setDeleting(false)).catch(fail)}>Confirm job deletion</Button></>}</>}
        </>}
      </details>
  </section>;
}
