import { selectStackAdapter } from '../../shared/stackAdapters';
import { isChatMode, runComponentChat, GEMINI_MODEL } from '../../shared/componentChat';
import { validateDraftFiles } from '../../shared/draftFiles';
import { detectEditorInstructions, type EditorInstruction } from '../../shared/editorInstructions';
import { previewKind, previewMessages, previewUrl, withPreviewEntry, startSandboxBuild, PREVIEW_IDLE_SECONDS } from '../../shared/sandboxPreview';
import { NVIDIA_MODEL } from '../../shared/nvidiaDraft';
import { generationStages, MAX_GENERATION_HISTORY, mockArtifacts } from '../../shared/generationWorkflow';
import { MAX_PROJECT_REFERENCES, validateReferenceFile, validatePdfReference } from '../../shared/referenceFiles';
import { parseQuestionnaire, hasAnswers, questionnaireGuidance } from '../../shared/questionnaire';
import { starterComponents, starterRequest } from '../../shared/starterComponents';
import { schema, table, t, SenderError, type InferSchema, type ReducerCtx, type ViewCtx, type ProcedureCtx } from 'spacetimedb/server';
import { Identity, Timestamp, TimeDuration, ScheduleAt } from 'spacetimedb';

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
  // 'setup' (wizard), 'generating' (starter components queued) or 'ready'.
  setupState: t.string().default('ready'),
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
  questionnaire: t.string().default(''),
});
const projectReference = table({ name: 'project_reference' }, {
  id: t.u64().primaryKey().autoInc(), projectId: t.u64().index('btree'), filename: t.string(), purpose: t.string(),
  bytes: t.array(t.u8()), content: t.string(), uploadedBy: t.identity(), createdAt: t.timestamp(),
});
const generationJob = table({ name: 'generation_job' }, {
  id: t.u64().primaryKey().autoInc(), requestId: t.string().unique(), projectId: t.u64().index('btree'),
  requestedBy: t.identity(), request: t.string(), state: t.string(), mode: t.string(), scenario: t.string(),
  snapshot: t.string(), fingerprint: t.string(), artifacts: t.string(), diagnostic: t.string(), createdAt: t.timestamp(), model: t.string().default(''), componentId: t.u64().default(0n),
});
const draftFile = t.object('DraftFile', { path: t.string(), content: t.string() });
// Editable checkpoints are separate from immutable provider responses.
const componentDraft = table({ name: 'component_draft' }, {
  jobId: t.u64().primaryKey(), projectId: t.u64().index('btree'), revision: t.u64(),
  files: t.array(draftFile), updatedBy: t.identity(), updatedAt: t.timestamp(), componentId: t.u64().default(0n),
});
const generationDeadline = table({ name: 'generation_deadline' }, { scheduledId: t.u64().primaryKey().autoInc(), scheduledAt: t.scheduleAt(), jobId: t.u64() });
const modelUsage = table({ name: 'model_usage' }, { identity: t.identity().primaryKey(), windowStart: t.timestamp(), requests: t.u32() });
const component = table({ name: 'component' }, {
  id: t.u64().primaryKey().autoInc(), projectId: t.u64().index('btree'), name: t.string(), category: t.string().index('btree'), rootPath: t.string(), createdAt: t.timestamp(),
});
const componentChatMessage = table({ name: 'component_chat_message' }, {
  id: t.u64().primaryKey().autoInc(), componentId: t.u64().index('btree'), projectId: t.u64().index('btree'), senderIdentity: t.identity(), role: t.string(), content: t.string(), jobId: t.option(t.u64()), createdAt: t.timestamp(),
});
// Private sandbox leases: write keys never leave this table; only the capability URL is shown.
const componentPreview = table({ name: 'component_preview' }, {
  jobId: t.u64().primaryKey(), projectId: t.u64().index('btree'), componentId: t.u64(), sandboxId: t.string(), host: t.string(),
  writeKey: t.string(), capability: t.string(), revision: t.u64(), expiresAt: t.timestamp(), updatedAt: t.timestamp(),
});
// One row per starter component; a scheduled procedure works through pending rows one at a time
// on behalf of requestedBy, whose project edit access is rechecked before every provider call.
const starterTask = table({ name: 'starter_task' }, {
  id: t.u64().primaryKey().autoInc(), projectId: t.u64().index('btree'), componentId: t.u64(), starterId: t.string(), position: t.u32(),
  state: t.string(), jobId: t.u64(), message: t.string(), requestedBy: t.identity(), updatedAt: t.timestamp(),
});
const starterTick = table({ name: 'starter_tick' }, { scheduledId: t.u64().primaryKey().autoInc(), scheduledAt: t.scheduleAt(), projectId: t.u64() });
const editorInstruction = table({ name: 'editor_instruction' }, {
  id: t.u64().primaryKey().autoInc(), key: t.string().unique(), projectId: t.u64().index('btree'), componentId: t.u64(),
  sourceJobId: t.u64(), revision: t.u64(), path: t.string(), text: t.string(), line: t.u32(),
  state: t.string(), jobId: t.u64(), updatedBy: t.identity(), updatedAt: t.timestamp(),
});
const db = schema({ editorInstruction, starterTask, starterTick, componentPreview, component, componentChatMessage, project, userProfile, organization, membership, workspaceProject, projectAccess, invitation, legacyTransfer, projectGuidance, projectReference, generationJob, componentDraft, modelUsage, generationDeadline }, {
  env: { AUTH_ISSUER: t.string().optional(), AUTH_CLIENT_ID: t.string().optional(), GENERATION_MODE: t.string().optional(), NVIDIA_ENABLED: t.string().optional(), NVIDIA_API_KEY: t.string().optional(), NVIDIA_MODEL: t.string().optional(), GEMINI_API_KEY: t.string().optional(), GEMINI_MODEL: t.string().optional(), E2B_API_KEY: t.string().optional(), E2B_REACT_TEMPLATE: t.string().optional(), E2B_BLAZOR_TEMPLATE: t.string().optional(), PREVIEW_APP_ORIGIN: t.string().optional() },
});
export default db;
type Ctx = ReducerCtx<InferSchema<typeof db>>;
type ReadCtx = ViewCtx<InferSchema<typeof db>>;
type ProcCtx = ProcedureCtx<InferSchema<typeof db>>;
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
  for (const target of accessibleProjects(ctx)) expireStaleGenerations(ctx, target.id);
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
export const renameOrganization = db.reducer({ organizationId: t.u64(), name: t.string() }, (ctx, args) => {
  manager(ctx, args.organizationId);
  const row = ctx.db.organization.id.find(args.organizationId);
  if (!row) denied();
  ctx.db.organization.id.update({ ...row, name: name(args.name) });
});
// Compatibility entry for older preset clients. New UI uses open-ended createProjectWithDetails.
export const createProject = db.reducer({ organizationId: t.u64(), name: t.string(), outputStack: t.string() }, (ctx, args) => {
  manager(ctx, args.organizationId);
  validateStack(args.outputStack);
  ctx.db.workspaceProject.insert({ id: 0n, organizationId: args.organizationId, name: name(args.name), outputStack: args.outputStack, createdBy: ctx.sender, ownership: 'personal', ...presetDetails(args.outputStack), revision: 0n, setupState: 'ready' });
});
export const createProjectWithDetails = db.reducer({ name: t.string(), organizationId: t.u64(), ...detailFields }, (ctx, args) => {
  user(ctx);
  if (args.organizationId && !role(ctx, args.organizationId, ctx.sender)) denied();
  const { name: title, organizationId, ...details } = args;
  validateDetails(details);
  ctx.db.workspaceProject.insert({ id: 0n, name: name(title), organizationId, createdBy: ctx.sender,
    outputStack: '', ownership: 'personal', ...details, revision: 0n, setupState: 'ready' });
});
// The UI creates projects through the setup wizard; the direct API above stays ready immediately.
export const createSetupProject = db.reducer({ name: t.string(), organizationId: t.u64(), ...detailFields }, (ctx, args) => {
  user(ctx);
  if (args.organizationId && !role(ctx, args.organizationId, ctx.sender)) denied();
  const { name: title, organizationId, ...details } = args;
  validateDetails(details);
  ctx.db.workspaceProject.insert({ id: 0n, name: name(title), organizationId, createdBy: ctx.sender,
    outputStack: '', ownership: 'personal', ...details, revision: 0n, setupState: 'setup' });
});
function editableProject(ctx: Ctx, projectId: bigint) {
  user(ctx);
  const target = ctx.db.workspaceProject.id.find(projectId);
  if (!target || permission(ctx, target, ctx.sender) !== 'editor') throw new SenderError('Project edit access is required.');
  return target;
}
/** Setup requires either questionnaire answers or at least one uploaded reference. */
function requireSetupInput(ctx: Ctx, projectId: bigint) {
  const saved = ctx.db.projectGuidance.projectId.find(projectId)?.questionnaire ?? '';
  let answered = false;
  try { answered = hasAnswers(parseQuestionnaire(saved)); } catch { answered = false; }
  if (!answered && ![...ctx.db.projectReference.projectId.filter(projectId)].length) throw new SenderError('Answer the questionnaire or upload at least one document before continuing.');
}
export const saveQuestionnaire = db.reducer({ projectId: t.u64(), expectedRevision: t.u64(), answers: t.string() }, (ctx, args) => {
  const target = editableProject(ctx, args.projectId);
  let answers;
  try { answers = parseQuestionnaire(args.answers); } catch (cause) { throw new SenderError(cause instanceof Error ? cause.message : 'Invalid questionnaire.'); }
  const current = ctx.db.projectGuidance.projectId.find(target.id);
  if ((current?.revision ?? 0n) !== args.expectedRevision) throw new SenderError('Guidance changed. Review the latest saved version.');
  // Generation reads the guidance text fields; technical notes and free-form guidance are left untouched.
  const row = { projectId: target.id, technical: current?.technical ?? '', guidance: current?.guidance ?? '',
    ...questionnaireGuidance(answers), questionnaire: JSON.stringify(answers), revision: args.expectedRevision + 1n };
  if (current) ctx.db.projectGuidance.projectId.update(row); else ctx.db.projectGuidance.insert(row);
});
export const finishProjectSetup = db.reducer({ projectId: t.u64() }, (ctx, args) => {
  const target = editableProject(ctx, args.projectId);
  if (target.setupState !== 'setup') return;
  requireSetupInput(ctx, target.id);
  ctx.db.workspaceProject.id.update({ ...target, setupState: 'ready' });
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
  const row = { ...values, questionnaire: current?.questionnaire ?? '', revision: expectedRevision + 1n };
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
  const targetProject = args.projectRole && args.projectId ? ctx.db.workspaceProject.id.find(args.projectId) : undefined;
  if (args.projectRole && (!targetProject || targetProject.organizationId !== args.organizationId || !canManageProject(ctx, targetProject, ctx.sender))) throw new SenderError('Choose a project you manage in this organization.');
  if ([...ctx.db.invitation.organizationId.filter(args.organizationId)].some(row => row.email === targetEmail && row.expiresAt.microsSinceUnixEpoch > ctx.timestamp.microsSinceUnixEpoch)) {
    throw new SenderError('An active invitation already exists for this email.');
  }
  ctx.db.invitation.insert({ id: 0n, organizationId: args.organizationId, email: targetEmail, role: args.role,
    projectId: targetProject?.id ?? 0n, projectRole: args.projectRole,
    expiresAt: new Timestamp(ctx.timestamp.microsSinceUnixEpoch + 7n * 24n * 60n * 60n * 1000000n) });
});
export const inviteProject = db.reducer({ projectId: t.u64(), email: t.string(), projectRole: t.string() }, (ctx, args) => {
  user(ctx);
  const target = ctx.db.workspaceProject.id.find(args.projectId);
  if (!target || !canManageProject(ctx, target, ctx.sender) || !['viewer', 'editor'].includes(args.projectRole)) denied();
  const targetEmail = email(args.email);
  if ([...ctx.db.invitation.iter()].some(row => row.projectId === target.id && row.organizationId === 0n &&
    row.email === targetEmail && row.expiresAt.microsSinceUnixEpoch > ctx.timestamp.microsSinceUnixEpoch)) {
    throw new SenderError('An active project invitation already exists for this email.');
  }
  ctx.db.invitation.insert({ id: 0n, organizationId: 0n, email: targetEmail, role: '', projectId: target.id, projectRole: args.projectRole,
    expiresAt: new Timestamp(ctx.timestamp.microsSinceUnixEpoch + 7n * 24n * 60n * 60n * 1000000n) });
});
export const acceptInvitation = db.reducer({ invitationId: t.u64() }, (ctx, args) => {
  const profile = user(ctx);
  const row = ctx.db.invitation.id.find(args.invitationId);
  if (!row || row.email !== profile.email || row.expiresAt.microsSinceUnixEpoch <= ctx.timestamp.microsSinceUnixEpoch) denied();
  if (!row.organizationId) {
    const target = ctx.db.workspaceProject.id.find(row.projectId);
    if (!target || !['viewer', 'editor'].includes(row.projectRole)) denied();
    const grantKey = key(target.id, ctx.sender);
    const grant = ctx.db.projectAccess.key.find(grantKey);
    if (grant) throw new SenderError('You already have access to this project.');
    ctx.db.projectAccess.insert({ key: grantKey, projectId: target.id, user: ctx.sender, role: row.projectRole });
    ctx.db.invitation.id.delete(row.id);
    return;
  }
  const memberKey = key(row.organizationId, ctx.sender);
  if (ctx.db.membership.key.find(memberKey)) throw new SenderError('You are already a member.');
  ctx.db.membership.insert({ key: memberKey, organizationId: row.organizationId, user: ctx.sender, role: row.role });
  if (row.projectRole) {
    const target = ctx.db.workspaceProject.id.find(row.projectId);
    if (!target || target.organizationId !== row.organizationId) denied();
    const grantKey = key(target.id, ctx.sender);
    const grant = ctx.db.projectAccess.key.find(grantKey);
    if (grant) ctx.db.projectAccess.key.update({ ...grant, role: row.projectRole });
    else ctx.db.projectAccess.insert({ key: grantKey, projectId: target.id, user: ctx.sender, role: row.projectRole });
  }
  ctx.db.invitation.id.delete(row.id);
});
export const revokeInvitation = db.reducer({ invitationId: t.u64() }, (ctx, args) => {
  const row = ctx.db.invitation.id.find(args.invitationId);
  if (!row) denied();
  if (!row.organizationId) {
    const target = ctx.db.workspaceProject.id.find(row.projectId);
    user(ctx);
    if (!target || !canManageProject(ctx, target, ctx.sender)) denied();
    ctx.db.invitation.id.delete(row.id);
    return;
  }
  const callerRole = manager(ctx, row.organizationId);
  if (row.role === 'admin' && callerRole !== 'owner') denied();
  ctx.db.invitation.id.delete(row.id);
});
export const setProjectAccess = db.reducer({ projectId: t.u64(), member: t.identity(), role: t.string() }, (ctx, args) => {
  const row = ctx.db.workspaceProject.id.find(args.projectId);
  if (!row) denied();
  user(ctx);
  if (!canManageProject(ctx, row, ctx.sender) || !['', 'viewer', 'editor'].includes(args.role)) denied();
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
  for (const invite of ctx.db.invitation.iter()) {
    if (invite.projectId !== target.id) continue;
    if (target.organizationId && invite.organizationId === target.organizationId) {
      ctx.db.invitation.id.update({ ...invite, projectId: 0n, projectRole: '' });
    } else {
      ctx.db.invitation.id.delete(invite.id);
    }
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
  ctx.db.workspaceProject.insert({ id: 0n, organizationId: args.organizationId, name: old.name, outputStack: old.outputStack, createdBy: ctx.sender, ownership: 'personal', ...presetDetails(old.outputStack), revision: 0n, setupState: 'ready' });
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
const projectSummary = t.object('ProjectSummary', { id: t.u64(), organizationId: t.u64(), name: t.string(), outputStack: t.string(), permission: t.string(), owner: t.identity(), canManage: t.bool(), ownership: t.string(), ...detailFields, revision: t.u64(), setupState: t.string() });
export const visibleProjects = db.view({ name: 'visible_projects', public: true }, t.array(projectSummary), ctx =>
  accessibleProjects(ctx).map(row => ({ ...row,
    ...(row.framework || !row.outputStack ? {} : presetDetails(row.outputStack)),
    owner: projectOwner(ctx, row)!, canManage: canManageProject(ctx, row, ctx.sender), permission: permission(ctx, row, ctx.sender) })));
const shareSummary = t.object('ProjectShareSummary', { key: t.string(), projectId: t.u64(), user: t.identity(), role: t.string(), name: t.string(), email: t.string() });
export const managedProjectShares = db.view({ name: 'managed_project_shares', public: true }, t.array(shareSummary), ctx =>
  accessibleProjects(ctx).filter(row => canManageProject(ctx, row, ctx.sender)).flatMap(row =>
    [...ctx.db.projectAccess.projectId.filter(row.id)].map(grant => {
      const profile = ctx.db.userProfile.identity.find(grant.user);
      return { ...grant, name: profile?.name ?? 'Project collaborator', email: profile?.email ?? '' };
    })));
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
  id: t.u64(), organizationId: t.u64(), projectId: t.u64(), organizationName: t.string(), projectName: t.string(), email: t.string(), role: t.string(), projectRole: t.string(), expiresAt: t.timestamp(),
});
export const myInvitations = db.view({ name: 'my_invitations', public: true }, t.array(invitationSummary), ctx => {
  const profile = ctx.db.userProfile.identity.find(ctx.sender);
  if (!profile) return [];
  const rows = new Map<bigint, { id: bigint; organizationId: bigint; projectId: bigint; organizationName: string; projectName: string; email: string; role: string; projectRole: string; expiresAt: Timestamp }>();
  const add = (row: { id: bigint; organizationId: bigint; projectId: bigint; email: string; role: string; projectRole: string; expiresAt: Timestamp }) => {
    rows.set(row.id, { ...row, organizationName: row.organizationId ? ctx.db.organization.id.find(row.organizationId)?.name ?? 'Organization' : '',
      projectName: row.projectId ? ctx.db.workspaceProject.id.find(row.projectId)?.name ?? 'Project' : '' });
  };
  for (const row of ctx.db.invitation.email.filter(profile.email)) add(row);
  for (const member of ctx.db.membership.user.filter(ctx.sender)) {
    if (member.role === 'owner' || member.role === 'admin') for (const row of ctx.db.invitation.organizationId.filter(member.organizationId)) add(row);
  }
  for (const target of accessibleProjects(ctx).filter(row => canManageProject(ctx, row, ctx.sender))) {
    for (const row of ctx.db.invitation.iter()) if (row.projectId === target.id && !row.organizationId) add(row);
  }
  return [...rows.values()];
});

export const uploadReference = db.reducer({ projectId: t.u64(), filename: t.string(), purpose: t.string(), bytes: t.array(t.u8()) }, (ctx, args) => {
  user(ctx);
  const target = ctx.db.workspaceProject.id.find(args.projectId);
  if (!target || permission(ctx, target, ctx.sender) !== 'editor') throw new SenderError('Project edit access is required.');
  let content: string;
  try { content = validateReferenceFile(args.filename, new Uint8Array(args.bytes), args.purpose); }
  catch (cause) { throw new SenderError(cause instanceof Error ? cause.message : 'Invalid reference file.'); }
  insertReference(ctx, target.id, args.filename, args.purpose, args.bytes, content);
});
function insertReference(ctx: Ctx, projectId: bigint, filename: string, purpose: string, bytes: number[], content: string) {
  const existing = [...ctx.db.projectReference.projectId.filter(projectId)];
  if (existing.length >= MAX_PROJECT_REFERENCES) throw new SenderError('This project already has 20 references.');
  if (existing.some(row => row.filename.toLowerCase() === filename.toLowerCase())) throw new SenderError('A reference with this filename already exists. Remove it first or use a different filename.');
  ctx.db.projectReference.insert({ id: 0n, projectId, filename, purpose, bytes, content, uploadedBy: ctx.sender, createdAt: ctx.timestamp });
}
// The browser extracts PDF text; it is stored as untrusted context next to the original bytes.
export const uploadPdfReference = db.reducer({ projectId: t.u64(), filename: t.string(), purpose: t.string(), bytes: t.array(t.u8()), text: t.string() }, (ctx, args) => {
  const target = editableProject(ctx, args.projectId);
  let content: string;
  try { content = validatePdfReference(args.filename, new Uint8Array(args.bytes), args.text, args.purpose); }
  catch (cause) { throw new SenderError(cause instanceof Error ? cause.message : 'Invalid PDF reference.'); }
  insertReference(ctx, target.id, args.filename, args.purpose, args.bytes, content);
});
export const removeReference = db.reducer({ referenceId: t.u64() }, (ctx, args) => {
  user(ctx);
  const row = ctx.db.projectReference.id.find(args.referenceId);
  const target = row ? ctx.db.workspaceProject.id.find(row.projectId) : undefined;
  if (!row || !target || permission(ctx, target, ctx.sender) !== 'editor') throw new SenderError('Reference not found or access denied.');
  ctx.db.projectReference.id.delete(row.id);
});
export const visibleReferences = db.view({ name: 'visible_references', public: true }, t.array(projectReference.rowType), ctx =>
  accessibleProjects(ctx).flatMap(target => [...ctx.db.projectReference.projectId.filter(target.id)]));

function generationFingerprint(ctx: Ctx | ReadCtx, projectId: bigint) {
  const target = ctx.db.workspaceProject.id.find(projectId)!;
  const guidance = ctx.db.projectGuidance.projectId.find(projectId);
  const refs = [...ctx.db.projectReference.projectId.filter(projectId)].map(row => row.id.toString()).sort();
  return JSON.stringify([target.name, target.revision.toString(), guidance?.revision.toString() ?? '0', refs]);
}
type GenerationArgs = { projectId: bigint; requestId: string; request: string; scenario: string; sourceJobId?: bigint; expectedDraftRevision?: bigint; componentId?: bigint; editorInstruction?: { id: string; path: string; text: string; line: number } };
/** `delegate` is set only by the starter scheduler: the job runs as that user, whose access is rechecked here. */
function queueGeneration(ctx: Ctx, args: GenerationArgs, mode = 'mock', secret = '', model = '', delegate?: Identity) {
  if (!delegate) user(ctx);
  const actor = delegate ?? ctx.sender;
  const project = ctx.db.workspaceProject.id.find(args.projectId);
  if (!project || permission(ctx, project, actor) !== 'editor') throw new SenderError('Project edit access is required.');
  if (mode === 'mock' ? ctx.env.GENERATION_MODE !== 'mock' : ctx.env.NVIDIA_ENABLED !== 'true') throw new SenderError('Generation providers are not configured.');
  if (!/^[a-zA-Z0-9-]{16,80}$/.test(args.requestId) || !args.request.trim() || args.request.length > 4000 || !['success', 'generation_failure', 'build_failure'].includes(args.scenario)) throw new SenderError('Provide a valid generation request and mock scenario.');
  const selectedComponent = args.componentId ? ctx.db.component.id.find(args.componentId) : undefined;
  if (args.componentId && (!selectedComponent || selectedComponent.projectId !== project.id)) denied();
  const replay = ctx.db.generationJob.requestId.find(args.requestId);
  if (replay) {
    if (replay.componentId !== (args.componentId ?? 0n) || replay.projectId !== args.projectId || !replay.requestedBy.isEqual(actor) || replay.request !== args.request.trim() || replay.scenario !== args.scenario || replay.mode !== mode || replay.model !== model || (JSON.parse(replay.snapshot).requestedSourceJobId ?? '') !== (args.sourceJobId?.toString() ?? '')) denied();
    return replay;
  }
  expireStaleGenerations(ctx, project.id);
  const history = [...ctx.db.generationJob.projectId.filter(project.id)];
  if (history.some(row => !['preview_ready', 'draft_ready', 'failed', 'cancelled'].includes(row.state))) throw new SenderError('This project already has an active generation job.');
  // Mock artifact history is bounded; saved real chat is not a lifetime quota.
  if (mode === 'mock' && history.filter(row => row.mode === 'mock').length >= MAX_GENERATION_HISTORY) throw new SenderError('Generation history limit reached for this prototype.');
  const references = [...ctx.db.projectReference.projectId.filter(project.id)]
    .sort((a, b) => a.filename.localeCompare(b.filename) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
    .map(row => ({ id: row.id.toString(), filename: row.filename, purpose: row.purpose, content: row.content }));
  const scopedHistory = history.filter(row => row.componentId === (args.componentId ?? 0n));
  const conversation = selectedComponent ? [...ctx.db.componentChatMessage.componentId.filter(selectedComponent.id)].sort((a,b) => a.id < b.id ? -1 : 1).slice(-6).map(row => ({ role: row.role, content: row.content.slice(0, 2000) })) : isChatMode(mode) ? scopedHistory.filter(row => isChatMode(row.mode) && row.state === 'draft_ready').sort((a, b) => a.id < b.id ? -1 : 1).slice(-6).map(row => {
    let reply = ''; try { reply = JSON.parse(row.artifacts).reply ?? ''; } catch { /* Legacy draft. */ }
    return { request: row.request, reply: reply.slice(0, 2000) };
  }) : [];
  const latest = scopedHistory.filter(row => isChatMode(row.mode) && row.state === 'draft_ready').sort((a, b) => a.id > b.id ? -1 : 1).find(row => { try { return JSON.parse(row.artifacts).files?.length > 0; } catch { return false; } });
  const source = args.sourceJobId !== undefined ? ctx.db.generationJob.id.find(args.sourceJobId) : latest;
  if (args.sourceJobId !== undefined && (!source || source.componentId !== (args.componentId ?? 0n) || source.projectId !== project.id || source.state !== 'draft_ready' || !isChatMode(source.mode) || !JSON.parse(source.artifacts).files?.length)) throw new SenderError('Selected draft is unavailable. Select a saved draft from this project.');
  const edited = source ? ctx.db.componentDraft.jobId.find(source.id) : undefined;
  if (args.sourceJobId !== undefined && (edited?.revision ?? 0n) !== args.expectedDraftRevision) throw new SenderError('Draft changed. Review the latest saved version before sending.');
  const candidateFiles = isChatMode(mode) && source ? edited?.files ?? JSON.parse(source.artifacts).files : [];
  const editing = isChatMode(mode) && source ? { jobId: source.id.toString(), revision: (edited?.revision ?? 0n).toString() } : undefined;
  const technologies = project.framework || !project.outputStack ? project : { ...project, ...presetDetails(project.outputStack) };
  const guidance = ctx.db.projectGuidance.projectId.find(project.id);
  const snapshot = JSON.stringify({ component: selectedComponent ? { id: selectedComponent.id.toString(), name: selectedComponent.name, category: selectedComponent.category, rootPath: selectedComponent.rootPath } : undefined,
    commonContracts: selectedComponent?.category === 'composition' ? [...ctx.db.component.projectId.filter(project.id)].filter(row => row.category === 'common').map(row => {
      const latestCommon = history.filter(job => job.componentId === row.id && job.state === 'draft_ready').sort((a,b) => a.id > b.id ? -1 : 1).find(job => JSON.parse(job.artifacts || '{}').files?.length);
      const files = latestCommon ? ctx.db.componentDraft.jobId.find(latestCommon.id)?.files ?? JSON.parse(latestCommon.artifacts).files : [];
      return { name: row.name, rootPath: row.rootPath, contracts: files.filter((file: { path: string }) => /\.(md|d\.ts|xml)$/.test(file.path)) };
    }) : [], conversation, candidateFiles, editing, requestedSourceJobId: args.sourceJobId?.toString() ?? '', technologies: { name: project.name, framework: technologies.framework, language: technologies.language, styling: technologies.styling, libraries: technologies.libraries, versions: technologies.versions },
    guidance: guidance ? { audience: guidance.audience, technical: guidance.technical, style: guidance.style, colors: guidance.colors, typography: guidance.typography, spacing: guidance.spacing, accessibility: guidance.accessibility, guidance: guidance.guidance } : {}, references, request: args.request.trim(), ...(args.editorInstruction ? { origin: 'editor_comment', editorInstruction: args.editorInstruction } : {}) });
  if (new TextEncoder().encode(snapshot).length > 65536) throw new SenderError('Complete project context exceeds 64 KiB. Shorten or remove project references or reduce draft/context size before sending.');
  if (secret && snapshot.includes(secret)) throw new SenderError('Remove credentials from the request or project context.');
  // Starter runs are bounded by their task count instead of the per-minute chat window.
  if (isChatMode(mode) && !delegate) {
    const usage = ctx.db.modelUsage.identity.find(ctx.sender);
    const withinWindow = usage && ctx.timestamp.microsSinceUnixEpoch - usage.windowStart.microsSinceUnixEpoch < 60000000n;
    if (withinWindow && usage.requests >= 5) throw new SenderError('Chat limit reached. Wait a minute before sending another message.');
    const next = { identity: ctx.sender, windowStart: withinWindow ? usage.windowStart : ctx.timestamp, requests: withinWindow ? usage.requests + 1 : 1 };
    if (usage) ctx.db.modelUsage.identity.update(next); else ctx.db.modelUsage.insert(next);
  }
  const inserted = ctx.db.generationJob.insert({ id: 0n, requestId: args.requestId, projectId: project.id, requestedBy: actor, request: args.request.trim(),
    componentId: args.componentId ?? 0n, state: 'queued', mode, model, scenario: args.scenario, snapshot, fingerprint: generationFingerprint(ctx, project.id), artifacts: '', diagnostic: '', createdAt: ctx.timestamp });
  if (selectedComponent) ctx.db.componentChatMessage.insert({ id: 0n, componentId: selectedComponent.id, projectId: project.id, senderIdentity: actor, role: 'user', content: args.request.trim(), jobId: inserted.id, createdAt: ctx.timestamp });
  if (isChatMode(mode)) ctx.db.generationDeadline.insert({ scheduledId: 0n, scheduledAt: ScheduleAt.time(ctx.timestamp.microsSinceUnixEpoch + 90000000n), jobId: inserted.id });
  return inserted;
}
export const saveComponentDraft = db.reducer({ jobId: t.u64(), expectedRevision: t.u64(), files: t.array(draftFile) }, (ctx, args) => {
  user(ctx);
  const job = ctx.db.generationJob.id.find(args.jobId);
  const project = job ? ctx.db.workspaceProject.id.find(job.projectId) : undefined;
  if (!job || !project || permission(ctx, project, ctx.sender) !== 'editor') throw new SenderError('Project edit access is required.');
  if (!isChatMode(job.mode) || job.state !== 'draft_ready' || !JSON.parse(job.artifacts).files?.length) throw new SenderError('Only generated code drafts can be edited.');
  const current = ctx.db.componentDraft.jobId.find(job.id);
  if ((current?.revision ?? 0n) !== args.expectedRevision) throw new SenderError('Draft changed. Your local edits were not overwritten.');
  let files;
  try { files = validateDraftFiles(args.files); }
  catch (cause) { throw new SenderError(cause instanceof Error ? cause.message : 'Invalid draft files.'); }
  const secrets = [ctx.env.NVIDIA_API_KEY?.trim(), ctx.env.GEMINI_API_KEY?.trim()];
  if (secrets.some(secret => secret && JSON.stringify(files).includes(secret))) throw new SenderError('Remove credentials from draft files.');
  const row = { componentId: job.componentId, jobId: job.id, projectId: job.projectId, revision: args.expectedRevision + 1n, files, updatedBy: ctx.sender, updatedAt: ctx.timestamp };
  if (current) ctx.db.componentDraft.jobId.update(row); else ctx.db.componentDraft.insert(row);
  if (job.componentId) {
    const previousFiles = current?.files ?? JSON.parse(job.artifacts).files;
    const previousItems = detectEditorInstructions(previousFiles);
    const previous = new Set(previousItems.map(item => item.key));
    const detected = detectEditorInstructions(files);
    const keys = new Set(detected.map(item => `${job.componentId}:${item.key}`));
    for (const record of ctx.db.editorInstruction.projectId.filter(job.projectId)) {
      if (record.sourceJobId === job.id && ['pending', 'blocked'].includes(record.state) && !keys.has(record.key)) ctx.db.editorInstruction.id.update({ ...record, state: 'dismissed', updatedAt: ctx.timestamp });
    }
    for (const item of detected) {
      const key = `${job.componentId}:${item.key}`;
      const existing = ctx.db.editorInstruction.key.find(key);
      if (existing?.state === 'pending' && existing.sourceJobId === job.id) ctx.db.editorInstruction.id.update({ ...existing, revision: row.revision, line: item.line, updatedBy: ctx.sender, updatedAt: ctx.timestamp });
      else if (!existing && !previous.has(item.key) && !previousItems.some(old => old.text === item.text) &&
        ![...ctx.db.editorInstruction.projectId.filter(job.projectId)].some(old => old.componentId === job.componentId && old.text === item.text)) insertEditorInstruction(ctx, job, row.revision, item);
    }
  }
});
function insertEditorInstruction(ctx: Ctx, job: { id: bigint; projectId: bigint; componentId: bigint }, revision: bigint, item: EditorInstruction) {
  return ctx.db.editorInstruction.insert({ id: 0n, key: `${job.componentId}:${item.key}`, projectId: job.projectId, componentId: job.componentId,
    sourceJobId: job.id, revision, path: item.path, text: item.text, line: item.line, state: 'pending', jobId: 0n, updatedBy: ctx.sender, updatedAt: ctx.timestamp });
}
export const visibleEditorInstructions = db.view({ name: 'visible_editor_instructions', public: true }, t.array(editorInstruction.rowType), ctx =>
  accessibleProjects(ctx).flatMap(project => [...ctx.db.editorInstruction.projectId.filter(project.id)]));

// Explicitly enable an inherited marker or rerun a terminal instruction. Autosave never does this.
export const enableEditorInstruction = db.reducer({ sourceJobId: t.u64(), expectedRevision: t.u64(), instructionKey: t.string() }, (ctx, args) => {
  user(ctx);
  const source = ctx.db.generationJob.id.find(args.sourceJobId);
  const target = source ? ctx.db.workspaceProject.id.find(source.projectId) : undefined;
  if (!source || !target || !source.componentId || permission(ctx, target, ctx.sender) !== 'editor') denied();
  const draft = ctx.db.componentDraft.jobId.find(source.id);
  if (source.state !== 'draft_ready' || !isChatMode(source.mode) || (draft?.revision ?? 0n) !== args.expectedRevision) throw new SenderError('Draft changed. Review the latest saved version before sending.');
  const item = detectEditorInstructions(draft?.files ?? JSON.parse(source.artifacts).files ?? []).find(item => item.key === args.instructionKey);
  if (!item) throw new SenderError('Instruction is unavailable or ambiguous.');
  const old = ctx.db.editorInstruction.key.find(`${source.componentId}:${item.key}`);
  if (old?.jobId) {
    const job = ctx.db.generationJob.id.find(old.jobId);
    if (job && !['draft_ready', 'failed', 'cancelled'].includes(job.state)) throw new SenderError('This project already has an active generation job.');
  }
  if (old) ctx.db.editorInstruction.id.update({ ...old, sourceJobId: source.id, revision: args.expectedRevision, line: item.line, state: 'pending', jobId: 0n, updatedBy: ctx.sender, updatedAt: ctx.timestamp });
  else insertEditorInstruction(ctx, source, args.expectedRevision, item);
});
export const dismissEditorInstruction = db.reducer({ instructionId: t.u64() }, (ctx, args) => {
  user(ctx);
  const row = ctx.db.editorInstruction.id.find(args.instructionId);
  const target = row ? ctx.db.workspaceProject.id.find(row.projectId) : undefined;
  if (!row || !target || permission(ctx, target, ctx.sender) !== 'editor') denied();
  if (['pending', 'blocked'].includes(row.state)) ctx.db.editorInstruction.id.update({ ...row, state: 'dismissed', updatedAt: ctx.timestamp });
});
export const visibleComponentDrafts = db.view({ name: 'visible_component_drafts', public: true }, t.array(componentDraft.rowType), ctx =>
  accessibleProjects(ctx).flatMap(project => [...ctx.db.componentDraft.projectId.filter(project.id)]));
function draftInputsCurrent(ctx: Ctx, snapshot: string) {
  const editing = JSON.parse(snapshot).editing;
  if (!editing) return true;
  const source = ctx.db.generationJob.id.find(BigInt(editing.jobId));
  return !!source && (ctx.db.componentDraft.jobId.find(source.id)?.revision ?? 0n).toString() === editing.revision;
}
export const createGeneration = db.reducer({ projectId: t.u64(), requestId: t.string(), request: t.string(), scenario: t.string() }, (ctx, args) => { queueGeneration(ctx, args); });
export const advanceMockGeneration = db.reducer({ jobId: t.u64(), expectedState: t.string() }, (ctx, args) => {
  user(ctx);
  const job = ctx.db.generationJob.id.find(args.jobId);
  const project = job ? ctx.db.workspaceProject.id.find(job.projectId) : undefined;
  if (!job || !project || permission(ctx, project, ctx.sender) !== 'editor') denied();
  if (ctx.env.GENERATION_MODE !== 'mock' || job.mode !== 'mock') denied();
  if (['preview_ready', 'draft_ready', 'failed', 'cancelled'].includes(job.state)) return;
  if (job.state !== args.expectedState) return; // Idempotent resume across tabs/retries.
  if (job.fingerprint !== generationFingerprint(ctx, project.id)) {
    ctx.db.generationJob.id.update({ ...job, state: 'failed', diagnostic: 'Project inputs changed. Start a new job with the latest context.' }); return;
  }
  if ((job.state === 'generating' && job.scenario === 'generation_failure') || (job.state === 'building' && job.scenario === 'build_failure')) {
    ctx.db.generationJob.id.update({ ...job, state: 'failed', diagnostic: 'Simulated provider/build failure. Existing working content was not changed.' }); return;
  }
  const index = generationStages.indexOf(job.state as typeof generationStages[number]);
  if (index < 0) denied();
  const state = generationStages[index + 1];
  ctx.db.generationJob.id.update({ ...job, state, artifacts: state === 'preview_ready' ? mockArtifacts : job.artifacts,
    diagnostic: state === 'preview_ready' ? 'Mock checks only. No compiler, AI provider or hosted sandbox was executed. Not promoted to current.' : '' });
});
export const cancelGeneration = db.reducer({ jobId: t.u64() }, (ctx, args) => {
  user(ctx);
  const job = ctx.db.generationJob.id.find(args.jobId);
  const project = job ? ctx.db.workspaceProject.id.find(job.projectId) : undefined;
  if (!job || !project || permission(ctx, project, ctx.sender) !== 'editor') denied();
  if (!['preview_ready', 'draft_ready', 'failed', 'cancelled'].includes(job.state)) {
    ctx.db.generationJob.id.update({ ...job, state: 'cancelled', diagnostic: 'Cancelled. Existing working content was not changed.' });
    if (job.componentId) ctx.db.componentChatMessage.insert({ id: 0n, componentId: job.componentId, projectId: job.projectId, senderIdentity: ctx.sender, role: 'system', content: 'Cancelled. Existing working content was not changed.', jobId: job.id, createdAt: ctx.timestamp });
  }
});
export const visibleGenerationJobs = db.view({ name: 'visible_generation_jobs', public: true }, t.array(generationJob.rowType), ctx =>
  accessibleProjects(ctx).flatMap(project => [...ctx.db.generationJob.projectId.filter(project.id)]));
const generationConfiguration = t.object('GenerationConfiguration', { mode: t.string(), nvidiaEnabled: t.bool(), chatEnabled: t.bool() });
export const generationSettings = db.view({ name: 'generation_settings', public: true }, t.array(generationConfiguration), ctx => [{ mode: ctx.env.GENERATION_MODE === 'mock' ? 'mock' : 'unconfigured', nvidiaEnabled: ctx.env.NVIDIA_ENABLED === 'true' && !!ctx.env.NVIDIA_API_KEY?.trim(), chatEnabled: ctx.env.NVIDIA_ENABLED === 'true' && !!ctx.env.NVIDIA_API_KEY?.trim() && !!ctx.env.GEMINI_API_KEY?.trim() && /^gemini-[a-z0-9.-]+$/.test(ctx.env.GEMINI_MODEL?.trim() || GEMINI_MODEL) }]);

export const removeGeneration = db.reducer({ jobId: t.u64() }, (ctx, args) => {
  user(ctx);
  const job = ctx.db.generationJob.id.find(args.jobId);
  const project = job ? ctx.db.workspaceProject.id.find(job.projectId) : undefined;
  if (!job || !project || permission(ctx, project, ctx.sender) !== 'editor') denied();
  if (!['preview_ready', 'draft_ready', 'failed', 'cancelled'].includes(job.state)) throw new SenderError('Cancel the active job before deleting it.');
  ctx.db.componentDraft.jobId.delete(job.id);
  ctx.db.generationJob.id.delete(job.id);
});

function chatCredentials(tx: Ctx) {
  const geminiKey = tx.env.GEMINI_API_KEY?.trim() ?? '';
  const geminiModel = tx.env.GEMINI_MODEL?.trim() || GEMINI_MODEL;
  const nvidiaKey = tx.env.NVIDIA_API_KEY?.trim() ?? '';
  const nvidiaModel = tx.env.NVIDIA_MODEL?.trim() || NVIDIA_MODEL;
  if ([geminiKey, nvidiaKey].some(key => key.length < 16 || key.length > 512 || /\s/.test(key)) || !/^gemini-[a-z0-9.-]+$/.test(geminiModel) || geminiModel.length > 120 || !/^nvidia\/[a-z0-9.-]*nemotron[a-z0-9.-]*$/.test(nvidiaModel)) throw new SenderError('ComPlix chat is not configured. Contact the operator.');
  return { geminiKey, geminiModel, nvidiaKey, nvidiaModel };
}
export const generateProjectChat = db.procedure({ projectId: t.u64(), requestId: t.string(), request: t.string(), sourceJobId: t.option(t.u64()), expectedDraftRevision: t.option(t.u64()), componentId: t.option(t.u64()) }, t.unit(), (ctx, args) => {
  const claim = ctx.withTx(tx => {
    user(tx);
    const target = tx.db.workspaceProject.id.find(args.projectId);
    if (!target || permission(tx, target, tx.sender) !== 'editor') throw new SenderError('Project edit access is required.');
    const { geminiKey, geminiModel, nvidiaKey, nvidiaModel } = chatCredentials(tx);
    const job = queueGeneration(tx, { ...args, scenario: 'success' }, 'gemini', nvidiaKey, geminiModel);
    if (job.snapshot.includes(geminiKey)) throw new SenderError('Remove credentials from the request or project context.');
    const call = job.state === 'queued';
    if (call) tx.db.generationJob.id.update({ ...job, state: 'generating' });
    return { id: job.id, snapshot: job.snapshot, call, geminiKey, geminiModel, nvidiaKey, nvidiaModel };
  });
  if (!claim.call) return {};
  executeChatJob(ctx, claim, ctx.sender);
  return {};
});
type ChatClaim = { id: bigint; snapshot: string; geminiKey: string; geminiModel: string; nvidiaKey: string; nvidiaModel: string };
const exportComponent = t.object('ExportComponent', { id: t.string(), name: t.string(), category: t.string(), rootPath: t.string(), jobId: t.string(), revision: t.string(), model: t.string(), origin: t.string(), files: t.array(draftFile) });
const exportReference = t.object('ExportReference', { id: t.string(), filename: t.string(), purpose: t.string(), bytes: t.array(t.u8()), content: t.string() });
const libraryExportSnapshot = t.object('LibraryExportSnapshot', {
  exportedAt: t.string(), project: t.object('ExportProject', { id: t.string(), name: t.string(), revision: t.string(), ...detailFields }),
  guidance: t.array(t.object('ExportGuidance', { label: t.string(), content: t.string() })),
  components: t.array(exportComponent), references: t.array(exportReference), warnings: t.array(t.string()),
});
export const prepareLibraryExport = db.procedure({ projectId: t.u64() }, libraryExportSnapshot, (ctx, args) => ctx.withTx(tx => {
  user(tx);
  const project = tx.db.workspaceProject.id.find(args.projectId);
  if (!project || !permission(tx, project, tx.sender)) denied();
  const jobs = [...tx.db.generationJob.projectId.filter(project.id)].sort((a, b) => {
    const first = a.createdAt.microsSinceUnixEpoch; const second = b.createdAt.microsSinceUnixEpoch;
    return first > second ? -1 : first < second ? 1 : a.id > b.id ? -1 : a.id < b.id ? 1 : 0;
  });
  const warnings: string[] = [];
  if (jobs.some(job => !['draft_ready', 'preview_ready', 'failed', 'cancelled'].includes(job.state))) warnings.push('Generation is in progress. This export contains only completed saved drafts from this snapshot.');
  if (jobs.some(job => !job.componentId && job.state === 'draft_ready' && isChatMode(job.mode))) warnings.push('Legacy project-level results without a component identity are not included in the component library export.');
  const components = [...tx.db.component.projectId.filter(project.id)].sort((a, b) => a.rootPath.localeCompare(b.rootPath)).flatMap(component => {
    const source = jobs.find(job => job.componentId === component.id && job.state === 'draft_ready' && isChatMode(job.mode) && (() => { try { return JSON.parse(job.artifacts).files?.length > 0; } catch { return false; } })());
    if (!source) { warnings.push(`Component ${component.name} (${component.id}) has no completed source draft and was omitted.`); return []; }
    const saved = tx.db.componentDraft.jobId.find(source.id);
    const files = validateDraftFiles(saved?.files ?? JSON.parse(source.artifacts).files);
    return [{ id: component.id.toString(), name: component.name, category: component.category, rootPath: component.rootPath,
      jobId: source.id.toString(), revision: (saved?.revision ?? 0n).toString(), model: source.model,
      origin: source.model ? 'generated' : 'starter-placeholder', files }];
  });
  if (!components.length) throw new SenderError('No saved component files are available to export.');
  const technologies = project.framework || !project.outputStack ? project : { ...project, ...presetDetails(project.outputStack) };
  const savedGuidance = tx.db.projectGuidance.projectId.find(project.id);
  const guidance = (['audience', 'technical', 'style', 'colors', 'typography', 'spacing', 'accessibility', 'guidance'] as const).map(label => ({ label, content: savedGuidance?.[label] ?? '' }));
  const references = [...tx.db.projectReference.projectId.filter(project.id)].sort((a, b) => a.id < b.id ? -1 : 1).map(row => ({ id: row.id.toString(), filename: row.filename, purpose: row.purpose, bytes: row.bytes, content: row.content }));
  const snapshot = { exportedAt: new Date(Number(tx.timestamp.microsSinceUnixEpoch / 1000n)).toISOString(),
    project: { id: project.id.toString(), name: project.name, revision: project.revision.toString(), framework: technologies.framework, language: technologies.language, styling: technologies.styling, libraries: technologies.libraries, versions: technologies.versions },
    guidance, components, references, warnings };
  const text = JSON.stringify({ ...snapshot, references: references.map(row => ({ ...row, bytes: undefined })) });
  const bytes = new TextEncoder().encode(text).length + references.reduce((sum, row) => sum + row.bytes.length, 0);
  if (bytes > 64 * 1024 * 1024) throw new SenderError('Library export exceeds the 64 MiB prototype limit. No files were omitted.');
  const secrets = [tx.env.GEMINI_API_KEY?.trim(), tx.env.NVIDIA_API_KEY?.trim(), tx.env.E2B_API_KEY?.trim()].filter((value): value is string => !!value);
  if (secrets.some(secret => text.includes(secret) || references.some(row => new TextDecoder().decode(new Uint8Array(row.bytes)).includes(secret)))) throw new SenderError('Remove credentials from library files, guidance or references before exporting.');
  return snapshot;
}));
export const runEditorInstruction = db.procedure({ instructionId: t.u64(), expectedRevision: t.u64() }, t.unit(), (ctx, args) => {
  let claim: ChatClaim | undefined;
  try { claim = ctx.withTx(tx => {
    user(tx);
    const record = tx.db.editorInstruction.id.find(args.instructionId);
    const target = record ? tx.db.workspaceProject.id.find(record.projectId) : undefined;
    if (!record || !target || permission(tx, target, tx.sender) !== 'editor') denied();
    if (record.state !== 'pending') return undefined; // Atomic claim across collaborators/reconnects.
    const technologies = target.framework || !target.outputStack ? target : { ...target, ...presetDetails(target.outputStack) };
    if (!selectStackAdapter(technologies)) throw new SenderError('Unsupported target stack: generation requires a matching adapter.');
    if (record.revision !== args.expectedRevision) throw new SenderError('Draft changed. Review the latest saved version before sending.');
    const source = tx.db.generationJob.id.find(record.sourceJobId);
    const draft = source ? tx.db.componentDraft.jobId.find(source.id) : undefined;
    if (!source || source.projectId !== target.id || source.componentId !== record.componentId || source.state !== 'draft_ready' || !isChatMode(source.mode) || (draft?.revision ?? 0n) !== record.revision) throw new SenderError('Selected draft is unavailable. Select a saved draft from this project.');
    const item = detectEditorInstructions(draft?.files ?? JSON.parse(source.artifacts).files ?? []).find(item => `${source.componentId}:${item.key}` === record.key);
    if (!item) throw new SenderError('Instruction is unavailable or ambiguous.');
    const { geminiKey, geminiModel, nvidiaKey, nvidiaModel } = chatCredentials(tx);
    const job = queueGeneration(tx, { projectId: target.id, componentId: record.componentId, sourceJobId: source.id,
      expectedDraftRevision: record.revision, requestId: `instruction-${record.id}-${record.updatedAt.microsSinceUnixEpoch}`,
      request: `Editor instruction at ${item.path}:${item.line}\n${item.text}`, scenario: 'success',
      editorInstruction: { id: record.id.toString(), path: item.path, text: item.text, line: item.line } }, 'gemini', nvidiaKey, geminiModel);
    if (job.snapshot.includes(geminiKey)) throw new SenderError('Remove credentials from the request or project context.');
    tx.db.editorInstruction.id.update({ ...record, state: 'submitted', jobId: job.id });
    tx.db.generationJob.id.update({ ...job, state: 'generating' });
    tx.db.componentChatMessage.insert({ id: 0n, componentId: record.componentId, projectId: target.id, senderIdentity: tx.sender,
      role: 'system', content: `I see your @complix request in ${item.path}:${item.line}: "${item.text}". I'm reviewing it now; Nemotron will handle any code changes.`, jobId: job.id, createdAt: tx.timestamp });
    return { id: job.id, snapshot: job.snapshot, geminiKey, geminiModel, nvidiaKey, nvidiaModel };
  }); } catch (cause) {
    // Persist admission failures so remounting the editor does not implicitly retry them.
    ctx.withTx(tx => {
      try { user(tx); } catch { return; }
      const record = tx.db.editorInstruction.id.find(args.instructionId);
      const target = record ? tx.db.workspaceProject.id.find(record.projectId) : undefined;
      if (record && target && permission(tx, target, tx.sender) === 'editor' && record.state === 'pending' && record.revision === args.expectedRevision) tx.db.editorInstruction.id.update({ ...record, state: 'blocked', updatedAt: tx.timestamp });
    });
    throw cause;
  }
  if (claim) executeChatJob(ctx, claim, ctx.sender);
  return {};
});
/** Runs a claimed chat job and records its result. `actor` is the user the job belongs to; access is rechecked between steps. */
function executeChatJob(ctx: ProcCtx, claim: ChatClaim, actor: Identity) {
  let artifacts = ''; let diagnostic = '';
  const checkCurrent = (generating = false) => ctx.withTx(tx => {
    const job = tx.db.generationJob.id.find(claim.id);
    const target = job ? tx.db.workspaceProject.id.find(job.projectId) : undefined;
    if (!tx.db.userProfile.identity.find(actor) || !job || !target || permission(tx, target, actor) !== 'editor' || !['generating', 'generating_code'].includes(job.state) || tx.timestamp.microsSinceUnixEpoch - job.createdAt.microsSinceUnixEpoch >= 90000000n || job.fingerprint !== generationFingerprint(tx, target.id) || !draftInputsCurrent(tx, job.snapshot)) throw new Error('Chat context changed or the request was cancelled. No further provider call was made.');
    if (generating && job.state === 'generating') tx.db.generationJob.id.update({ ...job, state: 'generating_code' });
  });
  try {
    artifacts = runComponentChat(claim, (url, body, key, timeoutMs) => {
      checkCurrent();
      const response = ctx.http.fetch(url, { method: 'POST', timeout: new TimeDuration(BigInt(timeoutMs) * 1000n),
        headers: { 'Content-Type': 'application/json', ...(url.startsWith('https://generativelanguage.googleapis.com/') ? { 'x-goog-api-key': key } : { Authorization: 'Bearer ' + key }) }, body: JSON.stringify(body) });
      return { status: response.status, body: response.status === 200 ? response.text() : '' };
    }, () => checkCurrent(true));
  } catch (cause) {
    // Error text from HTTP/runtime internals is never persisted.
    const message = cause instanceof Error ? cause.message : '';
    const safe = ['Generated files did not match the component change plan. No changes were saved.', 'Component change produced an invalid or oversized draft. No changes were saved.', 'Gemini request failed or timed out. No automatic retry was made.', 'NVIDIA request failed or timed out. No automatic retry was made.', 'NVIDIA returned unusable output.', 'NVIDIA returned an unreadable response.', 'NVIDIA did not return a valid file draft.', 'NVIDIA returned an unsafe file manifest.', 'NVIDIA draft exceeds the size limit.', 'NVIDIA reply exceeds the size limit.', 'Gemini returned unusable output.', 'Gemini response was incomplete or blocked. No changes were saved.', 'Gemini requested an unsupported tool operation.', 'Gemini exceeded the generation tool limit.', 'Unsupported target stack: generation requires a matching adapter.', 'AI response contained credentials. No changes were saved.', 'Chat context changed or the request was cancelled. No further provider call was made.', 'Gemini rejected the model or request configuration.', 'Gemini rejected the operator configuration.', 'Gemini denied access.', 'Gemini rate or quota limit reached. Try later.', 'Gemini could not complete the request.', 'Gemini billing or credits are exhausted. The operator must check the API project billing and usage limits.', 'Gemini model is unavailable. The operator must check GEMINI_MODEL.', 'Gemini is temporarily unavailable. Try again later.', 'NVIDIA rejected the API key.', 'NVIDIA denied access to this model.', 'NVIDIA rate or quota limit reached. Try later.', 'NVIDIA could not complete the request.', 'NVIDIA rejected the model or request configuration.', 'NVIDIA deferred this request. No automatic retry was made.'];
    diagnostic = safe.includes(message) ? message : 'AI coordination could not complete safely or timed out. No automatic retry was made.';
  }
  ctx.withTx(tx => {
    if (!tx.db.userProfile.identity.find(actor)) denied();
    const job = tx.db.generationJob.id.find(claim.id);
    const target = job ? tx.db.workspaceProject.id.find(job.projectId) : undefined;
    if (!job || !target || permission(tx, target, actor) !== 'editor') denied();
    if (!['generating', 'generating_code'].includes(job.state)) return;
    const failure = tx.timestamp.microsSinceUnixEpoch - job.createdAt.microsSinceUnixEpoch >= 90000000n ? 'AI request exceeded its deadline. No automatic retry was made.' : job.fingerprint !== generationFingerprint(tx, target.id) || !draftInputsCurrent(tx, job.snapshot) ? 'Draft or project inputs changed during coordination. Your edits were preserved.' : diagnostic;
    if (job.componentId) tx.db.componentChatMessage.insert({ id: 0n, componentId: job.componentId, projectId: job.projectId, senderIdentity: actor, role: 'assistant', content: failure || JSON.parse(artifacts).reply, jobId: job.id, createdAt: tx.timestamp });
    tx.db.generationJob.id.update({ ...job, state: failure ? 'failed' : 'draft_ready', artifacts: failure ? '' : artifacts,
      diagnostic: failure || 'Gemini coordinated this unverified draft. No compiler, sandbox, tests or executable preview have run. Not promoted to current.' });
  });

}

function expireStaleGenerations(ctx: Ctx, projectId: bigint) {
  for (const job of ctx.db.generationJob.projectId.filter(projectId)) {
    if (isChatMode(job.mode) && ['queued', 'generating', 'generating_code'].includes(job.state) && ctx.timestamp.microsSinceUnixEpoch - job.createdAt.microsSinceUnixEpoch >= 90000000n) {
      ctx.db.generationJob.id.update({ ...job, state: 'failed', diagnostic: 'AI request exceeded its deadline. No automatic retry was made. You can send a new message.' });
    }
  }
}
// onSchedule callbacks are private to the scheduler/database owner, not callable by app clients.
export const expireGeneration = db.reducer({ onSchedule: generationDeadline }, { timer: generationDeadline.rowType }, (ctx, { timer }) => {
  const job = ctx.db.generationJob.id.find(timer.jobId);
  if (job && isChatMode(job.mode) && ['queued', 'generating', 'generating_code'].includes(job.state)) {
    ctx.db.generationJob.id.update({ ...job, state: 'failed', diagnostic: 'AI request exceeded its deadline. No automatic retry was made. You can send a new message.' });
    // Resume an interrupted starter run; the tick settles this task as failed and continues.
    if ([...ctx.db.starterTask.projectId.filter(job.projectId)].some(task => task.jobId === job.id && task.state === 'generating')) scheduleStarter(ctx, job.projectId, 0n);
  }
});

export const visibleComponents = db.view({ name: 'visible_components', public: true }, t.array(component.rowType), ctx => accessibleProjects(ctx).flatMap(project => [...ctx.db.component.projectId.filter(project.id)]));
export const visibleComponentChat = db.view({ name: 'visible_component_chat', public: true }, t.array(componentChatMessage.rowType), ctx => accessibleProjects(ctx).flatMap(project => [...ctx.db.componentChatMessage.projectId.filter(project.id)]));
export const createComponent = db.reducer({ projectId: t.u64(), name: t.string(), category: t.string() }, (ctx, args) => {
  user(ctx);
  const project = ctx.db.workspaceProject.id.find(args.projectId);
  if (!project || permission(ctx, project, ctx.sender) !== 'editor') throw new SenderError('Project edit access is required.');
  insertComponent(ctx, project, args.name, args.category);
});
/** Creates a component with a minimal placeholder draft so chat and the starter run can edit it. */
type ProjectWithStack = { id: bigint; outputStack: string; framework: string; language: string; styling: string; libraries: string; versions: string };
function insertComponent(ctx: Ctx, project: ProjectWithStack, componentName: string, category: string, actor = ctx.sender) {
  const name = componentName.trim();
  if (!/^[a-zA-Z0-9_-]{1,80}$/.test(name) || !['common', 'composition'].includes(category)) throw new SenderError('Use a component name of 1-80 letters, numbers, hyphens or underscores.');
  if ([...ctx.db.component.projectId.filter(project.id)].some(row => row.name.toLowerCase() === name.toLowerCase())) throw new SenderError('A component with that name already exists.');
  const row = ctx.db.component.insert({ id: 0n, projectId: project.id, name, category, rootPath: (category === 'common' ? 'Common/' : 'Compositions/') + name, createdAt: ctx.timestamp });
  const files = [{ path: row.rootPath + '/README.md', content: '# ' + name + '\n\nUnverified starter draft. Describe the public API and examples here.' }];
  const target = project.framework || !project.outputStack ? project : { ...project, ...presetDetails(project.outputStack) };
  const adapter = selectStackAdapter(target);
  const symbol = /^[A-Za-z_]/.test(name) ? name.replace(/-/g, '_') : 'Component_' + name.replace(/-/g, '_');
  if (adapter?.id === 'react-tailwind-shadcn') files.push({ path: row.rootPath + '/' + symbol + '.tsx', content: 'export function ' + symbol + '() { return <div />; }\n' });
  if (adapter?.id === 'blazor-bootstrap') files.push({ path: row.rootPath + '/' + symbol + '.razor', content: '<div class="d-block"></div>\n' });
  const job = ctx.db.generationJob.insert({ id: 0n, requestId: 'component:starter:' + row.id, projectId: project.id, requestedBy: actor, request: 'Starter: ' + name, state: 'draft_ready', mode: 'gemini', scenario: 'success', snapshot: '{}', fingerprint: generationFingerprint(ctx, project.id), artifacts: JSON.stringify({ reply: '', files }), diagnostic: 'Unverified starter; no generation or build has run.', createdAt: ctx.timestamp, model: '', componentId: row.id });
  ctx.db.componentDraft.insert({ jobId: job.id, projectId: project.id, componentId: row.id, revision: 0n, files, updatedBy: actor, updatedAt: ctx.timestamp });
  return row;
}

// ---- Starter library: generated one component at a time after project setup. ----
export const visibleStarterTasks = db.view({ name: 'visible_starter_tasks', public: true }, t.array(starterTask.rowType), ctx =>
  accessibleProjects(ctx).flatMap(project => [...ctx.db.starterTask.projectId.filter(project.id)]));
function scheduleStarter(ctx: Ctx, projectId: bigint, delayMicros: bigint) {
  ctx.db.starterTick.insert({ scheduledId: 0n, scheduledAt: ScheduleAt.time(ctx.timestamp.microsSinceUnixEpoch + delayMicros), projectId });
}
const terminalJob = (state: string) => ['preview_ready', 'draft_ready', 'failed', 'cancelled'].includes(state);
const jobHasFiles = (artifacts: string) => { try { return JSON.parse(artifacts).files?.length > 0; } catch { return false; } };
export const startStarterLibrary = db.reducer({ projectId: t.u64(), starterIds: t.array(t.string()) }, (ctx, args) => {
  const target = editableProject(ctx, args.projectId);
  if (target.setupState !== 'setup') throw new SenderError('Starter components can only be generated during project setup.');
  requireSetupInput(ctx, target.id);
  const technologies = target.framework || !target.outputStack ? target : { ...target, ...presetDetails(target.outputStack) };
  if (!selectStackAdapter(technologies)) throw new SenderError('Starter components need a supported stack (React + TypeScript or Blazor). Finish setup without starters instead.');
  chatCredentials(ctx);
  const chosen = starterComponents.filter(item => args.starterIds.includes(item.id));
  if (!chosen.length || chosen.length !== new Set(args.starterIds).size) throw new SenderError('Choose at least one starter component.');
  const existing = [...ctx.db.component.projectId.filter(target.id)];
  chosen.forEach((item, position) => {
    const row = existing.find(component => component.name.toLowerCase() === item.name.toLowerCase()) ?? insertComponent(ctx, technologies, item.name, 'common');
    ctx.db.starterTask.insert({ id: 0n, projectId: target.id, componentId: row.id, starterId: item.id, position, state: 'pending', jobId: 0n, message: '', requestedBy: ctx.sender, updatedAt: ctx.timestamp });
  });
  ctx.db.workspaceProject.id.update({ ...target, setupState: 'generating' });
  scheduleStarter(ctx, target.id, 0n);
});
export const retryStarterTask = db.reducer({ taskId: t.u64() }, (ctx, args) => {
  const task = ctx.db.starterTask.id.find(args.taskId);
  if (!task) throw new SenderError('Project edit access is required.');
  const target = editableProject(ctx, task.projectId);
  if (task.state !== 'failed') return;
  // The retry runs as whoever asked for it.
  ctx.db.starterTask.id.update({ ...task, state: 'pending', jobId: 0n, message: '', requestedBy: ctx.sender, updatedAt: ctx.timestamp });
  if (target.setupState === 'ready') ctx.db.workspaceProject.id.update({ ...target, setupState: 'generating' });
  scheduleStarter(ctx, target.id, 0n);
});
/** Records a finished job on its task. Idempotent; safe to call after crashes or cancellation. */
function settleStarterTasks(ctx: Ctx, projectId: bigint) {
  for (const task of ctx.db.starterTask.projectId.filter(projectId)) {
    if (task.state !== 'generating') continue;
    const job = ctx.db.generationJob.id.find(task.jobId);
    if (job && !terminalJob(job.state)) continue;
    const done = !!job && job.state === 'draft_ready' && jobHasFiles(job.artifacts);
    const message = done ? '' : !job ? 'Generation record is missing.' : job.state === 'draft_ready' ? 'ComPlix replied without generating files. Retry to try again.' : job.diagnostic || 'Generation failed.';
    ctx.db.starterTask.id.update({ ...task, state: done ? 'done' : 'failed', message: message.slice(0, 500), updatedAt: ctx.timestamp });
  }
}
// Scheduled only; clients cannot call onSchedule functions. Each tick runs at most one provider job.
export const runStarterTask = db.procedure({ onSchedule: starterTick }, { timer: starterTick.rowType }, t.unit(), (ctx, { timer }) => {
  const claim = ctx.withTx(tx => {
    const target = tx.db.workspaceProject.id.find(timer.projectId);
    if (!target) return undefined;
    settleStarterTasks(tx, target.id);
    const tasks = [...tx.db.starterTask.projectId.filter(target.id)].sort((a, b) => a.position - b.position);
    // Another tick owns the running task; it schedules the follow-up when it finishes.
    if (tasks.some(task => task.state === 'generating')) return undefined;
    const next = tasks.find(task => task.state === 'pending');
    if (!next) {
      if (target.setupState === 'generating') tx.db.workspaceProject.id.update({ ...target, setupState: 'ready' });
      return undefined;
    }
    const fail = (message: string) => {
      tx.db.starterTask.id.update({ ...next, state: 'failed', message, updatedAt: tx.timestamp });
      scheduleStarter(tx, target.id, 0n);
      return undefined;
    };
    if (!tx.db.userProfile.identity.find(next.requestedBy) || permission(tx, target, next.requestedBy) !== 'editor') return fail('The person who started setup no longer has edit access.');
    const busy = [...tx.db.generationJob.projectId.filter(target.id)].some(job => !terminalJob(job.state));
    if (busy) { expireStaleGenerations(tx, target.id); scheduleStarter(tx, target.id, 10000000n); return undefined; }
    let credentials;
    try { credentials = chatCredentials(tx); } catch { return fail('ComPlix chat is not configured. Contact the operator.'); }
    let job;
    try {
      job = queueGeneration(tx, { projectId: target.id, componentId: next.componentId, scenario: 'success', request: starterRequest(next.starterId),
        requestId: 'starter-' + next.id.toString() + '-' + tx.timestamp.microsSinceUnixEpoch.toString() }, 'gemini', credentials.nvidiaKey, credentials.geminiModel, next.requestedBy);
    } catch (cause) { return fail(cause instanceof SenderError ? cause.message : 'Starter generation could not be queued.'); }
    tx.db.generationJob.id.update({ ...job, state: 'generating' });
    tx.db.starterTask.id.update({ ...next, state: 'generating', jobId: job.id, message: '', updatedAt: tx.timestamp });
    return { claim: { id: job.id, snapshot: job.snapshot, ...credentials }, actor: next.requestedBy };
  });
  if (!claim) return {};
  try { executeChatJob(ctx, claim.claim, claim.actor); }
  finally {
    // Always settle and continue, even when the result transaction rejected a lost-access user.
    ctx.withTx(tx => { settleStarterTasks(tx, timer.projectId); scheduleStarter(tx, timer.projectId, 1000000n); });
  }
  return {};
});
export const clearComponentChat = db.reducer({ componentId: t.u64() }, (ctx, args) => {
  user(ctx);
  const component = ctx.db.component.id.find(args.componentId);
  const project = component ? ctx.db.workspaceProject.id.find(component.projectId) : undefined;
  if (!component || !project || permission(ctx, project, ctx.sender) !== 'editor') throw new SenderError('Project edit access is required.');
  for (const job of ctx.db.generationJob.projectId.filter(project.id)) if (job.componentId === component.id && ['queued','generating','generating_code'].includes(job.state)) ctx.db.generationJob.id.update({ ...job, state: 'cancelled', diagnostic: 'Conversation cleared. Draft files were preserved.' });
  for (const message of ctx.db.componentChatMessage.componentId.filter(component.id)) ctx.db.componentChatMessage.id.delete(message.id);
});

const previewSummary = t.object('ComponentPreviewSummary', { jobId: t.u64(), projectId: t.u64(), url: t.string(), revision: t.u64(), expiresAt: t.timestamp() });
export const visibleComponentPreviews = db.view({ name: 'visible_component_previews', public: true }, t.array(previewSummary), ctx =>
  accessibleProjects(ctx).flatMap(project => [...ctx.db.componentPreview.projectId.filter(project.id)].map(row => ({ jobId: row.jobId, projectId: row.projectId, url: previewUrl(row), revision: row.revision, expiresAt: row.expiresAt }))));

/** Pushes the saved draft revision into the component's E2B sandbox, which builds and serves it. */
export const buildComponentPreview = db.procedure({ jobId: t.u64(), expectedRevision: t.u64() }, t.unit(), (ctx, args) => {
  const claim = ctx.withTx(tx => {
    user(tx);
    const job = tx.db.generationJob.id.find(args.jobId);
    const target = job ? tx.db.workspaceProject.id.find(job.projectId) : undefined;
    if (!job || !target || permission(tx, target, tx.sender) !== 'editor') throw new SenderError('Project edit access is required.');
    // Older projects keep their stack only in outputStack; use the same preset fallback as the views and chat.
    const technologies = target.framework || !target.outputStack ? target : { ...target, ...presetDetails(target.outputStack) };
    const kind = previewKind(technologies);
    if (!kind) throw new SenderError(`${previewMessages.unsupported} This project is set to framework "${technologies.framework.slice(0, 60) || '(blank)'}", language "${technologies.language.slice(0, 60) || '(blank)'}".`);
    const apiKey = tx.env.E2B_API_KEY?.trim() ?? '';
    const templateId = (kind === 'react' ? tx.env.E2B_REACT_TEMPLATE : tx.env.E2B_BLAZOR_TEMPLATE)?.trim() ?? '';
    const appOrigin = tx.env.PREVIEW_APP_ORIGIN?.trim() || 'http://127.0.0.1:5173';
    if (apiKey.length < 16 || /\s/.test(apiKey) || !/^[A-Za-z0-9_-]{4,64}$/.test(templateId)) throw new SenderError(previewMessages.unconfigured);
    const draft = tx.db.componentDraft.jobId.find(job.id);
    if ((draft?.revision ?? 0n) !== args.expectedRevision) throw new SenderError('Draft changed. Review the latest saved version before previewing.');
    let files: Array<{ path: string; content: string }> = draft?.files ?? [];
    if (!draft) { try { files = JSON.parse(job.artifacts).files ?? []; } catch { files = []; } }
    if (!files.length) throw new SenderError('Select a saved draft with files before previewing.');
    // Without a hand-written preview entry, render the component's own file (generated host entry, not saved).
    const componentName = tx.db.component.id.find(job.componentId)?.name ?? '';
    try { files = withPreviewEntry(kind, files, componentName); } catch (cause) { throw new SenderError(cause instanceof Error ? cause.message : 'Invalid preview entry.'); }
    const secrets = [apiKey, tx.env.NVIDIA_API_KEY?.trim(), tx.env.GEMINI_API_KEY?.trim()];
    if (secrets.some(secret => secret && JSON.stringify(files).includes(secret))) throw new SenderError('Remove credentials from draft files.');
    const existing = tx.db.componentPreview.jobId.find(job.id);
    const live = existing && existing.expiresAt.microsSinceUnixEpoch > tx.timestamp.microsSinceUnixEpoch + 15000000n ? existing : undefined;
    return { jobId: job.id, projectId: job.projectId, componentId: job.componentId, apiKey, templateId, appOrigin, files, existing: live };
  });
  let lease;
  try {
    lease = startSandboxBuild((request) => {
      const response = ctx.http.fetch(request.url, { method: request.method, headers: request.headers, body: request.body, timeout: new TimeDuration(BigInt(request.timeoutMs) * 1000n) });
      return { status: response.status, body: response.status < 500 ? response.text() : '' };
    }, { apiKey: claim.apiKey, templateId: claim.templateId, appOrigin: claim.appOrigin, existing: claim.existing, revision: args.expectedRevision.toString(), files: claim.files });
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : '';
    throw new SenderError(message && !message.includes(claim.apiKey) ? message : previewMessages.create);
  }
  ctx.withTx(tx => {
    const job = tx.db.generationJob.id.find(claim.jobId);
    const target = job ? tx.db.workspaceProject.id.find(job.projectId) : undefined;
    if (!job || !target || permission(tx, target, tx.sender) !== 'editor') denied();
    const row = { jobId: claim.jobId, projectId: claim.projectId, componentId: claim.componentId, ...lease, revision: args.expectedRevision,
      expiresAt: new Timestamp(tx.timestamp.microsSinceUnixEpoch + BigInt(PREVIEW_IDLE_SECONDS) * 1000000n), updatedAt: tx.timestamp };
    if (tx.db.componentPreview.jobId.find(claim.jobId)) tx.db.componentPreview.jobId.update(row); else tx.db.componentPreview.insert(row);
  });
  return {};
});
