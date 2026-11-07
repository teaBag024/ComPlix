import { Tabs, TabsList, TabsTrigger, TabsContent } from './components/ui/tabs';
import { ProjectDetails, emptyTechnology, technologyLabels, type Technology } from './ProjectDetails';
import { ProjectGuidance } from './ProjectGuidance';
import { useEffect, useState, type FormEvent } from 'react';
import { DbConnection, tables } from './module_bindings';
import { useWorkspace, endpoint, database } from './useWorkspace';
import { profiles } from './profiles';

export function OrganizationWorkspace({ token, signOut }: { token: string; signOut: () => Promise<void> }) {
  const [attempt, setAttempt] = useState(0);
  const { data, connection, status } = useWorkspace(token, attempt);
  const [selected, setSelected] = useState('');
  const [selectedProject, setSelectedProject] = useState(() => sessionStorage.getItem('complix.activeProject') ?? '');
  const [newTechnology, setNewTechnology] = useState<Technology>(emptyTechnology);
  const [awaitingProject, setAwaitingProject] = useState<string[]>();
  const [newOrganization, setNewOrganization] = useState('0');
  const [association, setAssociation] = useState('0');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [orgName, setOrgName] = useState('');
  const [projectName, setProjectName] = useState('');
  const [createName, setCreateName] = useState('');
  const [profile, setProfile] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('member');
  const [inviteAccess, setInviteAccess] = useState('');
  const org = data.organizations.find(item => item.id.toString() === selected) ?? data.organizations[0];
  const project = data.projects.find(item => item.id.toString() === selectedProject) ?? data.projects[0];
  useEffect(() => {
    if (project) { sessionStorage.setItem('complix.activeProject', project.id.toString()); setSelectedProject(project.id.toString()); }
    setAssociation(String(project?.organizationId ?? 0n));
  }, [project?.id, project?.organizationId]);
  const manager = org?.role === 'owner' || org?.role === 'admin';
  useEffect(() => {
    if (!awaitingProject || !data.profile) return;
    const added = data.projects.find(row => row.owner.isEqual(data.profile!.identity) && !awaitingProject.includes(row.id.toString()));
    if (added) { setSelectedProject(added.id.toString()); setAwaitingProject(undefined); }
  }, [awaitingProject, data.projects, data.profile]);

  useEffect(() => {
    setError(''); setNotice(''); setProjectName('');
    setInviteEmail(''); setInviteRole('member'); setInviteAccess('');
  }, [org?.id, org?.role]);
  async function run(action: () => Promise<void>) {
    setPending(true); setError(''); setNotice('');
    try { await action(); setNotice('Saved.'); }
    catch (cause) {
      const message = cause instanceof Error ? cause.message : '';
      const known = ['Access denied.', 'This organization already has a project.', 'An active invitation already exists for this email.', 'You are already a member.', 'A valid email address is required.', 'Name must be 1–80 characters without control characters.', 'Create the organization project before granting project access.', 'Sign in with a verified email address.', 'Project owner access cannot be changed.', 'Your session expired. Sign in again and retry.', 'Choose a project you manage in this organization.', 'Technology details must be at most 1000 characters per field without control characters.', 'Organization owners cannot leave their organization.'];
      setError(known.find(text => message.includes(text)) ?? 'The operation could not be confirmed. Check your access and connection before retrying.');
    } finally { setPending(false); }
  }
  function form(event: FormEvent, action: () => Promise<void>) { event.preventDefault(); void run(action); }
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
    <header><span className="brand">ComPlix.</span><button className="secondary" onClick={() => void signOut()}>Sign out</button></header>
    <main>
      <div className="eyebrow">Shared component libraries</div><h1>Project workspace</h1>
      {status === 'loading' && <p role="status">Connecting and loading your workspace…</p>}
      {status === 'error' && <section className="panel"><p role="alert" className="error">Cannot load the workspace. Check the backend connection, configured sign-in client, and verified email, then retry.</p><button onClick={() => setAttempt(value => value + 1)}>Retry connection</button></section>}
      {status === 'ready' && <>
        <p className="intro">Signed in as <strong>{data.profile?.name}</strong> · <span data-testid="profile-email">{data.profile?.email}</span></p>
        {error && <p role="alert" className="error">{error}</p>}
        {notice && <p role="status" className="status">{notice}</p>}
        <fieldset disabled={pending} className="workspace-controls">
          <div className="workspace-toolbar">
            <div><span className="eyebrow">Active library</span><h2 data-testid={project ? "project-name" : undefined}>{project?.name ?? 'Your workspace'}</h2>
            <span className="badge">{project ? project.permission === 'editor' ? 'Editor' : 'Viewer' : 'Create a project to get started'}</span></div>
            {data.projects.length > 0 && <label className="project-switcher">Active project<select aria-label="Active project" value={project?.id.toString() ?? ''} onChange={e => setSelectedProject(e.target.value)}>{data.projects.map(item => <option key={item.id.toString()} value={item.id.toString()}>{item.name}</option>)}</select></label>}
          </div>
          <Tabs defaultValue="projects">
            <TabsList aria-label="Workspace sections">
              <TabsTrigger value="projects">Projects</TabsTrigger>
              <TabsTrigger value="guidance" disabled={!project}>Design guidance</TabsTrigger>
              <TabsTrigger value="technologies" disabled={!project}>Technologies</TabsTrigger>
              <TabsTrigger value="sharing" disabled={!project}>Sharing</TabsTrigger>
              <TabsTrigger value="organization">Organization</TabsTrigger>
              <TabsTrigger value="invitations">Invitations {data.invitations.length > 0 && <span className="tab-count">{data.invitations.length}</span>}</TabsTrigger>
            </TabsList>
          <TabsContent value="projects"><section className="panel"><h2>Your projects</h2>
            <p className="note">Create a reusable library. Keep it private or share it with your team.</p>
            <form onSubmit={e => form(e, async () => {
              const previousIds = data.projects.map(row => row.id.toString());
              await api().createProjectWithDetails({ name: createName, organizationId: BigInt(newOrganization), ...newTechnology });
              setAwaitingProject(previousIds);
              setCreateName('');
            })}>
              <h3>Create a project</h3>
              <label>Project name<input aria-label="Project name" required maxLength={80} value={createName} onChange={e => setCreateName(e.target.value)} /></label>
              <label>Share through organization<select aria-label="Share through organization" value={newOrganization} onChange={e => setNewOrganization(e.target.value)}>
                <option value="0">Private — no organization</option>{data.organizations.map(item => <option key={item.id.toString()} value={item.id.toString()}>{item.name}</option>)}
              </select></label>
              <p className="note">Selecting an organization does not give its members or admins access. Grant access to specific members after creating the project.</p>
              <label>Technology starting point<select aria-label="Technology starting point" value={profile} onChange={e => {
                const value = e.target.value; setProfile(value);
                setNewTechnology(value === 'blazor-bootstrap' ? { framework: 'Blazor', language: 'C#', styling: 'Bootstrap', libraries: '', versions: '' }
                  : value === 'react-ts-tailwind-shadcn' ? { framework: 'React', language: 'TypeScript', styling: 'Tailwind CSS', libraries: 'shadcn/ui', versions: '' } : emptyTechnology);
              }}><option value="">Custom / undecided</option>{Object.entries(profiles).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
              {Object.entries(technologyLabels).map(([field, label]) => <label key={field}>{label}<input aria-label={'Requested ' + label} maxLength={1000} value={newTechnology[field as keyof Technology]} onChange={e => setNewTechnology(old => ({ ...old, [field]: e.target.value }))} /></label>)}
              <button>Create project</button>
            </form>
            {localStorage.getItem('complix.local.identity.v1') && <button className="secondary" onClick={() => void run(importLegacy)}>Import previous local project as private</button>}
          </section>
          {project && <section className="panel"><h2>Project settings</h2>
            <p>{project.organizationId ? 'Shared through ' + (data.organizations.find(item => item.id === project.organizationId)?.name ?? 'an organization') : 'Private project — no organization'}</p>
            <p className="muted">Your project access: {project.permission}{project.ownership === 'organization' ? ' · Existing organization-owned project' : ''}</p>
            {project.permission === 'editor' && <form onSubmit={e => form(e, async () => { await api().renameProject({ projectId: project.id, name: projectName }); setProjectName(''); })}>
              <label>New project name<input aria-label="New project name" required maxLength={80} value={projectName} onChange={e => setProjectName(e.target.value)} /></label><button>Rename project</button>
            </form>}
          </section>}
          </TabsContent><TabsContent value="technologies">
          {project && connection && <ProjectDetails key={'details:' + project.id.toString()} project={project} connection={connection} />}
          </TabsContent><TabsContent value="guidance">
          {project && connection && <ProjectGuidance key={'guidance:' + project.id.toString()} projectId={project.id}
            identity={data.profile!.identity.toHexString()} editable={project.permission === 'editor'}
            saved={data.guidance.find(row => row.projectId === project.id)} connection={connection} />}
          </TabsContent><TabsContent value="sharing">
          {project && <section className="panel"><h2>Project sharing</h2><p className="note">{project.organizationId ? 'Manage the organization and people who can access this library.' : 'This library is private. Choose an organization to share it with selected members.'}</p>            {project.canManage && project.ownership === 'personal' && <form onSubmit={e => form(e, () => api().setProjectOrganization({ projectId: project.id, organizationId: BigInt(association) }))}>
              <label>Project sharing organization<select aria-label="Project sharing organization" value={association} onChange={e => setAssociation(e.target.value)}><option value="0">Private — no organization</option>{data.organizations.map(item => <option key={item.id.toString()} value={item.id.toString()}>{item.name}</option>)}</select></label>
              <p className="note">Changing or removing the organization removes all existing project grants and pending invitation grants. It does not transfer ownership.</p><button>Update sharing organization</button>
            </form>}</section>}
          {project?.canManage && project.organizationId !== 0n && <section className="panel"><h2>Share this project</h2>
            <p>Only selected members receive access to personal projects. Existing organization-owned projects retain owner/admin management. Removing a member from the organization removes their grants.</p>
            <ul className="member-list">{data.members.filter(member => member.organizationId === project.organizationId && !member.user.isEqual(project.owner) && (project.ownership === 'personal' || member.role === 'member')).map(member => <li key={member.key}>
              <strong>{member.name}</strong><label>Project access for {member.name}<select aria-label={'Project access for ' + member.name}
                value={data.shares.find(grant => grant.projectId === project.id && grant.user.isEqual(member.user))?.role ?? ''}
                onChange={e => void run(() => api().setProjectAccess({ projectId: project.id, member: member.user, role: e.target.value }))}>
                <option value="">No access</option><option value="viewer">Viewer</option><option value="editor">Editor</option>
              </select></label>
            </li>)}</ul>
          </section>}
          </TabsContent><TabsContent value="organization">
          <section className="panel">
            <h2>Your organizations</h2>
            {data.organizations.length ? <><label htmlFor="organization">Active organization</label><select id="organization" value={org?.id.toString() ?? ''} onChange={e => setSelected(e.target.value)}>
              {data.organizations.map(item => <option key={item.id.toString()} value={item.id.toString()}>{item.name}</option>)}
            </select><p className="muted">Your role: {org?.role}</p></> : <p>No organizations yet. Create one or accept an invitation.</p>}
            <form onSubmit={e => form(e, async () => { await api().createOrganization({ name: orgName }); setOrgName(''); })}>
              <label htmlFor="organization-name">New organization name</label><input id="organization-name" required maxLength={80} value={orgName} onChange={e => setOrgName(e.target.value)} />
              <button>Create organization</button>
            </form>
          </section>

          {org && org.role !== 'owner' && <button onClick={() => void run(() => api().leaveOrganization({ organizationId: org.id }))}>Leave {org.name}</button>}
          {org && manager && <section className="panel">
            <h2>Members and access</h2>
            <p className="note">Organization roles manage membership. They do not grant access to personally owned projects.</p>
            <ul className="member-list">{data.members.filter(member => member.organizationId === org.id).map(member => <li key={member.key}>
              <strong>{member.name}</strong> · {member.email} <span className="badge">{member.role}</span>
              {member.role !== 'owner' && <>
                {org.role === 'owner' && <label>Organization role for {member.name}<select aria-label={'Organization role for ' + member.name} value={member.role} onChange={e => void run(() => api().setMemberRole({ organizationId: org.id, member: member.user, role: e.target.value }))}>
                  <option value="member">Member</option><option value="admin">Admin</option>
                </select></label>}
                {(org.role === 'owner' || member.role === 'member') && <button className="secondary" onClick={() => void run(() => api().removeMember({ organizationId: org.id, member: member.user }))}>Remove {member.name}</button>}
              </>}
            </li>)}</ul>
            <form onSubmit={e => form(e, async () => { await api().inviteMember({ organizationId: org.id, email: inviteEmail, role: inviteRole, projectRole: inviteAccess, projectId: project?.canManage && project.organizationId === org.id ? project.id : undefined }); setInviteEmail(''); })}>
              <label htmlFor="invite-email">Invite email</label><input id="invite-email" required type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} />
              <label htmlFor="invite-role">Organization role</label><select id="invite-role" value={inviteRole} onChange={e => setInviteRole(e.target.value)}><option value="member">Member</option>{org.role === 'owner' && <option value="admin">Admin</option>}</select>
              <label htmlFor="invite-access">Initial project access</label><select id="invite-access" value={inviteAccess} onChange={e => setInviteAccess(e.target.value)}><option value="">No access</option>{project?.canManage && project.organizationId === org.id && <><option value="viewer">Viewer</option><option value="editor">Editor</option></>}</select>
              <button>Create invitation</button>
            </form>
            <p className="note">Invitations expire after seven days and appear when the recipient signs in with that verified email. No invitation email is sent; share the app address with them.</p>
          </section>}
          </TabsContent><TabsContent value="invitations"><section className="panel"><h2>Invitations</h2>
            {!data.invitations.length && <p>No pending invitations.</p>}
            <ul className="member-list">{data.invitations.map(invite => <li key={invite.id.toString()}>
              <strong>{invite.organizationName}</strong> · {invite.email} · {invite.role} / {invite.projectRole || 'no project access'}
              <p className="note">Expires {new Date(Number(invite.expiresAt.microsSinceUnixEpoch / 1000n)).toLocaleString()}</p>
              {invite.email === data.profile?.email && <button onClick={() => void run(() => api().acceptInvitation({ invitationId: invite.id }))}>Accept invitation to {invite.organizationName}</button>}
              {data.organizations.some(item => item.id === invite.organizationId && ['owner', 'admin'].includes(item.role)) && <button className="secondary" onClick={() => void run(() => api().revokeInvitation({ invitationId: invite.id }))}>Revoke invitation for {invite.email}</button>}
            </li>)}</ul>
          </section>
          </TabsContent></Tabs>
        </fieldset>
        <footer className="note">Requested technologies describe your future generated libraries. Component generation and previews are not part of this milestone.</footer>
      </>}
    </main>
  </>;
}
