import { test, expect, type BrowserContext } from '@playwright/test';
import { spawn, spawnSync, type ChildProcess } from 'node:child_process';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { randomUUID, sign } from 'node:crypto';
import { DbConnection, tables } from '../src/module_bindings';
import { ensureLocalKeys } from '../scripts/local-keys.mjs';

const uri = 'http://127.0.0.1:3100';
const database = 'complix-test';
const audience = 'complix-test-client';
const authority = 'https://auth.spacetimedb.com/oidc';
const publicClient = 'client_034te16H37cuA4goFM0pev';
const runDirectory = path.resolve('.local/e2e', randomUUID());
const keys = ensureLocalKeys(path.join(runDirectory, 'keys'));
const clients: DbConnection[] = [];
let server: ChildProcess;
let legacyToken: string;
let legacyId: bigint;
let ownerToken: string;
let editorToken: string;
let viewerToken: string;
let outsiderToken: string;
let migratedOwnerToken: string;
let migratedMemberToken: string;
let migratedProjectId: bigint;
type Session = { conn: DbConnection; token: string };

test.describe.configure({ mode: 'serial' });
async function startServer() {
  mkdirSync(path.join(runDirectory, 'data'), { recursive: true });
  server = spawn(path.resolve('.tools/spacetime/spacetimedb-standalone.exe'), [
    'start', '--listen-addr', '127.0.0.1:3100', '--data-dir', path.join(runDirectory, 'data'),
    '--jwt-priv-key-path', keys.privateKeyPath, '--jwt-pub-key-path', keys.publicKeyPath, '--non-interactive',
  ], { stdio: 'ignore', windowsHide: true });
  await expect.poll(async () => {
    try { return (await fetch(uri + '/v1/ping')).ok; } catch { return false; }
  }, { timeout: 20000 }).toBe(true);
  if (server.exitCode !== null) throw new Error('Test server failed to start.');
}
async function stopServer() {
  clients.splice(0).forEach(conn => conn.disconnect());
  if (!server || server.exitCode !== null || server.signalCode !== null) return;
  const closed = new Promise<void>(resolve => server.once('exit', () => resolve()));
  server.kill(); await closed;
}
async function nativeToken() {
  const result = await fetch(uri + '/v1/identity', { method: 'POST' });
  return (await result.json()).token as string;
}
async function makeToken(email: string, name: string, overrides: Record<string, unknown> = {}) {
  const original = await nativeToken();
  const claims = JSON.parse(Buffer.from(original.split('.')[1], 'base64url').toString());
  const payload = { ...claims, aud: [audience], email, name, email_verified: true,
    exp: Math.floor(Date.now() / 1000) + 3600, ...overrides };
  return signed(payload);
}
function signed(payload: object) {
  const head = Buffer.from(JSON.stringify({ alg: 'ES256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = sign('sha256', Buffer.from(head + '.' + body), { key: readFileSync(keys.privateKeyPath), dsaEncoding: 'ieee-p1363' }).toString('base64url');
  return head + '.' + body + '.' + signature;
}
function publish(modulePath: string, auth = false) {
  const result = spawnSync(path.resolve('.tools/spacetime/spacetimedb-cli.exe'), [
    '--root-dir', path.join(runDirectory, 'cli'), 'publish', '--server', uri, '--module-path', modulePath,
    '--delete-data=never', '--break-clients', '--yes=skip-login', database,
  ], { stdio: 'pipe', encoding: 'utf8', timeout: 60000, windowsHide: true,
    env: { ...process.env, ...(auth ? { AUTH_ISSUER: 'localhost', AUTH_CLIENT_ID: audience } : {}) } });
  // CLI output is intentionally not included in assertion reports.
  if (result.status !== 0) {
    const diagnostic = (result.stdout + result.stderr).replace(/\beyJ[A-Za-z0-9_-]*\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, '[REDACTED]');
    throw new Error('Test publication failed: ' + diagnostic.slice(-5000));
  }
  expect(result.status, 'Test publication preserves data and succeeds').toBe(0);
}
async function connect(token: string, register = true): Promise<Session> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Connection timed out')), 8000);
    const conn = DbConnection.builder().withUri(uri).withDatabaseName(database).withToken(token)
      .onConnect(ctx => {
        const initialize = async () => {
          if (register) await ctx.reducers.registerProfile({});
          ctx.subscriptionBuilder().onApplied(() => {
            clearTimeout(timeout); resolve({ conn: ctx, token });
          }).onError(() => { clearTimeout(timeout); reject(new Error('Subscription denied')); })
            .subscribe(register ? [tables.myProfile, tables.myOrganizations, tables.visibleProjects, tables.organizationMembers, tables.myInvitations, tables.visibleGuidance, tables.managedProjectShares] : tables.myProject);
        };
        void initialize().catch(() => { clearTimeout(timeout); reject(new Error('Profile denied')); });
      }).onConnectError(() => { clearTimeout(timeout); reject(new Error('Connection denied')); })
      .onDisconnect(() => { clearTimeout(timeout); reject(new Error('Connection denied')); }).build();
    clients.push(conn);
  });
}
async function expectAdmissionDenied(token: string) {
  let accepted = false;
  try {
    const session = await connect(token);
    session.conn.disconnect();
    accepted = true;
  } catch { /* Expected rejection; do not include credentials in failure reports. */ }
  expect(accepted, 'Untrusted or unverified credentials must be rejected').toBe(false);
}
async function seedBrowser(context: BrowserContext, token: string, refreshToken?: string, accessExpiry?: number) {
  const profile = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString());
  await context.addInitScript(({ token, profile, key, refreshToken, accessExpiry }) => {
    if (sessionStorage.getItem('complix.test.seeded')) return;
    sessionStorage.setItem('complix.test.seeded', 'yes');
    sessionStorage.setItem(key, JSON.stringify({ id_token: token, access_token: 'local-test-access', token_type: 'Bearer',
      scope: 'openid profile email offline_access', refresh_token: refreshToken, profile, expires_at: accessExpiry ?? profile.exp }));
  }, { token, profile, refreshToken, accessExpiry, key: 'oidc.user:' + authority + ':' + publicClient });
}
async function sql(token: string, query: string) {
  return fetch(uri + '/v1/database/' + database + '/sql', {
    method: 'POST', headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'text/plain' }, body: query,
  });
}

test.beforeAll(async () => {
  await startServer();
  // Publish the original committed module first to prove a data-preserving upgrade.
  const oldPath = path.join(runDirectory, 'legacy-module');
  mkdirSync(path.join(oldPath, 'src'), { recursive: true });
  writeFileSync(path.join(oldPath, 'src/index.ts'), readFileSync('tests/fixtures/legacy-module.ts'));
  writeFileSync(path.join(oldPath, 'package.json'), JSON.stringify({ type: 'module', dependencies: { spacetimedb: '2.14.1' } }));
  writeFileSync(path.join(oldPath, 'tsconfig.json'), readFileSync('spacetimedb/tsconfig.json'));
  publish(oldPath);
  legacyToken = await nativeToken();
  const created = await fetch(uri + '/v1/database/' + database + '/call/create_project', {
    method: 'POST', headers: { Authorization: 'Bearer ' + legacyToken, 'Content-Type': 'application/json' },
    body: JSON.stringify(['Preserved legacy project', 'blazor-bootstrap']),
  });
  expect(created.ok).toBe(true);
  // Publish the immediately previous org-only module, seed real data/grants/guidance,
  // then upgrade to prove appended defaults and unique-index removal preserve it.
  const previousPath = path.join(runDirectory, 'organization-module');
  mkdirSync(path.join(previousPath, 'src'), { recursive: true });
  writeFileSync(path.join(previousPath, 'src/index.ts'), readFileSync('tests/fixtures/organization-module.ts'));
  writeFileSync(path.join(previousPath, 'package.json'), JSON.stringify({ type: 'module', dependencies: { spacetimedb: '2.14.1' } }));
  writeFileSync(path.join(previousPath, 'tsconfig.json'), readFileSync('spacetimedb/tsconfig.json'));
  publish(previousPath, true);
  migratedOwnerToken = await makeToken('migration-owner@example.test', 'Migration Owner');
  migratedMemberToken = await makeToken('migration-member@example.test', 'Migration Member');
  async function oldCall(token: string, reducer: string, args: unknown[]) {
    const response = await fetch(uri + '/v1/database/' + database + '/call/' + reducer, {
      method: 'POST', headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' }, body: JSON.stringify(args),
    });
    expect(response.ok, 'Previous-module fixture operation succeeds').toBe(true);
  }
  await oldCall(migratedOwnerToken, 'register_profile', []);
  await oldCall(migratedMemberToken, 'register_profile', []);
  await oldCall(migratedOwnerToken, 'create_organization', ['Migrated Team']);
  const orgResult = await (await sql(migratedOwnerToken, 'SELECT id FROM my_organizations')).json();
  const oldOrg = Number(orgResult[0].rows[0][0]);
  await oldCall(migratedOwnerToken, 'create_project', [oldOrg, 'Existing organization library', 'blazor-bootstrap']);
  const projectResult = await (await sql(migratedOwnerToken, 'SELECT id FROM visible_projects')).json();
  migratedProjectId = BigInt(projectResult[0].rows[0][0]);
  await oldCall(migratedOwnerToken, 'save_guidance', [Number(migratedProjectId), 0, 'Preserved audience', '', '', '', '', '', '', 'Preserved design rules']);
  await oldCall(migratedOwnerToken, 'invite_member', [oldOrg, 'migration-member@example.test', 'member', 'viewer']);
  const inviteResult = await (await sql(migratedMemberToken, 'SELECT id FROM my_invitations')).json();
  await oldCall(migratedMemberToken, 'accept_invitation', [Number(inviteResult[0].rows[0][0])]);
  publish(path.resolve('spacetimedb'), true);
  const old = await connect(legacyToken, false);
  legacyId = [...old.conn.db.myProject.iter()][0].id;
  ownerToken = await makeToken('owner@example.test', 'Owner');
  editorToken = await makeToken('editor@example.test', 'Editor');
  viewerToken = await makeToken('viewer@example.test', 'Viewer');
  outsiderToken = await makeToken('outsider@example.test', 'Outsider');
});
test.afterAll(stopServer);

test('verified claims and application audience are enforced', async () => {
  await expectAdmissionDenied(await nativeToken());
  await expectAdmissionDenied(await makeToken('unverified@example.test', 'Unverified', { email_verified: false }));
  await expectAdmissionDenied(await makeToken('wrong@example.test', 'Wrong', { aud: ['another-app'] }));
  await expectAdmissionDenied(await makeToken('expired@example.test', 'Expired', { exp: Math.floor(Date.now() / 1000) - 60 }));
  const owner = await connect(ownerToken);
  const payload = JSON.parse(Buffer.from(ownerToken.split('.')[1], 'base64url').toString());
  const wrongAudience = signed({ ...payload, aud: ['another-app'] });
  await expectAdmissionDenied(wrongAudience);
  const rawRead = await sql(wrongAudience, 'SELECT * FROM my_profile');
  expect(rawRead.ok, 'HTTP reads also honor admission checks').toBe(false);
  expect([...owner.conn.db.myProfile.iter()][0].email).toBe('owner@example.test');
});

test('organizations, invitations and grants enforce shared editing and immediate revocation', async () => {
  const owner = await connect(ownerToken);
  const editor = await connect(editorToken);
  const viewer = await connect(viewerToken);
  const outsider = await connect(outsiderToken);
  await owner.conn.reducers.createOrganization({ name: 'Team One' });
  await expect.poll(() => [...owner.conn.db.myOrganizations.iter()].length).toBe(1);
  const org = [...owner.conn.db.myOrganizations.iter()][0];
  await expect(owner.conn.reducers.createProject({ organizationId: org.id, name: ' ', outputStack: 'blazor-bootstrap' })).rejects.toThrow('Name');
  await expect(owner.conn.reducers.createProject({ organizationId: org.id, name: 'No', outputStack: 'angular' })).rejects.toThrow('supported');
  await owner.conn.reducers.createProject({ organizationId: org.id, name: 'Shared library', outputStack: 'react-ts-tailwind-shadcn' });
  await expect.poll(() => [...owner.conn.db.visibleProjects.iter()].length).toBe(1);
  const project = [...owner.conn.db.visibleProjects.iter()][0];
  await owner.conn.reducers.createProject({ organizationId: org.id, name: 'Another project', outputStack: 'blazor-bootstrap' });
  await expect(outsider.conn.reducers.inviteMember({ organizationId: org.id, email: 'x@example.test', role: 'admin', projectRole: '' })).rejects.toThrow('Access denied');
  await owner.conn.reducers.inviteMember({ organizationId: org.id, email: 'EDITOR@example.test', role: 'member', projectRole: 'editor', projectId: project.id });
  await expect.poll(() => [...editor.conn.db.myInvitations.iter()].length).toBe(1);
  const invitation = [...editor.conn.db.myInvitations.iter()][0];
  await expect(outsider.conn.reducers.acceptInvitation({ invitationId: invitation.id })).rejects.toThrow('Access denied');
  await editor.conn.reducers.acceptInvitation({ invitationId: invitation.id });
  await expect(editor.conn.reducers.acceptInvitation({ invitationId: invitation.id })).rejects.toThrow();
  await expect.poll(() => [...editor.conn.db.visibleProjects.iter()].length).toBe(1);
  await editor.conn.reducers.renameProject({ projectId: project.id, name: 'Edited together' });
  await expect.poll(() => [...owner.conn.db.visibleProjects.iter()].find(row => row.id === project.id)?.name).toBe('Edited together');
  await owner.conn.reducers.inviteMember({ organizationId: org.id, email: 'viewer@example.test', role: 'member', projectRole: 'viewer', projectId: project.id });
  await expect.poll(() => [...viewer.conn.db.myInvitations.iter()].length).toBe(1);
  await viewer.conn.reducers.acceptInvitation({ invitationId: [...viewer.conn.db.myInvitations.iter()][0].id });
  await expect.poll(() => [...viewer.conn.db.visibleProjects.iter()].length).toBe(1);
  await expect(viewer.conn.reducers.renameProject({ projectId: project.id, name: 'Forbidden' })).rejects.toThrow('Access denied');
  await expect(editor.conn.reducers.setMemberRole({ organizationId: org.id, member: [...editor.conn.db.myProfile.iter()][0].identity, role: 'admin' })).rejects.toThrow('Access denied');
  await owner.conn.reducers.inviteMember({ organizationId: org.id, email: 'outsider@example.test', role: 'member', projectRole: '' });
  await expect.poll(() => [...outsider.conn.db.myInvitations.iter()].length).toBe(1);
  const revoked = [...outsider.conn.db.myInvitations.iter()][0];
  await owner.conn.reducers.revokeInvitation({ invitationId: revoked.id });
  await expect.poll(() => [...outsider.conn.db.myInvitations.iter()].length).toBe(0);
  await expect(outsider.conn.reducers.acceptInvitation({ invitationId: revoked.id })).rejects.toThrow();
  expect([...outsider.conn.db.visibleProjects.iter()]).toHaveLength(0);
  expect((await sql(outsiderToken, 'SELECT * FROM workspace_project')).ok).toBe(false);
  const scoped = await sql(outsiderToken, 'SELECT * FROM visible_projects');
  expect(scoped.ok).toBe(true);
  expect(JSON.stringify(await scoped.json())).not.toContain('Edited together');
  const initialGuidance = { projectId: project.id, expectedRevision: 0n, audience: 'Library users', technical: '', style: 'Quiet', colors: '', typography: '', spacing: '', accessibility: 'Keyboard access', guidance: 'No card shadows' };
  await editor.conn.reducers.saveGuidance(initialGuidance);
  await expect.poll(() => [...viewer.conn.db.visibleGuidance.iter()][0]?.audience).toBe('Library users');
  await expect(viewer.conn.reducers.saveGuidance({ ...initialGuidance, expectedRevision: 1n })).rejects.toThrow('Project edit access');
  await expect(outsider.conn.reducers.saveGuidance(initialGuidance)).rejects.toThrow('Project edit access');
  await expect(owner.conn.reducers.saveGuidance(initialGuidance)).rejects.toThrow('Guidance changed');
  await expect(owner.conn.reducers.saveGuidance({ ...initialGuidance, expectedRevision: 1n, audience: 'x'.repeat(4001) })).rejects.toThrow('4000');
  await expect(owner.conn.reducers.saveGuidance({ ...initialGuidance, expectedRevision: 1n, guidance: '\u0001' })).rejects.toThrow('4000');
  expect((await sql(outsiderToken, 'SELECT * FROM project_guidance')).ok).toBe(false);
  expect(JSON.stringify(await (await sql(outsiderToken, 'SELECT * FROM visible_guidance')).json())).not.toContain('No card shadows');
  const editorIdentity = [...editor.conn.db.myProfile.iter()][0].identity;
  await owner.conn.reducers.setProjectAccess({ projectId: project.id, member: editorIdentity, role: '' });
  await expect.poll(() => [...editor.conn.db.visibleProjects.iter()].length).toBe(0);
  expect([...editor.conn.db.myOrganizations.iter()]).toHaveLength(1);
  await expect.poll(() => [...editor.conn.db.visibleGuidance.iter()].length).toBe(0);
  await expect(editor.conn.reducers.renameProject({ projectId: project.id, name: 'Still forbidden' })).rejects.toThrow('Access denied');
  await owner.conn.reducers.setProjectAccess({ projectId: project.id, member: editorIdentity, role: 'editor' });
  await owner.conn.reducers.removeMember({ organizationId: org.id, member: editorIdentity });
  await expect.poll(() => [...editor.conn.db.myOrganizations.iter()].length).toBe(0);
  await expect.poll(() => [...editor.conn.db.visibleProjects.iter()].length).toBe(0);
  await expect(owner.conn.reducers.removeMember({ organizationId: org.id, member: [...owner.conn.db.myProfile.iter()][0].identity })).rejects.toThrow();
  await owner.conn.reducers.createOrganization({ name: 'Team Two' });
  await expect.poll(() => [...owner.conn.db.myOrganizations.iter()].length).toBe(2);
  const second = [...owner.conn.db.myOrganizations.iter()].find(row => row.name === 'Team Two')!;
  await owner.conn.reducers.createProject({ organizationId: second.id, name: 'Second org library', outputStack: 'blazor-bootstrap' });
});

test('legacy transfer proves old-token possession, is atomic, and cannot be replayed', async () => {
  const owner = await connect(ownerToken);
  const old = await connect(legacyToken, false);
  const outsider = await connect(outsiderToken);
  await owner.conn.reducers.createOrganization({ name: 'Imported Team' });
  await expect.poll(() => [...owner.conn.db.myOrganizations.iter()].some(row => row.name === 'Imported Team')).toBe(true);
  const org = [...owner.conn.db.myOrganizations.iter()].find(row => row.name === 'Imported Team')!;
  await expect(owner.conn.reducers.importLegacyProject({ organizationId: org.id, legacyId })).rejects.toThrow();
  await expect(outsider.conn.reducers.prepareLegacyTransfer({ destination: [...owner.conn.db.myProfile.iter()][0].identity })).rejects.toThrow();
  await old.conn.reducers.prepareLegacyTransfer({ destination: [...owner.conn.db.myProfile.iter()][0].identity });
  await owner.conn.reducers.importLegacyProject({ organizationId: org.id, legacyId });
  await expect.poll(() => [...owner.conn.db.visibleProjects.iter()].some(row => row.name === 'Preserved legacy project')).toBe(true);
  await expect.poll(() => [...old.conn.db.myProject.iter()].length).toBe(0);
  await expect(owner.conn.reducers.importLegacyProject({ organizationId: org.id, legacyId })).rejects.toThrow();
  await stopServer(); await startServer();
  const returning = await connect(ownerToken);
  expect([...returning.conn.db.visibleProjects.iter()].some(row => row.name === 'Preserved legacy project')).toBe(true);
});

test('browser sessions share edits, enforce viewer UI and clear access on membership removal', async ({ browser }) => {
  const tokenA = await makeToken('browser-owner@example.test', 'Browser Owner');
  const tokenB = await makeToken('browser-editor@example.test', 'Browser Editor');
  const contextA = await browser.newContext();
  const contextB = await browser.newContext();
  await seedBrowser(contextA, tokenA); await seedBrowser(contextB, tokenB);
  const a = await contextA.newPage(); const b = await contextB.newPage();
  await a.goto('/'); await b.goto('/');
  await a.getByRole('tab', { name: 'Organization', exact: true }).click();
  await a.getByLabel('New organization name').fill('Browser Team');
  await a.getByRole('button', { name: 'Create organization', exact: true }).click();
  await a.getByRole('tab', { name: 'Projects', exact: true }).click();
  await a.getByLabel('Share through organization').selectOption({ label: 'Browser Team' });
  await a.getByLabel('Project name', { exact: true }).fill('Browser shared library');
  await a.getByRole('button', { name: 'Create project', exact: true }).click();
  await expect(a.getByTestId('project-name')).toHaveText('Browser shared library');
  await a.getByRole('tab', { name: 'Organization', exact: true }).click();
  await a.getByLabel('Invite email').fill('browser-editor@example.test');
  await a.getByLabel('Initial project access').selectOption('editor');
  await a.getByRole('button', { name: 'Create invitation' }).click();
  await b.getByRole('tab', { name: 'Invitations', exact: false }).click();
  await b.getByRole('button', { name: 'Accept invitation to Browser Team' }).click();
  await expect(b.getByTestId('project-name')).toHaveText('Browser shared library');
  await b.getByRole('tab', { name: 'Projects', exact: true }).click();
  await b.getByLabel('New project name').fill('Browser live edit');
  await b.getByRole('button', { name: 'Rename project' }).click();
  await expect(a.getByTestId('project-name')).toHaveText('Browser live edit');
  await b.reload();
  await expect(b.getByTestId('project-name')).toHaveText('Browser live edit');
  await a.getByRole('tab', { name: 'Sharing', exact: true }).click();
  await a.getByLabel('Project access for Browser Editor').selectOption('viewer');
  await expect(b.getByLabel('New project name')).toHaveCount(0);
  await expect(b.getByTestId('project-name')).toHaveText('Browser live edit');
  await a.getByRole('tab', { name: 'Organization', exact: true }).click();
  await a.getByRole('button', { name: 'Remove Browser Editor', exact: true }).click();
  await expect(b.getByTestId('project-name')).toHaveCount(0);
  await b.getByRole('tab', { name: 'Organization', exact: true }).click();
  await expect(b.getByText('No organizations yet. Create one or accept an invitation.')).toBeVisible();
  await a.getByRole('tab', { name: 'Organization', exact: true }).click();
  await a.getByLabel('New organization name').fill('Browser Second Team');
  await a.getByRole('button', { name: 'Create organization', exact: true }).click();
  await a.getByLabel('Active organization').selectOption({ label: 'Browser Second Team' });
  await a.getByRole('tab', { name: 'Projects', exact: true }).click();
  await a.getByLabel('Project name', { exact: true }).fill('Browser second project');
  await a.getByLabel('Technology starting point').selectOption('blazor-bootstrap');
  await a.getByLabel('Share through organization').selectOption({ label: 'Browser Second Team' });
  await a.getByRole('button', { name: 'Create project', exact: true }).click();
  await expect(a.getByTestId('project-name')).toHaveText('Browser second project');
  await a.getByLabel('Active project').selectOption({ label: 'Browser live edit' });
  await expect(a.getByTestId('project-name')).toHaveText('Browser live edit');
  await contextA.close(); await contextB.close();
});

test('refresh keeps the same identity beyond original expiry and tab credentials do not enter local storage', async ({ browser }) => {
  const context = await browser.newContext();
  const claims = JSON.parse(Buffer.from(ownerToken.split('.')[1], 'base64url').toString());
  const oldExpiry = Math.floor(Date.now() / 1000) + 5;
  await seedBrowser(context, signed({ ...claims, exp: oldExpiry }), 'isolated-test-refresh', Math.floor(Date.now() / 1000) + 3600);
  let refreshes = 0;
  await context.route('https://auth.spacetimedb.com/**', route => {
    if (route.request().url().includes('.well-known')) return route.fulfill({ json: {
      issuer: authority, authorization_endpoint: authority + '/authorize', token_endpoint: authority + '/token',
      jwks_uri: authority + '/jwks',
    } });
    const form = new URLSearchParams(route.request().postData() ?? '');
    if (form.get('grant_type') !== 'refresh_token') return route.abort();
    refreshes++;
    return route.fulfill({ json: { id_token: ownerToken, access_token: 'renewed-test-access',
      refresh_token: 'rotated-test-refresh', token_type: 'Bearer', expires_in: 3600 } });
  });
  const page = await context.newPage();
  await page.goto('/');
  await expect.poll(() => refreshes).toBe(1);
  await expect(page.getByTestId('profile-email')).toHaveText('owner@example.test');
  const observer = await connect(viewerToken);
  // Cross the old credential deadline, rather than only checking a successful request.
  await expect.poll(() => Date.now() > oldExpiry * 1000, { timeout: 10000 }).toBe(true);
  await expect(page.getByTestId('profile-email')).toHaveText('owner@example.test');
  await page.getByLabel('Active project', { exact: true }).selectOption({ label: 'Edited together' });
  await page.getByRole('tab', { name: 'Design guidance', exact: true }).click();
  await page.getByLabel('Audience and component needs', { exact: true }).fill('Saved after ID-token renewal');
  await expect(page.getByTestId('guidance-status')).toHaveText('Guidance saved');
  await expect.poll(() => [...observer.conn.db.visibleGuidance.iter()].some(row => row.audience === 'Saved after ID-token renewal')).toBe(true);
  await page.reload();
  await expect(page.getByTestId('profile-email')).toHaveText('owner@example.test');
  expect(await page.evaluate(() => Object.keys(localStorage).some(key => key.startsWith('oidc.')))).toBe(false);
  await context.close();
  const fresh = await browser.newContext();
  const freshPage = await fresh.newPage();
  await freshPage.goto('/');
  await expect(freshPage.getByRole('button', { name: 'Sign in', exact: true })).toBeVisible();
  await fresh.close();
});

test('browser sign-out clears data; unauthenticated screen and connection failures are clear', async ({ browser, page }) => {
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Sign in', exact: true })).toBeVisible();
  const context = await browser.newContext();
  await seedBrowser(context, ownerToken);
  await context.route('https://auth.spacetimedb.com/**', route => {
    if (route.request().url().includes('.well-known')) return route.fulfill({ json: {
      issuer: authority, authorization_endpoint: authority + '/authorize', token_endpoint: authority + '/token',
      jwks_uri: authority + '/jwks', end_session_endpoint: authority + '/logout',
    } });
    return route.fulfill({ status: 302, headers: { location: 'http://127.0.0.1:4173/' } });
  });
  const signedIn = await context.newPage();
  await signedIn.goto('/');
  await expect(signedIn.getByTestId('profile-email')).toHaveText('owner@example.test');
  await stopServer();
  await expect(signedIn.getByRole('alert')).toContainText('Cannot load the workspace');
  await startServer();
  await signedIn.getByRole('button', { name: 'Retry connection' }).click();
  await expect(signedIn.getByTestId('profile-email')).toHaveText('owner@example.test');
  // Disable fixture reseeding after navigation; sign-out must leave storage empty.
  await signedIn.getByRole('button', { name: 'Sign out', exact: true }).click();
  await expect(signedIn.getByRole('button', { name: 'Sign in', exact: true })).toBeVisible();
  await expect(signedIn.getByTestId('profile-email')).toHaveCount(0);
  await context.close();
});


test('guidance autosaves, shares live, preserves conflicts and failures, and survives restart', async ({ browser }) => {
  const owner = await connect(ownerToken);
  await owner.conn.reducers.createOrganization({ name: 'Guidance Team' });
  await expect.poll(() => [...owner.conn.db.myOrganizations.iter()].some(org => org.name === 'Guidance Team')).toBe(true);
  const org = [...owner.conn.db.myOrganizations.iter()].find(org => org.name === 'Guidance Team')!;
  await owner.conn.reducers.createProject({ organizationId: org.id, name: 'Guided library', outputStack: 'blazor-bootstrap' });
  await expect.poll(() => [...owner.conn.db.visibleProjects.iter()].some(row => row.organizationId === org.id)).toBe(true);
  const project = [...owner.conn.db.visibleProjects.iter()].find(row => row.organizationId === org.id)!;
  const context = await browser.newContext();
  await seedBrowser(context, ownerToken);
  const a = await context.newPage(); const b = await context.newPage();
  for (const page of [a, b]) {
    await page.goto('/');
    await page.getByLabel('Active project').selectOption({ label: 'Guided library' });
  }
  await a.getByRole('tab', { name: 'Design guidance', exact: true }).click();
  await a.getByLabel('Audience and component needs', { exact: true }).fill('Design system maintainers');
  await expect(a.getByTestId('guidance-status')).toHaveText('Guidance saved');
  await expect(b.getByLabel('Audience and component needs', { exact: true })).toHaveValue('Design system maintainers');
  await a.reload();
  await a.getByLabel('Active project').selectOption({ label: 'Guided library' });
  await expect(a.getByLabel('Audience and component needs', { exact: true })).toHaveValue('Design system maintainers');
  // Hold A's debounce while another editor saves, then observe conflict without overwriting A.
  await a.clock.install(); await a.clock.pauseAt(new Date());
  await a.getByRole('tab', { name: 'Design guidance', exact: true }).click();
  await a.getByLabel('Visual style', { exact: true }).fill('My unsaved style');
  const existing = [...owner.conn.db.visibleGuidance.iter()].find(row => row.projectId === project.id)!;
  const { revision, ...values } = existing;
  await owner.conn.reducers.saveGuidance({ ...values, expectedRevision: revision, style: 'Another editor style' });
  await expect(a.getByTestId('guidance-status')).toContainText('Conflicting changes');
  await expect(a.getByLabel('Visual style', { exact: true })).toHaveValue('My unsaved style');
  await a.getByRole('button', { name: 'Discard my draft and load latest' }).click();
  await a.clock.resume();
  await expect(a.getByLabel('Visual style', { exact: true })).toHaveValue('Another editor style');
  await a.getByLabel('Project design guidance', { exact: true }).fill('Invalid\u0001text');
  await expect(a.getByRole('alert')).toContainText('Each guidance answer must be at most 4000 characters');
  await a.reload();
  await a.getByLabel('Active project').selectOption({ label: 'Guided library' });
  await expect(a.getByLabel('Project design guidance', { exact: true })).toHaveValue('Invalid\u0001text');
  await a.getByRole('tab', { name: 'Design guidance', exact: true }).click();
  await a.getByLabel('Project design guidance', { exact: true }).fill('No card shadows');
  await expect(a.getByTestId('guidance-status')).toHaveText('Guidance saved');
  await expect(b.getByLabel('Project design guidance', { exact: true })).toHaveValue('No card shadows');
  // A viewer sees saved text but cannot edit it.
  await owner.conn.reducers.inviteMember({ organizationId: org.id, email: 'viewer@example.test', role: 'member', projectRole: 'viewer', projectId: project.id });
  const viewer = await connect(viewerToken);
  await expect.poll(() => [...viewer.conn.db.myInvitations.iter()].some(row => row.organizationId === org.id)).toBe(true);
  await viewer.conn.reducers.acceptInvitation({ invitationId: [...viewer.conn.db.myInvitations.iter()].find(row => row.organizationId === org.id)!.id });
  const viewerContext = await browser.newContext(); await seedBrowser(viewerContext, viewerToken);
  const v = await viewerContext.newPage(); await v.goto('/');
  await v.getByLabel('Active project').selectOption({ label: 'Guided library' });
  await expect(v.getByLabel('Project design guidance', { exact: true })).toHaveValue('No card shadows');
  await expect(v.getByLabel('Project design guidance', { exact: true })).toHaveAttribute('readonly', '');
  await context.close(); await viewerContext.close();
  await stopServer(); await startServer();
  const restored = await connect(ownerToken);
  expect([...restored.conn.db.visibleGuidance.iter()].find(row => row.projectId === project.id)?.guidance).toBe('No card shadows');
});


test('org-only schema migration preserves project IDs, grants, guidance and ownership', async () => {
  const owner = await connect(migratedOwnerToken);
  const member = await connect(migratedMemberToken);
  const row = [...owner.conn.db.visibleProjects.iter()].find(row => row.id === migratedProjectId)!;
  expect(row.name).toBe('Existing organization library');
  expect(row.ownership).toBe('organization');
  expect(row.framework).toBe('Blazor');
  expect(row.owner.isEqual([...owner.conn.db.myProfile.iter()][0].identity)).toBe(true);
  expect([...member.conn.db.visibleProjects.iter()].find(row => row.id === migratedProjectId)?.permission).toBe('viewer');
  expect([...member.conn.db.visibleGuidance.iter()].find(row => row.projectId === migratedProjectId)?.guidance).toBe('Preserved design rules');
  await owner.conn.reducers.createProjectWithDetails({ organizationId: row.organizationId, name: 'Second project in migrated org', framework: 'Angular', language: 'TypeScript', styling: 'CSS', libraries: 'Material', versions: '' });
  await expect.poll(() => [...owner.conn.db.visibleProjects.iter()].length).toBe(2);
  expect([...member.conn.db.visibleProjects.iter()]).toHaveLength(1);
});


test('personal projects use explicit grants, isolate details and remove grants on departure', async () => {
  const admin = await connect(await makeToken('new-org-admin@example.test', 'New Org Admin'));
  const personal = await connect(await makeToken('personal@example.test', 'Personal Owner'));
  const peer = await connect(await makeToken('peer@example.test', 'Peer'));
  const personalId = [...personal.conn.db.myProfile.iter()][0].identity;
  const peerId = [...peer.conn.db.myProfile.iter()][0].identity;
  const details = { framework: 'Angular', language: 'TypeScript', styling: 'CSS', libraries: 'Any custom library', versions: 'Requested, not verified' };
  await personal.conn.reducers.createProjectWithDetails({ name: 'Private Angular', organizationId: 0n, ...details });
  await personal.conn.reducers.createProjectWithDetails({ name: 'Private React MUI', organizationId: 0n, ...details, framework: 'React', libraries: 'MUI' });
  await expect.poll(() => [...personal.conn.db.visibleProjects.iter()].length).toBe(2);
  const privateProject = [...personal.conn.db.visibleProjects.iter()].find(row => row.name === 'Private Angular')!;
  expect(privateProject.organizationId).toBe(0n);
  expect(privateProject.framework).toBe('Angular');
  expect([...admin.conn.db.visibleProjects.iter()]).toHaveLength(0);
  await expect(personal.conn.reducers.createProjectWithDetails({ name: 'Bad', organizationId: 0n, ...details, libraries: 'x'.repeat(1001) })).rejects.toThrow('1000');
  await personal.conn.reducers.updateProjectDetails({ projectId: privateProject.id, expectedRevision: 0n, ...details, versions: 'Angular requested version' });
  await expect(personal.conn.reducers.updateProjectDetails({ projectId: privateProject.id, expectedRevision: 0n, ...details })).rejects.toThrow('changed');
  await expect(admin.conn.reducers.updateProjectDetails({ projectId: privateProject.id, expectedRevision: 1n, ...details })).rejects.toThrow('Access denied');
  await admin.conn.reducers.createOrganization({ name: 'Explicit Sharing Team' });
  await expect.poll(() => [...admin.conn.db.myOrganizations.iter()].length).toBe(1);
  const org = [...admin.conn.db.myOrganizations.iter()][0];
  async function join(session: Session, address: string) {
    await admin.conn.reducers.inviteMember({ organizationId: org.id, email: address, role: 'member', projectRole: '' });
    await expect.poll(() => [...session.conn.db.myInvitations.iter()].length).toBe(1);
    await session.conn.reducers.acceptInvitation({ invitationId: [...session.conn.db.myInvitations.iter()][0].id });
  }
  await join(personal, 'personal@example.test'); await join(peer, 'peer@example.test');
  await personal.conn.reducers.setProjectOrganization({ projectId: privateProject.id, organizationId: org.id });
  await expect.poll(() => [...personal.conn.db.visibleProjects.iter()].find(row => row.id === privateProject.id)?.organizationId).toBe(org.id);
  expect([...admin.conn.db.visibleProjects.iter()]).toHaveLength(0);
  expect([...peer.conn.db.visibleProjects.iter()]).toHaveLength(0);
  await expect(admin.conn.reducers.setProjectAccess({ projectId: privateProject.id, member: peerId, role: 'editor' })).rejects.toThrow('Access denied');
  await personal.conn.reducers.setProjectAccess({ projectId: privateProject.id, member: peerId, role: 'editor' });
  await expect.poll(() => [...peer.conn.db.visibleProjects.iter()].length).toBe(1);
  const guidance = { projectId: privateProject.id, expectedRevision: 0n, audience: 'Private project audience', technical: '', style: '', colors: '', typography: '', spacing: '', accessibility: '', guidance: 'Only shared deliberately' };
  await peer.conn.reducers.saveGuidance(guidance);
  await expect.poll(() => [...personal.conn.db.visibleGuidance.iter()][0]?.guidance).toBe('Only shared deliberately');
  expect([...admin.conn.db.visibleGuidance.iter()]).toHaveLength(0);
  await peer.conn.reducers.leaveOrganization({ organizationId: org.id });
  await expect.poll(() => [...peer.conn.db.visibleProjects.iter()].length).toBe(0);
  await expect.poll(() => [...peer.conn.db.visibleGuidance.iter()].length).toBe(0);
  await join(peer, 'peer@example.test');
  expect([...peer.conn.db.visibleProjects.iter()]).toHaveLength(0);
  await personal.conn.reducers.setProjectAccess({ projectId: privateProject.id, member: peerId, role: 'viewer' });
  await expect.poll(() => [...peer.conn.db.visibleProjects.iter()].length).toBe(1);
  await expect(peer.conn.reducers.renameProject({ projectId: privateProject.id, name: 'Forbidden' })).rejects.toThrow('Access denied');
  await personal.conn.reducers.setProjectOrganization({ projectId: privateProject.id, organizationId: 0n });
  await expect.poll(() => [...peer.conn.db.visibleProjects.iter()].length).toBe(0);
  await personal.conn.reducers.setProjectOrganization({ projectId: privateProject.id, organizationId: org.id });
  expect([...peer.conn.db.visibleProjects.iter()]).toHaveLength(0);
  await personal.conn.reducers.setProjectAccess({ projectId: privateProject.id, member: peerId, role: 'editor' });
  await admin.conn.reducers.removeMember({ organizationId: org.id, member: personalId });
  await expect.poll(() => [...peer.conn.db.visibleProjects.iter()].length).toBe(0);
  await expect.poll(() => [...personal.conn.db.visibleProjects.iter()].find(row => row.id === privateProject.id)?.organizationId).toBe(0n);
  expect([...personal.conn.db.visibleProjects.iter()]).toHaveLength(2);
  expect([...personal.conn.db.visibleGuidance.iter()][0].guidance).toBe('Only shared deliberately');
  await join(personal, 'personal@example.test');
  expect([...peer.conn.db.visibleProjects.iter()]).toHaveLength(0);
  const scoped = await sql(admin.token, 'SELECT * FROM visible_projects');
  expect(JSON.stringify(await scoped.json())).not.toContain('Private Angular');
  expect((await sql(peer.token, 'SELECT * FROM workspace_project')).ok).toBe(false);
});

test('browser creates and switches private projects with independent guidance and arbitrary technology details', async ({ browser }) => {
  const context = await browser.newContext();
  await seedBrowser(context, await makeToken('private-browser@example.test', 'Private Browser'));
  const page = await context.newPage();
  let browserErrorCount = 0;
  page.on('pageerror', () => browserErrorCount++);
  page.on('console', message => { if (message.type() === 'error') browserErrorCount++; });
  await page.goto('/');
  await page.getByRole('tab', { name: 'Projects', exact: true }).click();
  await page.getByLabel('Project name', { exact: true }).fill('My Angular library');
  await page.getByLabel('Requested Framework(s)', { exact: true }).fill('Angular');
  await page.getByLabel('Requested Language(s)', { exact: true }).fill('TypeScript');
  await page.getByLabel('Requested Libraries', { exact: true }).fill('Custom library');
  await page.getByRole('button', { name: 'Create project', exact: true }).click();
  await expect(page.getByTestId('project-name')).toHaveText('My Angular library');
  await expect(page.getByLabel('Edit Framework(s)', { exact: true })).toHaveValue('Angular');
  await page.getByRole('tab', { name: 'Design guidance', exact: true }).click();
  await page.getByLabel('Project design guidance', { exact: true }).fill('Angular-only guidance');
  await expect(page.getByTestId('guidance-status')).toHaveText('Guidance saved');
  await page.getByRole('tab', { name: 'Projects', exact: true }).click();
  await page.getByLabel('Project name', { exact: true }).fill('My MUI library');
  await page.getByLabel('Requested Framework(s)', { exact: true }).fill('React');
  await page.getByLabel('Requested Libraries', { exact: true }).fill('MUI');
  await page.getByRole('button', { name: 'Create project', exact: true }).click();
  await expect(page.getByTestId('project-name')).toHaveText('My MUI library');
  await expect(page.getByLabel('Project design guidance', { exact: true })).toHaveValue('');
  await page.getByRole('tab', { name: 'Design guidance', exact: true }).click();
  await page.getByLabel('Project design guidance', { exact: true }).fill('MUI-only guidance');
  await expect(page.getByTestId('guidance-status')).toHaveText('Guidance saved');
  await page.getByRole('tab', { name: 'Technologies', exact: true }).click();
  await page.getByLabel('Edit Versions and compatibility notes', { exact: true }).fill('Versions remain to be validated');
  await page.getByRole('button', { name: 'Save project details', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Save project details', exact: true })).toBeDisabled();
  await page.getByLabel('Active project', { exact: true }).selectOption({ label: 'My Angular library' });
  await expect(page.getByLabel('Project design guidance', { exact: true })).toHaveValue('Angular-only guidance');
  await page.reload();
  await expect(page.getByTestId('project-name')).toHaveText('My Angular library');
  await page.getByLabel('Active project', { exact: true }).selectOption({ label: 'My MUI library' });
  await expect(page.getByLabel('Project design guidance', { exact: true })).toHaveValue('MUI-only guidance');
  await expect(page.getByLabel('Edit Libraries', { exact: true })).toHaveValue('MUI');
  await expect(page.getByLabel('Edit Versions and compatibility notes', { exact: true })).toHaveValue('Versions remain to be validated');
  await page.getByRole('tab', { name: 'Technologies', exact: true }).click();
  await page.getByLabel('Edit Libraries', { exact: true }).fill('Unsaved tab draft');
  await page.getByRole('tab', { name: 'Design guidance', exact: true }).click();
  await expect(page.getByLabel('Edit Libraries', { exact: true })).toBeHidden();
  await expect(page.getByRole('tabpanel')).toHaveCount(1);
  await page.getByRole('tab', { name: 'Design guidance', exact: true }).focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('tab', { name: 'Technologies', exact: true })).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByLabel('Edit Libraries', { exact: true })).toHaveValue('Unsaved tab draft');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('tab', { name: 'Design guidance', exact: true }).click();
  await expect(page.getByLabel('Project design guidance', { exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  expect(browserErrorCount, 'Project switching has no browser runtime or React errors').toBe(0);
  await context.close();
});
