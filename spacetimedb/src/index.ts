import { schema, table, t, SenderError, type InferSchema, type ReducerCtx, type ViewCtx } from 'spacetimedb/server';
import { Identity, Timestamp } from 'spacetimedb';

// Preserve the first milestone's schema and data for explicit, proof-of-possession transfer.
const project = table({ name: 'project' }, {
  id: t.u64().primaryKey().autoInc(), owner: t.identity().unique(), name: t.string(), outputStack: t.string(),
});
const userProfile = table({ name: 'user_profile' }, {
  identity: t.identity().primaryKey(), email: t.string(), name: t.string(),
});
const organization = table({ name: 'organization' }, {
  id: t.u64().primaryKey().autoInc(), name: t.string(), owner: t.identity(),
});
const membership = table({ name: 'membership' }, {
  key: t.string().primaryKey(), organizationId: t.u64().index('btree'), user: t.identity().index('btree'), role: t.string(),
});
const workspaceProject = table({ name: 'workspace_project' }, {
  id: t.u64().primaryKey().autoInc(), organizationId: t.u64().index('btree'), name: t.string(), outputStack: t.string(), createdBy: t.identity(),
  ownership: t.string().default('organization'), framework: t.string().default(''), language: t.string().default(''),
  styling: t.string().default(''), libraries: t.string().default(''), versions: t.string().default(''), revision: t.u64().default(0n),
});
const projectAccess = table({ name: 'project_access' }, {
  key: t.string().primaryKey(), projectId: t.u64().index('btree'), user: t.identity().index('btree'), role: t.string(),
});
const invitation = table({ name: 'invitation' }, {
  id: t.u64().primaryKey().autoInc(), organizationId: t.u64().index('btree'), email: t.string().index('btree'),
  role: t.string(), projectId: t.u64(), projectRole: t.string(), expiresAt: t.timestamp(),
});
const legacyTransfer = table({ name: 'legacy_transfer' }, {
  legacyId: t.u64().primaryKey(), destination: t.identity(), expiresAt: t.timestamp(), claimed: t.bool(),
});
const projectGuidance = table({ name: 'project_guidance' }, {
  projectId: t.u64().primaryKey(), revision: t.u64(), audience: t.string(), technical: t.string(),
  style: t.string(), colors: t.string(), typography: t.string(), spacing: t.string(), accessibility: t.string(), guidance: t.string(),
});
const db = schema({ project, userProfile, organization, membership, workspaceProject, projectAccess, invitation, legacyTransfer, projectGuidance }, {
  env: { AUTH_ISSUER: t.string().optional(), AUTH_CLIENT_ID: t.string().optional() },
});
export default db;
type Ctx = ReducerCtx<InferSchema<typeof db>>;
type ReadCtx = ViewCtx<InferSchema<typeof db>>;
const key = (id: bigint, user: Identity) => id.toString() + ':' + user.toHexString();
function denied(): never { throw new SenderError('Access denied.'); }
function name(value: string) {
  const result = value.trim();
  if (!result || result.length > 80 || /[\u0000-\u001f\u007f]/.test(result)) throw new SenderError('Name must be 1–80 characters without control characters.');
  return result;
}
function email(value: string) {
  const result = value.trim().toLowerCase();
  if (result.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(result)) throw new SenderError('A valid email address is required.');
  return result;
}
function claims(ctx: Ctx) {
  const jwt = ctx.senderAuth.jwt;
  if (!ctx.env.AUTH_ISSUER || !ctx.env.AUTH_CLIENT_ID || !jwt ||
      jwt.issuer !== ctx.env.AUTH_ISSUER || !jwt.audience.includes(ctx.env.AUTH_CLIENT_ID)) denied();
  const payload = jwt.fullPayload;
  if (payload.email_verified !== true || typeof payload.email !== 'string') {
    throw new SenderError('Sign in with a verified email address.');
  }
  if (typeof payload.exp !== 'number' || BigInt(Math.floor(payload.exp)) * 1000000n <= ctx.timestamp.microsSinceUnixEpoch) throw new SenderError('Your session expired. Sign in again and retry.');
  return { email: email(payload.email), name: name(typeof payload.name === 'string' ? payload.name : payload.email) };
}
function user(ctx: Ctx) {
  const current = claims(ctx);
  const row = ctx.db.userProfile.identity.find(ctx.sender);
  if (!row || row.email !== current.email) throw new SenderError('Refresh your signed-in profile.');
  return row;
}
function role(ctx: Ctx | ReadCtx, org: bigint, who: Identity) {
  return ctx.db.membership.key.find(key(org, who))?.role;
}
function manager(ctx: Ctx, org: bigint) {
  user(ctx);
  const current = role(ctx, org, ctx.sender);
  if (current !== 'owner' && current !== 'admin') denied();
  return current;
}
type ProjectRow = { id: bigint; organizationId: bigint; createdBy: Identity; ownership: string };
function projectOwner(ctx: Ctx | ReadCtx, row: ProjectRow) {
  return row.ownership === 'organization' ? ctx.db.organization.id.find(row.organizationId)?.owner : row.createdBy;
}
function canManageProject(ctx: Ctx | ReadCtx, row: ProjectRow, who: Identity) {
  if (projectOwner(ctx, row)?.isEqual(who)) return true;
  return row.ownership === 'organization' && ['owner', 'admin'].includes(role(ctx, row.organizationId, who) ?? '');
}
function permission(ctx: Ctx | ReadCtx, row: ProjectRow, who: Identity) {
  if (canManageProject(ctx, row, who)) return 'editor';
  if (!row.organizationId || !role(ctx, row.organizationId, who)) return '';
  // Personal projects require their owner to remain in the sharing organization.
  if (row.ownership === 'personal' && !role(ctx, row.organizationId, row.createdBy)) return '';
  return ctx.db.projectAccess.key.find(key(row.id, who))?.role ?? '';
}
function accessibleProjects(ctx: Ctx | ReadCtx) {
  return [...ctx.db.workspaceProject.iter()].filter(row => permission(ctx, row, ctx.sender));
}
const detailFields = { framework: t.string(), language: t.string(), styling: t.string(), libraries: t.string(), versions: t.string() };
function validateDetails(values: { framework: string; language: string; styling: string; libraries: string; versions: string }) {
  for (const value of Object.values(values)) if (value.length > 1000 || /[\u0000-\u001f\u007f]/.test(value)) throw new SenderError('Technology details must be at most 1000 characters per field without control characters.');
}
function presetDetails(outputStack: string) {
  return outputStack === 'blazor-bootstrap'
    ? { framework: 'Blazor', language: 'C#', styling: 'Bootstrap', libraries: '', versions: '' }
    : { framework: 'React', language: 'TypeScript', styling: 'Tailwind CSS', libraries: 'shadcn/ui', versions: '' };
}
function validateStack(value: string) {
  if (!['react-ts-tailwind-shadcn', 'blazor-bootstrap'].includes(value)) throw new SenderError('Choose a supported output profile.');
}
export const registerProfile = db.reducer(ctx => {
  const data = claims(ctx);
  const row = { identity: ctx.sender, ...data };
  if (ctx.db.userProfile.identity.find(ctx.sender)) ctx.db.userProfile.identity.update(row);
  else ctx.db.userProfile.insert(row);
});
// Admission protects subscriptions as well as mutations. Legacy holders retain only
// their old read/transfer path; they cannot acquire organization permissions.
export const onConnect = db.clientConnected(ctx => {
  const old = ctx.db.project.owner.find(ctx.sender);
  if (old && !ctx.db.legacyTransfer.legacyId.find(old.id)?.claimed) return;
  claims(ctx);
});
export const createOrganization = db.reducer({ name: t.string() }, (ctx, args) => {
  user(ctx);
  const org = ctx.db.organization.insert({ id: 0n, name: name(args.name), owner: ctx.sender });
  ctx.db.membership.insert({ key: key(org.id, ctx.sender), organizationId: org.id, user: ctx.sender, role: 'owner' });
});
// Compatibility entry for older preset clients. New UI uses open-ended createProjectWithDetails.
export const createProject = db.reducer({ organizationId: t.u64(), name: t.string(), outputStack: t.string() }, (ctx, args) => {
  manager(ctx, args.organizationId);
  validateStack(args.outputStack);
  ctx.db.workspaceProject.insert({ id: 0n, organizationId: args.organizationId, name: name(args.name), outputStack: args.outputStack, createdBy: ctx.sender, ownership: 'personal', ...presetDetails(args.outputStack), revision: 0n });
});
export const createProjectWithDetails = db.reducer({ name: t.string(), organizationId: t.u64(), ...detailFields }, (ctx, args) => {
  user(ctx);
  if (args.organizationId && !role(ctx, args.organizationId, ctx.sender)) denied();
  const { name: title, organizationId, ...details } = args;
  validateDetails(details);
  ctx.db.workspaceProject.insert({ id: 0n, name: name(title), organizationId, createdBy: ctx.sender,
    outputStack: '', ownership: 'personal', ...details, revision: 0n });
});
export const updateProjectDetails = db.reducer({ projectId: t.u64(), expectedRevision: t.u64(), ...detailFields }, (ctx, args) => {
  user(ctx);
  const row = ctx.db.workspaceProject.id.find(args.projectId);
  if (!row || permission(ctx, row, ctx.sender) !== 'editor') denied();
  if (row.revision !== args.expectedRevision) throw new SenderError('Project details changed. Reload the latest details.');
  const { projectId, expectedRevision, ...details } = args;
  validateDetails(details);
  ctx.db.workspaceProject.id.update({ ...row, ...details, outputStack: '', revision: expectedRevision + 1n });
});
export const setProjectOrganization = db.reducer({ projectId: t.u64(), organizationId: t.u64() }, (ctx, args) => {
  user(ctx);
  const row = ctx.db.workspaceProject.id.find(args.projectId);
  if (!row || row.ownership !== 'personal' || !row.createdBy.isEqual(ctx.sender)) denied();
  if (args.organizationId && !role(ctx, args.organizationId, ctx.sender)) denied();
  if (row.organizationId === args.organizationId) return;
  clearProjectSharing(ctx, row);
  ctx.db.workspaceProject.id.update({ ...row, organizationId: args.organizationId });
});
export const renameProject = db.reducer({ projectId: t.u64(), name: t.string() }, (ctx, args) => {
  user(ctx);
  const row = ctx.db.workspaceProject.id.find(args.projectId);
  if (!row || permission(ctx, row, ctx.sender) !== 'editor') denied();
  ctx.db.workspaceProject.id.update({ ...row, name: name(args.name) });
});
export const saveGuidance = db.reducer({
  projectId: t.u64(), expectedRevision: t.u64(), audience: t.string(), technical: t.string(),
  style: t.string(), colors: t.string(), typography: t.string(), spacing: t.string(), accessibility: t.string(), guidance: t.string(),
}, (ctx, args) => {
  user(ctx);
  const target = ctx.db.workspaceProject.id.find(args.projectId);
  if (!target || permission(ctx, target, ctx.sender) !== 'editor') throw new SenderError('Project edit access is required.');
  const current = ctx.db.projectGuidance.projectId.find(args.projectId);
  if ((current?.revision ?? 0n) !== args.expectedRevision) throw new SenderError('Guidance changed. Review the latest saved version.');
  const { expectedRevision, ...values } = args;
  for (const value of [values.audience, values.technical, values.style, values.colors, values.typography, values.spacing, values.accessibility, values.guidance]) {
    if (value.length > 4000 || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value)) throw new SenderError('Each guidance answer must be at most 4000 characters without control characters.');
  }
  const row = { ...values, revision: expectedRevision + 1n };
  if (current) ctx.db.projectGuidance.projectId.update(row);
  else ctx.db.projectGuidance.insert(row);
});
export const visibleGuidance = db.view({ name: 'visible_guidance', public: true }, t.array(projectGuidance.rowType), ctx =>
  accessibleProjects(ctx).flatMap(target => {
    const row = ctx.db.projectGuidance.projectId.find(target.id);
    return row ? [row] : [];
  }));
export const inviteMember = db.reducer({ organizationId: t.u64(), email: t.string(), role: t.string(), projectRole: t.string(), projectId: t.u64().optional() }, (ctx, args) => {
  const callerRole = manager(ctx, args.organizationId);
  if (!['member', 'admin'].includes(args.role) || (args.role === 'admin' && callerRole !== 'owner')) denied();
  if (!['', 'viewer', 'editor'].includes(args.projectRole)) denied();
  const targetEmail = email(args.email);
  const targetProject = args.projectId ? ctx.db.workspaceProject.id.find(args.projectId) : undefined;
  if (args.projectRole && (!targetProject || targetProject.organizationId !== args.organizationId || !canManageProject(ctx, targetProject, ctx.sender))) throw new SenderError('Choose a project you manage in this organization.');
  if ([...ctx.db.invitation.organizationId.filter(args.organizationId)].some(row => row.email === targetEmail && row.expiresAt.microsSinceUnixEpoch > ctx.timestamp.microsSinceUnixEpoch)) {
    throw new SenderError('An active invitation already exists for this email.');
  }
  ctx.db.invitation.insert({ id: 0n, organizationId: args.organizationId, email: targetEmail, role: args.role,
    projectId: targetProject?.id ?? 0n, projectRole: args.projectRole,
    expiresAt: new Timestamp(ctx.timestamp.microsSinceUnixEpoch + 7n * 24n * 60n * 60n * 1000000n) });
});
export const acceptInvitation = db.reducer({ invitationId: t.u64() }, (ctx, args) => {
  const profile = user(ctx);
  const row = ctx.db.invitation.id.find(args.invitationId);
  if (!row || row.email !== profile.email || row.expiresAt.microsSinceUnixEpoch <= ctx.timestamp.microsSinceUnixEpoch) denied();
  const memberKey = key(row.organizationId, ctx.sender);
  if (ctx.db.membership.key.find(memberKey)) throw new SenderError('You are already a member.');
  ctx.db.membership.insert({ key: memberKey, organizationId: row.organizationId, user: ctx.sender, role: row.role });
  if (row.projectRole) {
    const target = ctx.db.workspaceProject.id.find(row.projectId);
    if (!target || target.organizationId !== row.organizationId) denied();
    ctx.db.projectAccess.insert({ key: key(target.id, ctx.sender), projectId: target.id, user: ctx.sender, role: row.projectRole });
  }
  ctx.db.invitation.id.delete(row.id);
});
export const revokeInvitation = db.reducer({ invitationId: t.u64() }, (ctx, args) => {
  const row = ctx.db.invitation.id.find(args.invitationId);
  if (!row) denied();
  const callerRole = manager(ctx, row.organizationId);
  if (row.role === 'admin' && callerRole !== 'owner') denied();
  ctx.db.invitation.id.delete(row.id);
});
export const setProjectAccess = db.reducer({ projectId: t.u64(), member: t.identity(), role: t.string() }, (ctx, args) => {
  const row = ctx.db.workspaceProject.id.find(args.projectId);
  if (!row) denied();
  user(ctx);
  if (!canManageProject(ctx, row, ctx.sender) || !row.organizationId || !role(ctx, row.organizationId, ctx.sender) ||
      !role(ctx, row.organizationId, args.member) || !['', 'viewer', 'editor'].includes(args.role)) denied();
  if (projectOwner(ctx, row)?.isEqual(args.member)) throw new SenderError('Project owner access cannot be changed.');
  const grantKey = key(row.id, args.member);
  const grant = ctx.db.projectAccess.key.find(grantKey);
  if (!args.role) { if (grant) ctx.db.projectAccess.key.delete(grantKey); }
  else if (grant) ctx.db.projectAccess.key.update({ ...grant, role: args.role });
  else ctx.db.projectAccess.insert({ key: grantKey, projectId: row.id, user: args.member, role: args.role });
});
export const setMemberRole = db.reducer({ organizationId: t.u64(), member: t.identity(), role: t.string() }, (ctx, args) => {
  if (manager(ctx, args.organizationId) !== 'owner' || !['admin', 'member'].includes(args.role)) denied();
  const row = ctx.db.membership.key.find(key(args.organizationId, args.member));
  if (!row || row.role === 'owner') denied();
  ctx.db.membership.key.update({ ...row, role: args.role });
});
export const removeMember = db.reducer({ organizationId: t.u64(), member: t.identity() }, (ctx, args) => {
  const callerRole = manager(ctx, args.organizationId);
  const memberKey = key(args.organizationId, args.member);
  const row = ctx.db.membership.key.find(memberKey);
  if (!row || row.role === 'owner' || (row.role === 'admin' && callerRole !== 'owner')) denied();
  removeMembership(ctx, args.organizationId, args.member);
});
function clearProjectSharing(ctx: Ctx, target: ProjectRow) {
  for (const grant of ctx.db.projectAccess.projectId.filter(target.id)) ctx.db.projectAccess.key.delete(grant.key);
  for (const invite of ctx.db.invitation.organizationId.filter(target.organizationId)) {
    if (invite.projectId === target.id) ctx.db.invitation.id.update({ ...invite, projectId: 0n, projectRole: '' });
  }
}
function removeMembership(ctx: Ctx, org: bigint, member: Identity) {
  for (const target of ctx.db.workspaceProject.organizationId.filter(org)) {
    ctx.db.projectAccess.key.delete(key(target.id, member));
    if (target.ownership === 'personal' && target.createdBy.isEqual(member)) {
      clearProjectSharing(ctx, target);
      ctx.db.workspaceProject.id.update({ ...target, organizationId: 0n });
    }
  }
  const departingEmail = ctx.db.userProfile.identity.find(member)?.email;
  for (const invite of ctx.db.invitation.organizationId.filter(org)) {
    if (invite.email === departingEmail) ctx.db.invitation.id.delete(invite.id);
  }
  ctx.db.membership.key.delete(key(org, member));
}
export const leaveOrganization = db.reducer({ organizationId: t.u64() }, (ctx, args) => {
  user(ctx);
  const current = role(ctx, args.organizationId, ctx.sender);
  if (!current || current === 'owner') throw new SenderError('Organization owners cannot leave their organization.');
  removeMembership(ctx, args.organizationId, ctx.sender);
});
// The old token must authorize the handoff; email/name alone can never claim old data.
export const prepareLegacyTransfer = db.reducer({ destination: t.identity() }, (ctx, args) => {
  const old = ctx.db.project.owner.find(ctx.sender);
  if (!old) denied();
  const existing = ctx.db.legacyTransfer.legacyId.find(old.id);
  if (existing?.claimed) denied();
  const row = { legacyId: old.id, destination: args.destination, claimed: false,
    expiresAt: new Timestamp(ctx.timestamp.microsSinceUnixEpoch + 10n * 60n * 1000000n) };
  if (existing) ctx.db.legacyTransfer.legacyId.update(row);
  else ctx.db.legacyTransfer.insert(row);
});
export const importLegacyProject = db.reducer({ organizationId: t.u64(), legacyId: t.u64() }, (ctx, args) => {
  user(ctx);
  if (args.organizationId && !role(ctx, args.organizationId, ctx.sender)) denied();
  const handoff = ctx.db.legacyTransfer.legacyId.find(args.legacyId);
  const old = ctx.db.project.id.find(args.legacyId);
  if (!handoff || handoff.claimed || !handoff.destination.isEqual(ctx.sender) || !old ||
      handoff.expiresAt.microsSinceUnixEpoch <= ctx.timestamp.microsSinceUnixEpoch) denied();
  ctx.db.workspaceProject.insert({ id: 0n, organizationId: args.organizationId, name: old.name, outputStack: old.outputStack, createdBy: ctx.sender, ownership: 'personal', ...presetDetails(old.outputStack), revision: 0n });
  ctx.db.legacyTransfer.legacyId.update({ ...handoff, claimed: true });
});
export const myProject = db.view({ name: 'my_project', public: true }, t.option(project.rowType), ctx => {
  const old = ctx.db.project.owner.find(ctx.sender);
  return old && !ctx.db.legacyTransfer.legacyId.find(old.id)?.claimed ? old : undefined;
});
export const myProfile = db.view({ name: 'my_profile', public: true }, t.option(userProfile.rowType), ctx => ctx.db.userProfile.identity.find(ctx.sender) ?? undefined);
const orgSummary = t.object('OrganizationSummary', { id: t.u64(), name: t.string(), role: t.string() });
export const myOrganizations = db.view({ name: 'my_organizations', public: true }, t.array(orgSummary), ctx =>
  [...ctx.db.membership.user.filter(ctx.sender)].flatMap(member => {
    const org = ctx.db.organization.id.find(member.organizationId);
    return org ? [{ id: org.id, name: org.name, role: member.role }] : [];
  }));
const projectSummary = t.object('ProjectSummary', { id: t.u64(), organizationId: t.u64(), name: t.string(), outputStack: t.string(), permission: t.string(), owner: t.identity(), canManage: t.bool(), ownership: t.string(), ...detailFields, revision: t.u64() });
export const visibleProjects = db.view({ name: 'visible_projects', public: true }, t.array(projectSummary), ctx =>
  accessibleProjects(ctx).map(row => ({ ...row,
    ...(row.framework || !row.outputStack ? {} : presetDetails(row.outputStack)),
    owner: projectOwner(ctx, row)!, canManage: canManageProject(ctx, row, ctx.sender), permission: permission(ctx, row, ctx.sender) })));
const shareSummary = t.object('ProjectShareSummary', { key: t.string(), projectId: t.u64(), user: t.identity(), role: t.string() });
export const managedProjectShares = db.view({ name: 'managed_project_shares', public: true }, t.array(shareSummary), ctx =>
  accessibleProjects(ctx).filter(row => canManageProject(ctx, row, ctx.sender)).flatMap(row => [...ctx.db.projectAccess.projectId.filter(row.id)]));
const memberSummary = t.object('MemberSummary', {
  key: t.string(), organizationId: t.u64(), user: t.identity(), name: t.string(), email: t.string(), role: t.string(), projectRole: t.string(),
});
export const organizationMembers = db.view({ name: 'organization_members', public: true }, t.array(memberSummary), ctx =>
  [...ctx.db.membership.user.filter(ctx.sender)].flatMap(mine => {
    const admin = mine.role === 'owner' || mine.role === 'admin';

    return [...ctx.db.membership.organizationId.filter(mine.organizationId)].map(member => {
      const profile = ctx.db.userProfile.identity.find(member.user);
      return { ...member, name: profile?.name ?? 'Member', email: admin || member.user.isEqual(ctx.sender) ? profile?.email ?? '' : '',
        projectRole: '' };
    });
  }));
const invitationSummary = t.object('InvitationSummary', {
  id: t.u64(), organizationId: t.u64(), organizationName: t.string(), email: t.string(), role: t.string(), projectRole: t.string(), expiresAt: t.timestamp(),
});
export const myInvitations = db.view({ name: 'my_invitations', public: true }, t.array(invitationSummary), ctx => {
  const profile = ctx.db.userProfile.identity.find(ctx.sender);
  if (!profile) return [];
  const rows = new Map<bigint, { id: bigint; organizationId: bigint; organizationName: string; email: string; role: string; projectRole: string; expiresAt: Timestamp }>();
  const add = (row: { id: bigint; organizationId: bigint; email: string; role: string; projectRole: string; expiresAt: Timestamp }) => {
    rows.set(row.id, { ...row, organizationName: ctx.db.organization.id.find(row.organizationId)?.name ?? 'Organization' });
  };
  for (const row of ctx.db.invitation.email.filter(profile.email)) add(row);
  for (const member of ctx.db.membership.user.filter(ctx.sender)) {
    if (member.role === 'owner' || member.role === 'admin') for (const row of ctx.db.invitation.organizationId.filter(member.organizationId)) add(row);
  }
  return [...rows.values()];
});
