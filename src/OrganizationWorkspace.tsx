import { Badge } from './components/Badge';
import { Button } from './components/Button';
import { ProjectLibrary } from './ProjectLibrary';
import { ProjectReferences } from './ProjectReferences';
import { ProjectCard, projectStack } from './components/ProjectCard';
import { ProjectDetails } from './ProjectDetails';
import { ProjectSetup, type SetupStep } from './ProjectSetup';
import { StackPicker, defaultStackChoice, toTechnology, type StackChoice } from './StackPicker';
import { Modal } from './components/Modal';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { DbConnection, tables } from './module_bindings';
import { useWorkspace, endpoint, database } from './useWorkspace';

type WorkspacePage = 'projects' | 'library' | 'setup' | 'settings' | 'references' | 'sharing' | 'organization' | 'organizationOverview' | 'organizationProjects' | 'organizationMembers' | 'organizationSettings' | 'invitations';
type WorkspaceRoute = { page: WorkspacePage; projectId?: string; organizationId?: string; step?: SetupStep };
const setupSteps: SetupStep[] = ['questionnaire', 'references', 'components', 'progress'];

function readRoute(pathname: string): WorkspaceRoute {
  const parts = pathname.split('/').filter(Boolean);
  if (parts[0] === 'organizations') {
    if (parts.length === 1) return { page: 'organization' };
    if (!/^\d+$/.test(parts[1])) return { page: 'organization' };
    const page = parts[2];
    const organizationPage = page === 'projects' ? 'organizationProjects'
      : page === 'members' ? 'organizationMembers'
        : page === 'settings' ? 'organizationSettings' : 'organizationOverview';
    return { page: organizationPage, organizationId: parts[1] };
  }
  if (parts[0] === 'invitations') return { page: 'invitations' };
  if (parts[0] === 'projects' && parts.length > 1 && /^\d+$/.test(parts[1])) {
    const page = parts[2];
    if (page === 'setup') return { page: 'setup', projectId: parts[1], step: setupSteps.find(step => step === parts[3]) ?? 'questionnaire' };
    if (page === 'settings' || page === 'references' || page === 'sharing') {
      return { page, projectId: parts[1] };
    }
    return { page: 'library', projectId: parts[1] };
  }
  return { page: 'projects' };
}

function pathFor(page: WorkspacePage, projectId?: string, organizationId?: string, step: SetupStep = 'questionnaire') {
  if (page === 'projects') return '/projects';
  if (page === 'organization') return '/organizations';
  if (page === 'invitations') return '/invitations';
  if (['organizationOverview', 'organizationProjects', 'organizationMembers', 'organizationSettings'].includes(page)) {
    if (!organizationId) return '/organizations';
    const suffix = page === 'organizationOverview' ? '' : page === 'organizationProjects' ? '/projects' : page === 'organizationMembers' ? '/members' : '/settings';
    return `/organizations/${organizationId}${suffix}`;
  }
  if (!projectId) return '/projects';
  if (page === 'setup') return `/projects/${projectId}/setup/${step}`;
  return page === 'library' ? `/projects/${projectId}/components` : `/projects/${projectId}/${page}`;
}

export function OrganizationWorkspace({ token, signOut }: { token: string; signOut: () => Promise<void> }) {
  const draftGuard = useRef<(() => Promise<unknown>) | undefined>(undefined);
  const [attempt, setAttempt] = useState(0);
  const [route, setRoute] = useState<WorkspaceRoute>(() => readRoute(window.location.pathname));
  const [theme, setTheme] = useState<'light' | 'dark'>(() => window.localStorage.getItem('complix.theme') === 'dark' ? 'dark' : 'light');
  const { data, connection, status } = useWorkspace(token, attempt);
  const [projectList, setProjectList] = useState<'owned' | 'shared'>('owned');
  const [sharedOrganization, setSharedOrganization] = useState('');
  const [activeModal, setActiveModal] = useState<'project' | 'organization' | 'invitation' | 'projectInvitation' | null>(null);
  const [selectedProject, setSelectedProject] = useState(() => sessionStorage.getItem('complix.activeProject') ?? '');
  const [newStack, setNewStack] = useState<StackChoice>(defaultStackChoice);
  const [awaitingProject, setAwaitingProject] = useState<string[]>();
  const [newOrganization, setNewOrganization] = useState('0');
  const [association, setAssociation] = useState('0');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [orgName, setOrgName] = useState('');
  const [renameOrgName, setRenameOrgName] = useState('');
  const [projectName, setProjectName] = useState('');
  const [createName, setCreateName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('member');
  const [inviteAccess, setInviteAccess] = useState('');
  const [projectInviteMode, setProjectInviteMode] = useState<'project' | 'organization' | 'organizationProject'>('project');
  useEffect(() => { document.documentElement.dataset.theme = theme; }, [theme]);
  const toggleTheme = () => {
    const next = theme === 'light' ? 'dark' : 'light';
    window.localStorage.setItem('complix.theme', next);
    document.documentElement.dataset.theme = next;
    setTheme(next);
  };
  const navigate = async (page: WorkspacePage, projectId?: string, organizationId?: string, step?: SetupStep) => {
    try { await draftGuard.current?.(); }
    catch { setError('Save or resolve your draft edits before leaving the component workspace.'); return; }
    const nextProjectId = ['library', 'setup', 'settings', 'references', 'sharing'].includes(page) ? projectId ?? route.projectId : undefined;
    const nextOrganizationId = ['organizationOverview', 'organizationProjects', 'organizationMembers', 'organizationSettings'].includes(page)
      ? organizationId ?? route.organizationId : undefined;
    const nextStep = page === 'setup' ? step ?? 'questionnaire' : undefined;
    const nextPath = pathFor(page, nextProjectId, nextOrganizationId, nextStep);
    if (window.location.pathname !== nextPath) window.history.pushState({}, '', nextPath);
    setRoute({ page, projectId: nextProjectId, organizationId: nextOrganizationId, step: nextStep });
  };
  const latestRoute = useRef(route);
  latestRoute.current = route;
  useEffect(() => {
    const syncRoute = async () => {
      const next = readRoute(window.location.pathname);
      try {
        await draftGuard.current?.();
        if (next.page === 'library' && next.projectId && window.location.pathname !== pathFor('library', next.projectId)) {
          window.history.replaceState({}, '', pathFor('library', next.projectId));
        }
        setRoute(next);
      }
      catch {
        const previous = latestRoute.current;
        window.history.replaceState({}, '', pathFor(previous.page, previous.projectId, previous.organizationId, previous.step));
        setError('Save or resolve your draft edits before leaving the component workspace.');
      }
    };
    window.addEventListener('popstate', syncRoute);
    if (window.location.pathname === '/' || window.location.pathname === '/callback') {
      window.history.replaceState({}, '', '/projects');
    } else {
      const current = readRoute(window.location.pathname);
      if (current.page === 'library' && current.projectId && window.location.pathname !== pathFor('library', current.projectId)) {
        window.history.replaceState({}, '', pathFor('library', current.projectId));
      }
    }
    return () => window.removeEventListener('popstate', syncRoute);
  }, []);
  useEffect(() => { window.scrollTo(0, 0); }, [route.page, route.projectId, route.organizationId]);
  const org = route.organizationId ? data.organizations.find(item => item.id.toString() === route.organizationId) : undefined;
  const project = route.projectId ? data.projects.find(item => item.id.toString() === route.projectId) : undefined;
  const projectOrganization = project ? data.organizations.find(item => item.id === project.organizationId) : undefined;
  const projectContext = project ?? data.projects.find(item => item.id.toString() === selectedProject);
  useEffect(() => {
    if (project) {
      sessionStorage.setItem('complix.activeProject', project.id.toString());
      setSelectedProject(project.id.toString());
    }
    setAssociation(String(project?.organizationId ?? 0n));
  }, [project?.id, project?.organizationId]);
  const manager = org?.role === 'owner' || org?.role === 'admin';
  const projectOrganizationManager = projectOrganization?.role === 'owner' || projectOrganization?.role === 'admin';
  const ownedProjects = data.projects.filter(item => item.ownership === 'personal' && !!data.profile && item.owner.isEqual(data.profile.identity));
  const sharedProjects = data.projects.filter(item => !ownedProjects.some(owned => owned.id === item.id));
  const openProject = (id: bigint) => {
    const target = data.projects.find(item => item.id === id);
    if (target?.setupState === 'setup') return navigate('setup', id.toString(), undefined, 'questionnaire');
    if (target?.setupState === 'generating') return navigate('setup', id.toString(), undefined, 'progress');
    return navigate('library', id.toString());
  };
  // Projects still in the wizard always show setup; other project pages wait until it is finished.
  const inSetup = !!project && project.setupState === 'setup';
  useEffect(() => {
    if (inSetup && route.page !== 'setup' && project) void navigate('setup', project.id.toString(), undefined, 'questionnaire');
  }, [inSetup, route.page, project?.id]);
  const cards = (items: typeof data.projects) => <div className="project-grid">{items.map(item => <ProjectCard key={item.id.toString()}
    project={item} owned={ownedProjects.some(owned => owned.id === item.id)} active={item.id === project?.id}
    organization={data.organizations.find(space => space.id === item.organizationId)?.name} open={() => openProject(item.id)} />)}</div>;
  const projectAccessMembers = project ? [
    ...data.members.filter(member => member.organizationId === project.organizationId && !member.user.isEqual(project.owner) &&
      (project.ownership === 'personal' || member.role === 'member')).map(member => ({
        key: 'member:' + member.key, user: member.user, name: member.name, email: member.email, role: member.role,
        projectRole: data.shares.find(grant => grant.projectId === project.id && grant.user.isEqual(member.user))?.role ?? '',
      })),
    ...data.shares.filter(grant => grant.projectId === project.id && !grant.user.isEqual(project.owner) &&
      !data.members.some(member => member.organizationId === project.organizationId && member.user.isEqual(grant.user))).map(grant => ({
        key: 'share:' + grant.key, user: grant.user, name: grant.name, email: grant.email, role: '', projectRole: grant.role,
      })),
  ] : [];
  const visibleSharedProjects = sharedOrganization
    ? sharedProjects.filter(item => item.organizationId.toString() === sharedOrganization)
    : sharedProjects;

  useEffect(() => {
    if (!awaitingProject || !data.profile) return;
    const added = data.projects.find(row => row.owner.isEqual(data.profile!.identity) && !awaitingProject.includes(row.id.toString()));
    if (added) { openProject(added.id); setAwaitingProject(undefined); }
  }, [awaitingProject, data.projects, data.profile]);

  useEffect(() => {
    setError(''); setNotice(''); setProjectName('');
    setInviteEmail(''); setInviteRole('member'); setInviteAccess('');
  }, [org?.id, org?.role]);
  useEffect(() => { setRenameOrgName(org?.name ?? ''); }, [org?.id, org?.name]);
  async function run(action: () => Promise<void>) {
    setPending(true); setError(''); setNotice('');
    try { await action(); setNotice('Saved.'); return true; }
    catch (cause) {
      const message = cause instanceof Error ? cause.message : typeof cause === 'string' ? cause : '';
      const known = ['Access denied.', 'This organization already has a project.', 'An active invitation already exists for this email.', 'An active project invitation already exists for this email.', 'You already have access to this project.', 'You are already a member.', 'A valid email address is required.', 'Name must be 1–80 characters without control characters.', 'Create the organization project before granting project access.', 'Sign in with a verified email address.', 'Project owner access cannot be changed.', 'Your session expired. Sign in again and retry.', 'Choose a project you manage in this organization.', 'Technology details must be at most 1000 characters per field without control characters.', 'Organization owners cannot leave their organization.'];
      setError(known.find(text => message.includes(text)) ?? 'The operation could not be confirmed. Check your access and connection before retrying.');
      return false;
    } finally { setPending(false); }
  }
  function form(event: FormEvent, action: () => Promise<void>, onSuccess?: () => void) {
    event.preventDefault();
    void run(action).then(success => { if (success) onSuccess?.(); });
  }
  const api = () => { if (!connection || status !== 'ready') throw new Error('Disconnected'); return connection.reducers; };
  async function importLegacy() {
    const oldToken = localStorage.getItem('complix.local.identity.v1');
    if (!oldToken || !data.profile) throw new Error('No legacy identity');
    const destination = data.profile.identity;
    let legacy: DbConnection | undefined;
    try {
      const legacyId = await new Promise<bigint>((resolve, reject) => {
        const timeout = window.setTimeout(() => reject(new Error('Legacy transfer timed out')), 10000);
        legacy = DbConnection.builder().withUri(endpoint).withDatabaseName(database).withToken(oldToken)
          .onConnect(ctx => ctx.subscriptionBuilder().onApplied(() => {
            const row = [...ctx.db.myProject.iter()][0];
            if (!row) { window.clearTimeout(timeout); reject(new Error('No legacy project')); return; }
            void ctx.reducers.prepareLegacyTransfer({ destination }).then(() => {
              window.clearTimeout(timeout); resolve(row.id);
            }).catch(() => { window.clearTimeout(timeout); reject(new Error('Legacy transfer denied')); });
          }).onError(() => { window.clearTimeout(timeout); reject(new Error('Legacy subscription failed')); }).subscribe(tables.myProject))
          .onConnectError(() => { window.clearTimeout(timeout); reject(new Error('Legacy identity rejected')); }).build();
      });
      await api().importLegacyProject({ organizationId: 0n, legacyId });
      // Preserve the original token until the server confirms transfer completion.
      localStorage.removeItem('complix.local.identity.v1');
    } finally { legacy?.disconnect(); }
  }
  return <>
    <header className="app-header">
      <div className="header-project-context">
        <Button type="button" className="brand brand-link" onClick={() => navigate('projects')}>ComPlix.</Button>
        {project && <Button type="button" className="secondary back-to-projects" onClick={() => navigate('projects')}>All projects</Button>}
        {(project || route.page === 'invitations') && data.projects.length > 0 && <label className="project-switcher">Project<select aria-label="Active project" value={projectContext?.id.toString() ?? ''} onChange={e => {
          if (!e.target.value) return;
          if (!project) {
            setSelectedProject(e.target.value);
            sessionStorage.setItem('complix.activeProject', e.target.value);
          } else openProject(BigInt(e.target.value));
        }}>
          {!projectContext && <option value="">Choose a project</option>}{data.projects.map(item => <option key={item.id.toString()} value={item.id.toString()} data-testid={project?.id === item.id ? 'project-name' : undefined}>{item.name}</option>)}</select></label>}
      </div>
      {project && inSetup
        ? <nav className="project-page-nav" aria-label="Project pages"><Badge>Project setup</Badge></nav>
        : project
        ? <nav className="project-page-nav" aria-label="Project pages">
          <Button type="button" aria-current={route.page === 'library' ? 'page' : undefined} onClick={() => navigate('library')}>Components</Button>
          <Button type="button" aria-current={['settings', 'references', 'sharing'].includes(route.page) ? 'page' : undefined} onClick={() => navigate('settings')}>Settings</Button>
        </nav>
        : route.organizationId && org
          ? <nav className="project-page-nav organization-page-nav" aria-label="Organization pages">
            <Button type="button" variant="secondary" onClick={() => navigate('organization')}>All organizations</Button>
            <Button type="button" aria-current={route.page === 'organizationOverview' ? 'page' : undefined} onClick={() => navigate('organizationOverview')}>Overview</Button>
            <Button type="button" aria-current={route.page === 'organizationProjects' ? 'page' : undefined} onClick={() => navigate('organizationProjects')}>Projects</Button>
            <Button type="button" aria-current={route.page === 'organizationMembers' ? 'page' : undefined} onClick={() => navigate('organizationMembers')}>Members &amp; invitations</Button>
            <Button type="button" aria-current={route.page === 'organizationSettings' ? 'page' : undefined} onClick={() => navigate('organizationSettings')}>Settings</Button>
          </nav>
          : <nav className="top-navigation" aria-label="Workspace pages">
          <Button type="button" aria-current={route.page === 'projects' ? 'page' : undefined} onClick={() => navigate('projects')}>Projects</Button>
          <Button type="button" aria-current={route.page === 'organization' ? 'page' : undefined} onClick={() => navigate('organization')}>Organizations</Button>
          <Button type="button" aria-current={route.page === 'invitations' ? 'page' : undefined} onClick={() => navigate('invitations')}>Invitations{data.invitations.length > 0 ? ` (${data.invitations.length})` : ''}</Button>
        </nav>}
      <div className="header-actions">
        {project && <span className="badge access-badge">{ownedProjects.some(item => item.id === project.id) ? 'Owner' : project.permission === 'editor' ? 'Editor' : 'Viewer'}</span>}
        <Button type="button" className="secondary theme-toggle" onClick={toggleTheme} aria-pressed={theme === 'dark'} aria-label={'Switch to ' + (theme === 'light' ? 'dark' : 'light') + ' theme'}>{theme === 'light' ? 'Dark mode' : 'Light mode'}</Button>
        <Button type="button" className="secondary sign-out" onClick={() => { void (async () => { try { await draftGuard.current?.(); await signOut(); } catch { setError('Save or resolve your draft edits before signing out.'); } })(); }}>Sign out</Button>
      </div>
    </header>
    <main>
      {!project && <><div className="eyebrow">{route.organizationId ? 'Organization workspace' : 'Your component libraries'}</div>
      <h1>{route.organizationId ? org?.name ?? 'Organization'
        : route.page === 'organization' ? 'Organizations'
          : route.page === 'invitations' ? 'Invitations' : 'Your projects'}</h1></>}
      {status === 'loading' && <p role="status">Connecting and loading your workspace…</p>}
      {status === 'error' && <section className="panel"><p role="alert" className="error">Cannot load the workspace. Check the backend connection, configured sign-in client, and verified email, then retry.</p><Button onClick={() => setAttempt(value => value + 1)}>Retry connection</Button></section>}
      {status === 'ready' && <>
        {route.page === 'projects' && <p className="intro">Signed in as <strong>{data.profile?.name}</strong> · <span data-testid="profile-email">{data.profile?.email}</span></p>}
        {route.organizationId && !org && <section className="panel"><p role="alert">This organization is unavailable or you no longer have access.</p><Button type="button" onClick={() => navigate('organization')}>Back to organizations</Button></section>}
        {project && route.page !== 'library' && <><div className="project-page-heading"><div className="eyebrow">Project workspace</div><h1>{project.name}</h1></div>
          <p className="project-stack-summary">{projectStack(project)}</p></>}
        {route.page === 'projects' && <>
        <div className="workspace-overview" aria-label="Workspace overview">
          <div><strong>{ownedProjects.length} owned {ownedProjects.length === 1 ? 'project' : 'projects'}</strong><span>Create private projects and share only with selected people.</span></div>
          <div><strong>A stack for each project</strong><span>Choose frameworks, languages and libraries independently.</span></div>
          <div><strong>{data.organizations.length} {data.organizations.length === 1 ? 'organization' : 'organizations'}</strong><span>Optional shared spaces for people and multiple projects.</span></div>
        </div></>}
        {error && !activeModal && <p role="alert" className="error">{error}</p>}
        {notice && <p role="status" className="status">{notice}</p>}
        {route.projectId && !project && status === 'ready' && <section className="panel">
          <p role="alert">This project is unavailable or you no longer have access.</p>
          <Button type="button" onClick={() => navigate('projects')}>Back to projects</Button>
        </section>}
        <fieldset disabled={pending} className="workspace-controls">
          {route.page === 'projects' && <section className="route-page" aria-label="Projects">
          <div className="project-actions-row">
            <div className="project-list-switch" role="group" aria-label="Project list">
              <Button type="button" className={projectList === 'owned' ? '' : 'secondary'} aria-pressed={projectList === 'owned'} onClick={() => setProjectList('owned')}>My projects</Button>
              <Button type="button" className={projectList === 'shared' ? '' : 'secondary'} aria-pressed={projectList === 'shared'} onClick={() => setProjectList('shared')}>Shared projects</Button>
            </div>
            {projectList === 'shared' && <label className="shared-project-filter">Organization<select aria-label="Filter shared projects by organization" value={sharedOrganization} onChange={e => setSharedOrganization(e.target.value)}>
                <option value="">All organizations</option>{data.organizations.map(item => <option key={item.id.toString()} value={item.id.toString()}>{item.name}</option>)}
            </select></label>}
            <Button type="button" className="create-project-shortcut" onClick={() => { setError(''); setActiveModal('project'); }}>+ Create project</Button>
          </div>
          {projectList === 'owned'
            ? ownedProjects.length ? cards(ownedProjects) : <p className="empty-projects">You don't own any projects yet. Use Create project to start your first library.</p>
            : visibleSharedProjects.length ? cards(visibleSharedProjects) : <p className="empty-projects">No shared projects in this organization yet.</p>}
          </section>}
          {route.page === 'setup' && <section className="route-page" aria-label="Setup">
          {project && connection && <ProjectSetup key={'setup:' + project.id.toString()} project={project} step={route.step ?? 'questionnaire'}
            go={step => void navigate('setup', project.id.toString(), undefined, step)} openLibrary={() => void navigate('library', project.id.toString())}
            guidance={data.guidance.find(row => row.projectId === project.id)} references={data.references.filter(row => row.projectId === project.id)}
            tasks={data.starterTasks.filter(row => row.projectId === project.id)} components={data.components.filter(row => row.projectId === project.id)}
            imports={data.imports.filter(row => row.projectId === project.id)} chatEnabled={data.chatEnabled} connection={connection} />}
          </section>}
          {route.page === 'library' && <section className="route-page" aria-label="Components">
          {project?.setupState === 'generating' && <p role="status" className="setup-banner">Starter components are still being generated. <Button type="button" variant="secondary" onClick={() => void navigate('setup', project.id.toString(), undefined, 'progress')}>View progress</Button></p>}
          {project && connection && <ProjectLibrary key={'library:' + project.id.toString()} projectId={project.id} target={project} instructions={data.instructions.filter(row => row.projectId === project.id)} draftGuard={draftGuard} editable={project.permission === 'editor'}
            components={data.components.filter(row => row.projectId === project.id)} messages={data.messages.filter(row => row.projectId === project.id)} drafts={data.drafts.filter(row => row.projectId === project.id)} previews={data.previews.filter(row => row.projectId === project.id)} jobs={data.jobs.filter(row => row.projectId === project.id)} references={data.references.filter(row => row.projectId === project.id)} mode={data.generationMode} chatEnabled={data.chatEnabled} connection={connection} />}
          </section>}
          {route.page === 'references' && <section className="route-page" aria-label="References">
          {project && connection && <ProjectReferences key={'references:' + project.id.toString()} editable={project.permission === 'editor'}
            references={data.references.filter(row => row.projectId === project.id).map(row => ({ ...row, byteLength: row.bytes.length }))}
            upload={(filename, purpose, bytes) => connection.reducers.uploadReference({ projectId: project.id, filename, purpose, bytes })}
            uploadPdf={(filename, purpose, bytes, text) => connection.reducers.uploadPdfReference({ projectId: project.id, filename, purpose, bytes, text })}
            remove={referenceId => connection.reducers.removeReference({ referenceId })} />}
          </section>}
          {route.page === 'sharing' && <section className="route-page" aria-label="Project sharing">
          {project && <section className="panel"><h2>Project sharing</h2><p className="note">{project.organizationId ? 'Manage the organization and people who can access this library.' : 'This library is private. Choose an organization to share it with selected members.'}</p>            {project.canManage && project.ownership === 'personal' && <form onSubmit={e => form(e, () => api().setProjectOrganization({ projectId: project.id, organizationId: BigInt(association) }))}>
              <label>Project sharing organization<select aria-label="Project sharing organization" value={association} onChange={e => setAssociation(e.target.value)}><option value="0">Private — no organization</option>{data.organizations.map(item => <option key={item.id.toString()} value={item.id.toString()}>{item.name}</option>)}</select></label>
              <p className="note">Changing or removing the organization removes all existing project grants and pending invitation grants. It does not transfer ownership.</p><Button>Update sharing organization</Button>
            </form>}</section>}
          {project?.canManage && <section className="panel"><div className="panel-heading"><h2>Share this project</h2>
            <Button type="button" variant="secondary" onClick={() => {
              setError(''); setProjectInviteMode('project'); setInviteAccess('viewer'); setInviteRole('member'); setActiveModal('projectInvitation');
            }}>Invite to project</Button>
          </div>
            <p>Project access is granted explicitly. A project-only invitation does not add organization membership. Removing a member from an organization removes their grants to that organization’s projects.</p>
            <ul className="member-list">{projectAccessMembers.map(member => <li key={member.key}>
              <strong>{member.name}</strong>{member.role && <Badge>{member.role}</Badge>}{member.email && <span> · {member.email}</span>}
              <label>Project access for {member.name}<select aria-label={'Project access for ' + member.name}
                value={member.projectRole}
                onChange={e => void run(() => api().setProjectAccess({ projectId: project.id, member: member.user, role: e.target.value }))}>
                <option value="">No access</option><option value="viewer">Viewer</option><option value="editor">Editor</option>
              </select></label>
            </li>)}</ul>
            {projectAccessMembers.length === 0 && <p className="note">No one else currently has access to this project.</p>}
          </section>}
          </section>}
          {route.page === 'organization' && <section className="route-page" aria-label="Organizations">
            <section className="panel">
              <div className="panel-heading"><h2>Your organization spaces</h2>
                <Button type="button" variant="secondary" onClick={() => { setError(''); setActiveModal('organization'); }}>+ Create organization</Button>
              </div>
              <p className="note">You can belong to no organizations, one, or many. Each is a shared space for members to collaborate on multiple projects. Joining does not give everyone access to every project.</p>
              <div className="space-grid">{data.organizations.map(space => {
                const spaceProjects = data.projects.filter(item => item.organizationId === space.id);
                return <article className="space-card" key={space.id.toString()} aria-label={'Organization space ' + space.name}>
                  <div className="card-badges"><Badge>Organization space</Badge><Badge>Your role: {space.role}</Badge></div><h3>{space.name}</h3>
                  <p className="note">{spaceProjects.length} {spaceProjects.length === 1 ? 'project' : 'projects'} you can access in this space</p>
                  {spaceProjects.length ? <ul className="space-projects">{spaceProjects.map(item => <li key={item.id.toString()}>
                    <Button type="button" className="space-project-link" onClick={() => openProject(item.id)}>{item.name}</Button><span>{projectStack(item)}</span>
                  </li>)}</ul> : <p className="note">No projects shared with you here yet. Private and ungranted projects are not listed.</p>}
                  <Button type="button" variant="secondary" onClick={() => navigate('organizationOverview', undefined, space.id.toString())}>Manage {space.name}</Button>
                </article>;
              })}</div>
              {!data.organizations.length && <p>No organizations yet. Your private projects work without one. Create a shared space or accept an invitation.</p>}
            </section>
          </section>}

          {route.page === 'organizationOverview' && org && <section className="route-page" aria-label="Organization overview">
            <section className="panel">
              <div className="card-badges"><Badge>Organization space</Badge><Badge>Your role: {org.role}</Badge></div>
              <p>You can access {data.projects.filter(item => item.organizationId === org.id).length} projects in this shared space.</p>
              <p className="note">Organization membership does not automatically grant access to every project.</p>
              <div className="project-actions-row">
                <Button type="button" onClick={() => navigate('organizationProjects')}>View projects</Button>
                <Button type="button" variant="secondary" onClick={() => navigate('organizationMembers')}>Manage members</Button>
                {manager && <Button type="button" variant="secondary" onClick={() => navigate('organizationSettings')}>Organization settings</Button>}
              </div>
              {data.projects.some(item => item.organizationId === org.id) && <ul className="space-projects">{data.projects.filter(item => item.organizationId === org.id).map(item =>
                <li key={item.id.toString()}><Button type="button" className="space-project-link" onClick={() => openProject(item.id)}>{item.name}</Button><span>{projectStack(item)}</span></li>)}</ul>}
            </section>
            {org.role !== 'owner' && <Button type="button" variant="secondary" onClick={() => void run(() => api().leaveOrganization({ organizationId: org.id }))}>Leave {org.name}</Button>}
          </section>}

          {route.page === 'organizationProjects' && org && <section className="route-page" aria-label="Organization projects">
            <section className="panel">
              <h2>Projects you can access in {org.name}</h2>
              <p className="note">Open a project to work in its regular project workspace. Projects you do not have access to are not shown.</p>
              {data.projects.filter(item => item.organizationId === org.id).length
                ? cards(data.projects.filter(item => item.organizationId === org.id))
                : <p>No projects are shared with you in this organization yet.</p>}
            </section>
          </section>}

          {route.page === 'organizationMembers' && org && <section className="route-page" aria-label="Organization members and invitations">
            <section className="panel">
              <div className="panel-heading"><h2>Members of {org.name}</h2>
                {manager && <Button type="button" variant="secondary" onClick={() => { setError(''); setInviteRole('member'); setInviteAccess(''); setActiveModal('invitation'); }}>Invite member</Button>}
              </div>
              <p className="note">Organization roles manage membership. They do not grant access to personally owned projects.</p>
              {manager ? <ul className="member-list">{data.members.filter(member => member.organizationId === org.id).map(member => <li key={member.key}>
                <strong>{member.name}</strong> · {member.email} <Badge>{member.role}</Badge>
                {member.role !== 'owner' && <>
                  {org.role === 'owner' && <label>Organization role for {member.name}<select aria-label={'Organization role for ' + member.name} value={member.role} onChange={e => void run(() => api().setMemberRole({ organizationId: org.id, member: member.user, role: e.target.value }))}>
                    <option value="member">Member</option><option value="admin">Admin</option>
                  </select></label>}
                  {(org.role === 'owner' || member.role === 'member') && <Button type="button" variant="secondary" onClick={() => void run(() => api().removeMember({ organizationId: org.id, member: member.user }))}>Remove {member.name}</Button>}
                </>}
              </li>)}</ul> : <p>Only organization owners and admins can view and manage the member roster.</p>}
            </section>
            <section className="panel">
              <h2>Pending invitations</h2>
              <p className="note">Invitations expire after seven days. No email is sent; share the app address with the recipient.</p>
              <ul className="member-list">{data.invitations.filter(invite => invite.organizationId === org.id).map(invite => <li key={invite.id.toString()}>
                <strong>{invite.email}</strong> · {invite.role || 'member'}{invite.projectRole ? ` · ${invite.projectRole} access to ${invite.projectName}` : ''}
                <p className="note">Expires {new Date(Number(invite.expiresAt.microsSinceUnixEpoch / 1000n)).toLocaleString()}</p>
                {manager && <Button type="button" variant="secondary" onClick={() => void run(() => api().revokeInvitation({ invitationId: invite.id }))}>Revoke invitation for {invite.email}</Button>}
              </li>)}</ul>
              {!data.invitations.some(invite => invite.organizationId === org.id) && <p>No pending invitations.</p>}
            </section>
            {org.role !== 'owner' && <Button type="button" variant="secondary" onClick={() => void run(() => api().leaveOrganization({ organizationId: org.id }))}>Leave {org.name}</Button>}
          </section>}

          {route.page === 'organizationSettings' && org && <section className="route-page" aria-label="Organization settings">
            <section className="panel">
              <h2>Organization settings</h2>
              <p className="muted">Your role: {org.role}</p>
              {manager
                ? <form onSubmit={e => form(e, () => api().renameOrganization({ organizationId: org.id, name: renameOrgName }))}>
                    <label>Organization name<input aria-label="Organization name" required maxLength={80} value={renameOrgName} onChange={e => setRenameOrgName(e.target.value)} /></label>
                    <Button>Save organization name</Button>
                  </form>
                : <p>Only organization owners and admins can change organization settings.</p>}
            </section>
          </section>}
          {route.page === 'invitations' && <section className="route-page" aria-label="Invitations"><section className="panel"><h2>Invitations</h2>
            {!data.invitations.length && <p>No pending invitations.</p>}
            <ul className="member-list">{data.invitations.map(invite => <li key={invite.id.toString()}>
              <strong>{invite.organizationId ? invite.organizationName : `Project: ${invite.projectName}`}</strong> · {invite.email}
              {invite.organizationId && <> · {invite.role || 'member'}</>}
              {invite.projectRole && <> · {invite.projectRole} access to {invite.projectName}</>}
              <p className="note">Expires {new Date(Number(invite.expiresAt.microsSinceUnixEpoch / 1000n)).toLocaleString()}</p>
              {invite.email === data.profile?.email && <Button type="button" onClick={() => void run(() => api().acceptInvitation({ invitationId: invite.id }))}>
                {invite.organizationId ? `Accept invitation to ${invite.organizationName}` : `Accept project invitation to ${invite.projectName}`}
              </Button>}
              {(data.organizations.some(item => item.id === invite.organizationId && ['owner', 'admin'].includes(item.role)) ||
                (!invite.organizationId && data.projects.some(item => item.id === invite.projectId && item.canManage))) &&
                <Button type="button" variant="secondary" onClick={() => void run(() => api().revokeInvitation({ invitationId: invite.id }))}>Revoke invitation for {invite.email}</Button>}
            </li>)}</ul>
          </section>
          </section>}
          {route.page === 'settings' && <section className="route-page" aria-label="Project settings">
          {project && <>
            <section className="panel"><h2>Project settings</h2>
              <p>{project.organizationId ? 'Shared through ' + (data.organizations.find(item => item.id === project.organizationId)?.name ?? 'an organization') : 'Private project — no organization'}</p>
              <p className="muted">Your project access: {project.permission}{project.ownership === 'organization' ? ' · Existing organization-owned project' : ''}</p>
              {project.permission === 'editor' && <form onSubmit={e => form(e, async () => { await api().renameProject({ projectId: project.id, name: projectName }); setProjectName(''); })}>
                <label>Project name<input aria-label="New project name" required maxLength={80} value={projectName} onChange={e => setProjectName(e.target.value)} /></label><Button>Rename project</Button>
              </form>}
            </section>
            <ProjectDetails key={'details:' + project.id.toString()} project={project} />
            <section className="panel"><div className="settings-reference-summary">
              <div><strong>Saved References ({data.references.filter(row => row.projectId === project.id).length} / 20 files · 128 KiB per-file cap)</strong>
                <p className="note">{data.references.filter(row => row.projectId === project.id).map(row => row.filename).join(', ') || 'No references saved yet.'}</p>
              </div>
              <Button type="button" variant="secondary" onClick={() => navigate('references')}>Manage references</Button>
            </div></section>
            <section className="panel"><h2>Sharing</h2>
              <p className="note">Manage this project's organization association and member access separately from its technology settings.</p>
              <Button type="button" variant="secondary" onClick={() => navigate('sharing')}>Manage sharing</Button>
            </section>
          </>}
          </section>}
        </fieldset>
        {route.page === 'projects' && <footer className="note">Requested technologies describe your project; mock generation and preview fixtures are not real generated output or build verification.</footer>}
      </>}
    </main>
    <Modal open={activeModal === 'project'} title="Create a project you own" onClose={() => setActiveModal(null)}>
      {error && <p role="alert" className="error">{error}</p>}
      <p className="note">Start privately or choose an optional organization space. You can share with selected members later.</p>
      <form onSubmit={e => form(e, async () => {
        const previousIds = data.projects.map(row => row.id.toString());
        await api().createSetupProject({ name: createName, organizationId: BigInt(newOrganization), ...toTechnology(newStack) });
        setAwaitingProject(previousIds);
        setCreateName('');
      }, () => setActiveModal(null))}>
        <h3>Project details and its technology stack</h3>
        <label>Project name<input aria-label="Project name" required maxLength={80} value={createName} onChange={e => setCreateName(e.target.value)} /></label>
        <label>Share through organization<select aria-label="Share through organization" value={newOrganization} onChange={e => setNewOrganization(e.target.value)}>
          <option value="0">Private — no organization</option>{data.organizations.map(item => <option key={item.id.toString()} value={item.id.toString()}>{item.name}</option>)}
        </select></label>
        <p className="note">Selecting an organization does not give its members or admins access. Grant access to specific members after creating the project.</p>
        <StackPicker value={newStack} onChange={setNewStack} />
        <p className="note">Next, you'll answer a short design questionnaire or upload a style guide, then ComPlix generates your starter components.</p>
        <div className="modal-actions"><Button type="button" variant="secondary" onClick={() => setActiveModal(null)}>Cancel</Button><Button disabled={pending}>Create project and start setup</Button></div>
      </form>
      {localStorage.getItem('complix.local.identity.v1') && <Button variant="secondary" disabled={pending} onClick={() => void run(importLegacy)}>Import previous local project as private</Button>}
    </Modal>
    {project?.canManage && <Modal open={activeModal === 'projectInvitation'} title={'Invite someone to ' + project.name} onClose={() => setActiveModal(null)}>
      {error && <p role="alert" className="error">{error}</p>}
      <form onSubmit={e => form(e, async () => {
        if (projectInviteMode === 'project') {
          await api().inviteProject({ projectId: project.id, email: inviteEmail, projectRole: inviteAccess });
        } else if (projectOrganization && projectOrganizationManager) {
          const includeProject = projectInviteMode === 'organizationProject';
          await api().inviteMember({ organizationId: projectOrganization.id, email: inviteEmail, role: inviteRole,
            projectRole: includeProject ? inviteAccess : '', projectId: includeProject ? project.id : undefined });
        } else throw new Error('You no longer have permission to invite into this organization.');
        setInviteEmail('');
      }, () => setActiveModal(null))}>
        <label htmlFor="project-invite-email">Invite email<input id="project-invite-email" required type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} /></label>
        {projectOrganization && projectOrganizationManager && <label htmlFor="project-invite-mode">Invitation access<select id="project-invite-mode" value={projectInviteMode} onChange={e => setProjectInviteMode(e.target.value as typeof projectInviteMode)}>
          <option value="project">This project only</option>
          <option value="organization">Organization only</option>
          <option value="organizationProject">Organization and this project</option>
        </select></label>}
        {projectInviteMode !== 'project' && projectOrganization && projectOrganizationManager &&
          <label htmlFor="project-invite-org-role">Organization role<select id="project-invite-org-role" value={inviteRole} onChange={e => setInviteRole(e.target.value)}>
            <option value="member">Member</option>{projectOrganization.role === 'owner' && <option value="admin">Admin</option>}
          </select></label>}
        {projectInviteMode !== 'organization' && <label htmlFor="project-invite-access">Project access<select id="project-invite-access" required value={inviteAccess} onChange={e => setInviteAccess(e.target.value)}>
          <option value="viewer">Viewer</option><option value="editor">Editor</option>
        </select></label>}
        <p className="note">Invitations expire after seven days. Project-only access does not add organization membership. No email is sent; share the app address with the recipient.</p>
        <div className="modal-actions"><Button type="button" variant="secondary" onClick={() => setActiveModal(null)}>Cancel</Button><Button disabled={pending}>Create invitation</Button></div>
      </form>
    </Modal>}
    <Modal open={activeModal === 'organization'} title="Create organization" onClose={() => setActiveModal(null)}>
      {error && <p role="alert" className="error">{error}</p>}
      <form onSubmit={e => form(e, async () => { await api().createOrganization({ name: orgName }); setOrgName(''); }, () => setActiveModal(null))}>
        <label htmlFor="organization-name">Organization name<input id="organization-name" required maxLength={80} value={orgName} onChange={e => setOrgName(e.target.value)} /></label>
        <div className="modal-actions"><Button type="button" variant="secondary" onClick={() => setActiveModal(null)}>Cancel</Button><Button disabled={pending}>Create organization</Button></div>
      </form>
    </Modal>
    {org && manager && <Modal open={activeModal === 'invitation'} title={'Invite a member to ' + org.name} onClose={() => setActiveModal(null)}>
      {error && <p role="alert" className="error">{error}</p>}
      <form onSubmit={e => form(e, async () => {
        await api().inviteMember({ organizationId: org.id, email: inviteEmail, role: inviteRole, projectRole: inviteAccess, projectId: projectContext?.canManage && projectContext.organizationId === org.id ? projectContext.id : undefined });
        setInviteEmail('');
      }, () => setActiveModal(null))}>
        <label htmlFor="invite-email">Invite email<input id="invite-email" required type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} /></label>
        <label htmlFor="invite-role">Organization role<select id="invite-role" value={inviteRole} onChange={e => setInviteRole(e.target.value)}><option value="member">Member</option>{org.role === 'owner' && <option value="admin">Admin</option>}</select></label>
        <label htmlFor="invite-access">Initial project access<select id="invite-access" value={inviteAccess} onChange={e => setInviteAccess(e.target.value)}><option value="">No access</option>{projectContext?.canManage && projectContext.organizationId === org.id && <><option value="viewer">Viewer</option><option value="editor">Editor</option></>}</select></label>
        <p className="note">The invitation expires after seven days. No email is sent; share the app address with the recipient.</p>
        <div className="modal-actions"><Button type="button" variant="secondary" onClick={() => setActiveModal(null)}>Cancel</Button><Button disabled={pending}>Create invitation</Button></div>
      </form>
    </Modal>}
  </>;
}
