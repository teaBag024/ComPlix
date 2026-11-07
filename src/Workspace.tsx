import { useState, type FormEvent } from 'react';
import { profiles, type OutputProfile } from './profiles';

export type SavedProject = {
  id: bigint;
  name: string;
  owner: { toHexString(): string };
  outputStack: string;
};

export type WorkspaceProps = {
  status: 'loading' | 'ready' | 'error';
  project?: SavedProject;
  create: (name: string, outputStack: OutputProfile) => Promise<void>;
  rename: (id: bigint, name: string) => Promise<void>;
  retry: () => void;
};

export function Workspace({ status, project, create, rename, retry }: WorkspaceProps) {
  const [name, setName] = useState('');
  const [profile, setProfile] = useState<OutputProfile>('react-ts-tailwind-shadcn');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setNotice('');
    if (!name.trim() || name.trim().length > 80 || /[\u0000-\u001f\u007f]/.test(name)) {
      setError('Project name must be 1–80 characters without control characters.');
      return;
    }
    setPending(true);
    try {
      if (project) await rename(project.id, name);
      else await create(name, profile);
      setNotice('Saved on the local server.');
      setName('');
    } catch (cause) {
      // Reducer errors are controlled server messages. Transport failures use a fixed message.
      const message = cause instanceof Error ? cause.message : '';
      const known = [
        'You already have a saved project.', 'Choose a supported output profile.',
        'Project not found or access denied.',
        'Project name must be 1–80 characters without control characters.',
      ];
      setError(known.find(text => message.includes(text)) ?? 'Save could not be confirmed. Check the connection and retry; your saved project will be reloaded.');
    } finally {
      setPending(false);
    }
  }

  return <>
    <header><span className="brand">ComPlix<span aria-hidden="true">.</span></span><span className="badge">Local development</span></header>
    <main>
      <div className="eyebrow">Your library starts here</div>
      <h1>Project workspace</h1>
      <p className="intro">Give your project a name and choose the stack its component library will use. You can save one project with this local identity.</p>
      <section className="panel" aria-label="Project workspace">
        {status === 'loading' && <p role="status">Connecting and loading your saved project…</p>}
        {status === 'error' && <div><p role="alert" className="error">Cannot load your project. Start the local backend, publish the module, and allow browser storage, then retry. Your saved identity has not been reset.</p><button onClick={retry}>Retry connection</button></div>}
        {status === 'ready' && <>
          {project ? <>
            <p className="eyebrow">Saved project</p>
            <h2 data-testid="project-name">{project.name}</h2>
            <dl>
              <dt>Generated output profile</dt><dd>{profiles[project.outputStack as OutputProfile] ?? project.outputStack}</dd>
              <dt>Owner identity</dt><dd data-testid="owner">{project.owner.toHexString()}</dd>
            </dl>
          </> : <><h2>Create your project</h2><p className="muted">No saved project yet. Choose one output profile to get started.</p></>}
          <form onSubmit={submit}>
            <label htmlFor="project-name">{project ? 'New project name' : 'Project name'}</label>
            <input id="project-name" value={name} onChange={event => setName(event.target.value)} maxLength={80} required disabled={pending} autoComplete="off" />
            {!project && <><label htmlFor="output-stack">Generated output profile</label><select id="output-stack" value={profile} onChange={event => setProfile(event.target.value as OutputProfile)} disabled={pending}>
              {Object.entries(profiles).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select></>}
            <button disabled={pending} type="submit">{pending ? 'Saving…' : project ? 'Rename project' : 'Create project'}</button>
          </form>
          {error && <p role="alert" className="error">{error}</p>}
          {notice && <p role="status" className="status">{notice}</p>}
        </>}
      </section>
      <footer className="note">ComPlix itself uses React + TypeScript. The output profile describes your future generated library. Component generation, uploads, exports and previews are not available in this milestone.</footer>
    </main>
  </>;
}
