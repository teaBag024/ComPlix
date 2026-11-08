import { useEffect, useState } from 'react';
import type { DbConnection } from './module_bindings';
import type { ProjectSummary } from './module_bindings/types';
import type { Component, Guidance, ProjectReference, StarterTask } from './useWorkspace';
import { Button } from './components/Button';
import { Badge } from './components/Badge';
import { ProjectReferences } from './ProjectReferences';
import { selectStackAdapter } from '../shared/stackAdapters';
import { starterComponents } from '../shared/starterComponents';
import { colorFields, emptyQuestionnaire, hasAnswers, parseQuestionnaire, personalityOptions, questionnaireChoices, textFields, type Questionnaire } from '../shared/questionnaire';

export type SetupStep = 'questionnaire' | 'references' | 'components' | 'progress';
const steps: Array<[SetupStep, string]> = [['questionnaire', 'Questionnaire'], ['references', 'Documents'], ['components', 'Starter components'], ['progress', 'Build']];
const knownErrors = ['Answer the questionnaire or upload at least one document before continuing.', 'Guidance changed. Review the latest saved version.',
  'Questionnaire answers are invalid. Reload the page and try again.', 'Project edit access is required.', 'Your session expired. Sign in again and retry.',
  'ComPlix chat is not configured. Contact the operator.', 'Choose at least one starter component.', 'Starter components can only be generated during project setup.',
  'Starter components need a supported stack (React + TypeScript or Blazor). Finish setup without starters instead.'];
function message(cause: unknown) {
  const text = cause instanceof Error ? cause.message : '';
  return knownErrors.find(item => text.includes(item)) ?? 'The change could not be confirmed. Check your connection and project access, then retry.';
}
function savedAnswers(guidance?: Guidance) {
  try { return parseQuestionnaire(guidance?.questionnaire ?? ''); } catch { return emptyQuestionnaire(); }
}

export function ProjectSetup({ project, step, go, openLibrary, guidance, references, tasks, components, chatEnabled, connection }: {
  project: ProjectSummary; step: SetupStep; go: (step: SetupStep) => void; openLibrary: () => void;
  guidance?: Guidance; references: ProjectReference[]; tasks: StarterTask[]; components: Component[]; chatEnabled: boolean; connection: DbConnection;
}) {
  const editable = project.permission === 'editor';
  const answered = hasAnswers(savedAnswers(guidance));
  const canContinue = answered || references.length > 0;
  const generating = project.setupState === 'generating' || tasks.length > 0;
  // Starting generation locks the earlier steps; the progress page is the only place left to go.
  const current: SetupStep = generating && project.setupState !== 'setup' ? 'progress' : step === 'progress' && !generating ? 'components' : step;
  useEffect(() => { if (current !== step) go(current); }, [current, step]);
  if (!editable) return <section className="panel setup-panel"><h2>Project setup in progress</h2>
    <p>The project owner is still setting up this library. Its components will appear here once setup finishes.</p></section>;
  return <section className="setup" aria-label="Project setup">
    <ol className="setup-steps">{steps.map(([id, label], index) => {
      const reachable = !generating && (id === 'questionnaire' || id === 'references' || (id === 'components' && canContinue));
      return <li key={id} aria-current={current === id ? 'step' : undefined}>
        <button type="button" disabled={!reachable || current === id} onClick={() => go(id)}><span className="setup-step-number">{index + 1}</span>{label}</button>
      </li>;
    })}</ol>
    {current === 'questionnaire' && <QuestionnaireStep key={guidance?.revision.toString() ?? '0'} project={project} guidance={guidance} connection={connection} next={() => go('references')} />}
    {current === 'references' && <>
      <ProjectReferences heading="Upload supporting documents" editable references={references.map(row => ({ ...row, byteLength: row.bytes.length }))}
        upload={(filename, purpose, bytes) => connection.reducers.uploadReference({ projectId: project.id, filename, purpose, bytes })}
        uploadPdf={(filename, purpose, bytes, text) => connection.reducers.uploadPdfReference({ projectId: project.id, filename, purpose, bytes, text })}
        remove={referenceId => connection.reducers.removeReference({ referenceId })} />
      <div className="setup-actions">
        <Button type="button" variant="secondary" onClick={() => go('questionnaire')}>Back to questionnaire</Button>
        {!canContinue && <p className="note" role="status">Answer the questionnaire or upload at least one document to continue.</p>}
        <Button type="button" disabled={!canContinue} onClick={() => go('components')}>Continue to starter components</Button>
      </div>
    </>}
    {current === 'components' && <ComponentsStep project={project} chatEnabled={chatEnabled} connection={connection} back={() => go('references')} started={() => go('progress')} finished={openLibrary} />}
    {current === 'progress' && <ProgressStep project={project} tasks={tasks} components={components} connection={connection} openLibrary={openLibrary} />}
  </section>;
}

function QuestionnaireStep({ project, guidance, connection, next }: { project: ProjectSummary; guidance?: Guidance; connection: DbConnection; next: () => void }) {
  const [values, setValues] = useState<Questionnaire>(() => savedAnswers(guidance));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const set = <K extends keyof Questionnaire>(key: K, value: Questionnaire[K]) => { setError(''); setValues(old => ({ ...old, [key]: value })); };
  async function save() {
    setBusy(true); setError('');
    try {
      await connection.reducers.saveQuestionnaire({ projectId: project.id, expectedRevision: guidance?.revision ?? 0n, answers: JSON.stringify(values) });
      next();
    } catch (cause) { setError(message(cause)); }
    finally { setBusy(false); }
  }
  return <form className="panel setup-panel" onSubmit={event => { event.preventDefault(); void save(); }}>
    <h2>Tell us about your design</h2>
    <p className="note">ComPlix uses these answers to style your starter components. Leave anything you're unsure about as "No preference". You can skip this step if you'll upload a style guide instead.</p>
    <fieldset disabled={busy} className="questionnaire">
      <section><h3>Product</h3>
        <ChoiceField name="productType" values={values} set={set} />
        <label>{textFields.audience.label}<textarea rows={2} maxLength={textFields.audience.max} value={values.audience} placeholder="e.g. Operations staff checking daily metrics" onChange={event => set('audience', event.target.value)} /></label>
      </section>
      <section><h3>Look and feel</h3>
        <fieldset className="chip-group"><legend>Personality</legend>{personalityOptions.map(option => <label key={option} className="chip">
          <input type="checkbox" checked={values.personality.includes(option)} onChange={event => set('personality', event.target.checked ? [...values.personality, option] : values.personality.filter(item => item !== option))} />{option}
        </label>)}</fieldset>
        <div className="questionnaire-grid">
          <ChoiceField name="theme" values={values} set={set} />
          <ChoiceField name="corners" values={values} set={set} />
          <ChoiceField name="shadows" values={values} set={set} />
          <ChoiceField name="density" values={values} set={set} />
        </div>
      </section>
      <section><h3>Color</h3>
        <div className="questionnaire-grid">
          {(Object.entries(colorFields) as Array<[keyof typeof colorFields, string]>).map(([key, label]) => <div key={key} className="color-field">
            <span>{label}</span>
            <div><input type="color" aria-label={label + ' picker'} value={values[key] || '#4f7a5f'} onChange={event => set(key, event.target.value)} />
              <input aria-label={label} placeholder="No preference" maxLength={7} value={values[key]} onChange={event => set(key, event.target.value.trim())} />
              {values[key] && <Button type="button" variant="secondary" onClick={() => set(key, '')}>Clear</Button>}</div>
          </div>)}
          <ChoiceField name="neutralTone" values={values} set={set} />
        </div>
      </section>
      <section><h3>Typography and accessibility</h3>
        <div className="questionnaire-grid">
          <ChoiceField name="font" values={values} set={set} />
          <ChoiceField name="fontSize" values={values} set={set} />
          <ChoiceField name="accessibility" values={values} set={set} />
        </div>
        <label>{textFields.notes.label}<textarea rows={3} maxLength={textFields.notes.max} value={values.notes} placeholder="e.g. Buttons use sentence case. Avoid red except for errors." onChange={event => set('notes', event.target.value)} /></label>
      </section>
    </fieldset>
    {error && <p role="alert" className="error">{error}</p>}
    <div className="setup-actions">
      <Button type="button" variant="secondary" disabled={busy} onClick={next}>Skip — I'll upload a style guide</Button>
      <Button disabled={busy || !hasAnswers(values)}>{busy ? 'Saving…' : 'Save and continue'}</Button>
    </div>
  </form>;
}
function ChoiceField({ name, values, set }: { name: keyof typeof questionnaireChoices; values: Questionnaire; set: (key: keyof typeof questionnaireChoices, value: string) => void }) {
  const spec = questionnaireChoices[name];
  // An explicit name: a wrapping label would otherwise include the selected option ("Theme No preference").
  return <label>{spec.label}<select aria-label={spec.label} value={values[name]} onChange={event => set(name, event.target.value)}>
    <option value="">No preference</option>{spec.options.map(option => <option key={option}>{option}</option>)}
  </select></label>;
}

function ComponentsStep({ project, chatEnabled, connection, back, started, finished }: {
  project: ProjectSummary; chatEnabled: boolean; connection: DbConnection; back: () => void; started: () => void; finished: () => void;
}) {
  const [chosen, setChosen] = useState<string[]>(starterComponents.map(item => item.id));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const adapter = selectStackAdapter(project);
  const blocked = !adapter ? 'Starter components need a supported stack (React + TypeScript or Blazor). You can finish setup and add components later.'
    : !chatEnabled ? 'ComPlix chat is not configured on this server, so starter components cannot be generated. Contact the operator, or finish setup without them.' : '';
  async function act(action: () => Promise<void>, done: () => void) {
    setBusy(true); setError('');
    try { await action(); done(); } catch (cause) { setError(message(cause)); } finally { setBusy(false); }
  }
  return <section className="panel setup-panel"><h2>Choose your starter components</h2>
    <p className="note">ComPlix generates each one in your project's stack ({adapter?.label ?? 'unsupported stack'}) using your questionnaire and documents. Each takes about a minute; you can tweak them or add more in the component workspace afterwards.</p>
    <fieldset disabled={busy || !!blocked} className="starter-options">
      <legend>Starter components</legend>
      {starterComponents.map(item => <label key={item.id} className="starter-option">
        <input type="checkbox" checked={chosen.includes(item.id)} onChange={event => setChosen(old => event.target.checked ? [...old, item.id] : old.filter(id => id !== item.id))} />
        <span><strong>{item.label}</strong><span className="note">{item.description}</span></span>
      </label>)}
    </fieldset>
    {blocked && <p role="status" className="note">{blocked}</p>}
    {error && <p role="alert" className="error">{error}</p>}
    <div className="setup-actions">
      <Button type="button" variant="secondary" disabled={busy} onClick={back}>Back to documents</Button>
      <Button type="button" variant="secondary" disabled={busy} onClick={() => void act(() => connection.reducers.finishProjectSetup({ projectId: project.id }), finished)}>Finish without starter components</Button>
      <Button type="button" disabled={busy || !!blocked || !chosen.length} onClick={() => void act(() => connection.reducers.startStarterLibrary({ projectId: project.id, starterIds: chosen }), started)}>
        {busy ? 'Starting…' : `Generate ${chosen.length} starter component${chosen.length === 1 ? '' : 's'}`}</Button>
    </div>
  </section>;
}

const stateLabels: Record<string, string> = { pending: 'Waiting', generating: 'Generating…', done: 'Ready', failed: 'Failed' };
function ProgressStep({ project, tasks, components, connection, openLibrary }: {
  project: ProjectSummary; tasks: StarterTask[]; components: Component[]; connection: DbConnection; openLibrary: () => void;
}) {
  const [error, setError] = useState('');
  const ordered = [...tasks].sort((a, b) => a.position - b.position);
  const finished = ordered.filter(task => task.state === 'done' || task.state === 'failed').length;
  const complete = project.setupState === 'ready';
  const failures = ordered.filter(task => task.state === 'failed').length;
  return <section className="panel setup-panel setup-progress" aria-busy={!complete}>
    <h2>{complete ? failures ? 'Your starter library is ready, with some gaps' : 'Your starter library is ready' : 'Building your starter library'}</h2>
    <p className="note">{complete ? 'Open the component workspace to preview, tweak or add components. Drafts are unverified until you preview them.'
      : 'ComPlix is generating each component on the server, one at a time. You can leave this page; generation continues and you can come back.'}</p>
    <div className="setup-meter" role="progressbar" aria-label="Starter components finished" aria-valuemin={0} aria-valuemax={ordered.length} aria-valuenow={finished}>
      <span style={{ width: `${ordered.length ? (finished / ordered.length) * 100 : 0}%` }} />
    </div>
    <p role="status" data-testid="starter-progress">{finished} of {ordered.length} components finished</p>
    <ul className="starter-tasks">{ordered.map(task => {
      const name = components.find(row => row.id === task.componentId)?.name ?? starterComponents.find(item => item.id === task.starterId)?.label ?? task.starterId;
      return <li key={task.id.toString()} data-state={task.state} aria-label={name + ': ' + (stateLabels[task.state] ?? task.state)}>
        <span className="starter-indicator" aria-hidden="true" />
        <span className="starter-task-name"><strong>{name}</strong>{task.message && <span className="note">{task.message}</span>}</span>
        <Badge>{stateLabels[task.state] ?? task.state}</Badge>
        {task.state === 'failed' && <Button type="button" variant="secondary" onClick={() => { setError(''); void connection.reducers.retryStarterTask({ taskId: task.id }).catch(cause => setError(message(cause))); }}>Retry {name}</Button>}
      </li>;
    })}</ul>
    {error && <p role="alert" className="error">{error}</p>}
    <div className="setup-actions">
      <Button type="button" variant={complete ? undefined : 'secondary'} onClick={openLibrary}>{complete ? 'Open component library' : 'Open workspace while this finishes'}</Button>
    </div>
  </section>;
}
