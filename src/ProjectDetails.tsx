import { useEffect, useState } from 'react';
import type { DbConnection } from './module_bindings';
import type { ProjectSummary } from './module_bindings/types';

export const technologyLabels = { framework: 'Framework(s)', language: 'Language(s)', styling: 'Styling', libraries: 'Libraries', versions: 'Versions and compatibility notes' };
export const emptyTechnology = { framework: '', language: '', styling: '', libraries: '', versions: '' };
export type Technology = typeof emptyTechnology;
export function technology(project: Technology): Technology {
  return Object.fromEntries(Object.keys(emptyTechnology).map(key => [key, project[key as keyof Technology]])) as Technology;
}
export function ProjectDetails({ project, connection }: { project: ProjectSummary; connection: DbConnection }) {
  const [values, setValues] = useState(() => technology(project));
  const [base, setBase] = useState(project.revision);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const conflict = dirty && base !== project.revision;
  const editable = project.permission === 'editor';
  useEffect(() => {
    if (!dirty) { setValues(technology(project)); setBase(project.revision); }
  }, [project, dirty]);
  return <section className="panel"><h2>Requested technologies</h2>
    <p className="note">These are your requested technologies, not verified generation support. Any framework, language or libraries can be recorded. No components are generated yet.</p>
    <form onSubmit={event => {
      event.preventDefault(); setBusy(true); setError('');
      void connection.reducers.updateProjectDetails({ projectId: project.id, expectedRevision: base, ...values })
        .then(() => setDirty(false)).catch(() => setError('Details could not be saved. Check your connection, access and the latest revision. Your edits remain here.'))
        .finally(() => setBusy(false));
    }}><fieldset disabled={busy || !editable}>
      {Object.entries(technologyLabels).map(([field, label]) => <label key={field}>{label}<input aria-label={'Edit ' + label} maxLength={1000}
        value={(editable ? values : project)[field as keyof Technology]} onChange={event => { setDirty(true); setValues(old => ({ ...old, [field]: event.target.value })); }} /></label>)}
      {editable && <button disabled={!dirty || conflict}>Save project details</button>}
    </fieldset></form>
    {conflict && <><p role="alert">Project details changed elsewhere. Copy your edits before loading the latest details.</p><button onClick={() => { setDirty(false); setError(''); }}>Load latest project details</button></>}
    {error && <p role="alert">{error}</p>}
  </section>;
}
