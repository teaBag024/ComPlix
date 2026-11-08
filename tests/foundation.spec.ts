import { test, expect, type BrowserContext } from '@playwright/test';
import { spawn, spawnSync, type ChildProcess } from 'node:child_process';
import { mkdirSync, writeFileSync, readFileSync, cpSync } from 'node:fs';
import path from 'node:path';
import { randomUUID, sign } from 'node:crypto';
import { DbConnection, tables } from '../src/module_bindings';
import { ensureLocalKeys } from '../scripts/local-keys.mjs';

const backendPort = Number(process.env.COMPLIX_TEST_BACKEND_PORT ?? 3100);
const uri = `http://127.0.0.1:${backendPort}`;
const frontendOrigin = `http://127.0.0.1:${process.env.COMPLIX_TEST_FRONTEND_PORT ?? 4173}`;
const database = process.env.COMPLIX_TEST_DATABASE ?? 'complix-test';
const audience = 'complix-test-client';
const authority = 'https://auth.spacetimedb.com/oidc';
const publicClient = 'client_034te16H37cuA4goFM0pev';
const runDirectory = path.resolve('.local/e2e', randomUUID());
const keys = ensureLocalKeys(path.join(runDirectory, 'keys'));
const clients: DbConnection[] = [];
let server: ChildProcess;
const nvidiaTestModule = path.join(runDirectory, 'nvidia-module');

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
    'start', '--listen-addr', `127.0.0.1:${backendPort}`, '--data-dir', path.join(runDirectory, 'data'),
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
function publish(modulePath: string, auth = false, generationMode = 'mock') {
  const result = spawnSync(path.resolve('.tools/spacetime/spacetimedb-cli.exe'), [
    '--root-dir', path.join(runDirectory, 'cli'), 'publish', '--server', uri, '--module-path', auth && modulePath === path.resolve('spacetimedb') ? nvidiaTestModule : modulePath,
    '--delete-data=never', '--break-clients', '--yes=skip-login', database,
  ], { stdio: 'pipe', encoding: 'utf8', timeout: 60000, windowsHide: true,
    env: { ...process.env, ...(auth ? { AUTH_ISSUER: 'localhost', AUTH_CLIENT_ID: audience, GENERATION_MODE: generationMode, NVIDIA_ENABLED: generationMode === 'disabled' ? 'false' : 'true', NVIDIA_API_KEY: ['disabled', 'missing-key'].includes(generationMode) ? '' : 'synthetic-operator-nvidia-credential', NVIDIA_MODEL: 'nvidia/nemotron-3.5-super-vl-120b-a12b', GEMINI_API_KEY: ['disabled', 'missing-key', 'missing-gemini'].includes(generationMode) ? '' : 'synthetic-operator-gemini-credential', GEMINI_MODEL: 'gemini-3.8-flash' } : {}) } });
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
            .subscribe(register ? [tables.myProfile, tables.myOrganizations, tables.visibleProjects, tables.organizationMembers, tables.myInvitations, tables.visibleGuidance, tables.managedProjectShares, tables.visibleReferences, tables.visibleGenerationJobs, tables.visibleComponentDrafts, tables.visibleComponents, tables.visibleComponentChat, tables.visibleStarterTasks, tables.visibleEditorInstructions, tables.generationSettings] : tables.myProject);
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
  // Functional tests use local font fallbacks, independent of external font-service access.
  await context.route('https://fonts.googleapis.com/**', route => route.fulfill({ status: 200, contentType: 'text/css', body: '' }));
  const profile = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString());
  await context.addInitScript(({ token, profile, key, refreshToken, accessExpiry }) => {
    if (sessionStorage.getItem('complix.test.seeded')) return;
    sessionStorage.setItem('complix.test.seeded', 'yes');
    sessionStorage.setItem(key, JSON.stringify({ id_token: token, access_token: 'local-test-access', token_type: 'Bearer',
      scope: 'openid profile email offline_access', refresh_token: refreshToken, profile, expires_at: accessExpiry ?? profile.exp }));
  }, { token, profile, refreshToken, accessExpiry, key: 'oidc.user:' + authority + ':' + publicClient });
}
async function openProjectPage(page: import('@playwright/test').Page, name: string, shared = false) {
  await page.getByRole('button', { name: 'ComPlix.', exact: true }).click();
  if (shared) await page.getByRole('button', { name: 'Shared projects', exact: true }).click();
  await page.getByRole('button', { name: 'Open project ' + name, exact: true }).click();
}

async function createBrowserComponent(page: import('@playwright/test').Page, name = 'Button') {
  await page.getByRole('button', { name: '+ New Component', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'New component', exact: true });
  await dialog.getByLabel('Component name', { exact: true }).fill(name);
  await dialog.getByRole('button', { name: 'Create component', exact: true }).click();
  await expect(dialog).not.toBeVisible();
  await expect(page.getByRole('heading', { name: 'Chat: ' + name, exact: true })).toBeVisible();
}

async function finishBrowserSetup(page: import('@playwright/test').Page) {
  await expect(page).toHaveURL(/\/projects\/\d+\/setup\/questionnaire$/);
  await page.getByLabel('Theme', { exact: true }).selectOption('Light');
  await page.getByRole('button', { name: 'Save and continue', exact: true }).click();
  await expect(page).toHaveURL(/\/setup\/references$/);
  await page.getByRole('button', { name: 'Continue to starter components', exact: true }).click();
  await page.getByRole('button', { name: 'Finish without starter components', exact: true }).click();
  await expect(page).toHaveURL(/\/projects\/\d+\/components$/);
}
/** A minimal one-page PDF whose text pdf.js can extract. */
function textPdf(text: string) {
  const stream = `BT /F1 16 Tf 20 100 Td (${text}) Tj ET`;
  const objects = ['<< /Type /Catalog /Pages 2 0 R >>', '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 420 144] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'];
  let out = '%PDF-1.4\n'; const offsets: number[] = [];
  objects.forEach((body, index) => { offsets.push(out.length); out += `${index + 1} 0 obj\n${body}\nendobj\n`; });
  const xref = out.length;
  out += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n` + offsets.map(offset => String(offset).padStart(10, '0') + ' 00000 n \n').join('')
    + `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(out, 'latin1');
}
async function expandProjectCreation(page: import('@playwright/test').Page) {
  await page.getByRole('button', { name: '+ Create project', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Create a project you own' })).toBeVisible();
}
async function sql(token: string, query: string) {
  return fetch(uri + '/v1/database/' + database + '/sql', {
    method: 'POST', headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'text/plain' }, body: query,
  });
}

test.beforeAll(async () => {
  // Instrument a separate ignored module copy. Released servers intentionally reject loopback HTTP.
  // Production source has no fixture switch or configurable provider endpoint.
  mkdirSync(path.join(nvidiaTestModule, 'src'), { recursive: true });
  cpSync('shared', path.join(runDirectory, 'shared'), { recursive: true });
  const fixtureBody = JSON.stringify({ choices: [{ finish_reason: 'stop', message: { content: JSON.stringify({ reply: 'I prepared a draft using your project guidance.', files: [{ path: 'Button.tsx', content: 'export function Button() { return <button>Draft only</button>; }' }, { path: 'README.md', content: '# Unverified draft' }] }) } }] });
  const transport = `((url: string, options: any) => {
    const body = JSON.parse(options.body);
    if (url.startsWith('https://generativelanguage.googleapis.com/')) {
      if (options.headers['x-goog-api-key'] !== 'synthetic-operator-gemini-credential' || options.body.includes('synthetic-operator-') || body.generationConfig.thinkingConfig.thinkingLevel !== 'LOW') throw new Error('Gemini fixture contract failed');
      const snapshot = JSON.parse(body.contents[0].parts[0].text);
      if (snapshot.editorInstruction?.text === 'Cancel instruction fixture' && body.contents.length > 1) {
        ctx.withTx(tx => {
          const record = tx.db.editorInstruction.id.find(BigInt(snapshot.editorInstruction.id))!;
          const job = tx.db.generationJob.id.find(record.jobId)!;
          tx.db.generationJob.id.update({ ...job, diagnostic: 'Unexpected Gemini call after cancellation' });
        });
      }
      if (snapshot.technologies?.name === 'Failing starter project' && snapshot.component?.name === 'KpiCard' && !snapshot.conversation?.some((message: any) => message.role === 'assistant')) return { status: 503, text: () => '' };
      if (snapshot.request === 'Generate using every project reference' && (!snapshot.references.some((reference: any) => reference.filename === 'design.md' && reference.content.includes('automatic-reference-marker')) || JSON.stringify(snapshot.references).includes('other-project-marker'))) throw new Error('Gemini fixture did not receive only the current project references');
      if ((snapshot.request === 'Token expiry fixture' || snapshot.editorInstruction?.text === 'Slow instruction fixture') && body.contents.length === 1) {
        // The local runtime has no procedure sleep. Test-only read transactions advance wall time.
        const until = ctx.withTx(tx => tx.timestamp.microsSinceUnixEpoch) + 3000000n;
        while (ctx.withTx(tx => tx.timestamp.microsSinceUnixEpoch) < until) { /* bounded three-second fixture delay */ }
      }
      const toolFailed = body.contents[2]?.parts[0]?.functionResponse?.response?.status === 'generation_incomplete';
      const text = toolFailed ? 'ComPlix could not complete this component change. Your saved draft is intact.' : snapshot.request === 'Explain the library' ? 'We can build a reusable Common foundation first.' : 'I prepared a draft using your project guidance.';
      const parts = snapshot.request === 'Explain the library' || body.toolConfig.functionCallingConfig.mode === 'NONE'
        ? [{ text }] : [{ functionCall: { name: 'generate_component_changes', id: 'fixture-call', args: { instructions: snapshot.request, filePaths: ['Button.tsx', 'README.md'] } }, thoughtSignature: 'opaque-fixture-signature' }];
      if (body.contents.length > 1 && body.contents[1].parts[0].thoughtSignature !== 'opaque-fixture-signature') throw new Error('Signature was lost');
      return { status: 200, text: () => JSON.stringify({ candidates: [{ finishReason: 'STOP', content: { role: 'model', parts } }] }) };
    }
    if (url !== 'https://integrate.api.nvidia.com/v1/chat/completions' || !options.headers.Authorization.startsWith('Bearer synthetic-') || body.max_tokens !== 4096 || body.stream !== false || body.reasoning_effort !== 'none' || !body.response_format.json_schema.strict || options.body.includes(options.headers.Authorization.slice(7))) throw new Error('Fixture request contract failed');
    const nvidiaSnapshot = JSON.parse(body.messages[1].content);
    if (nvidiaSnapshot.request === 'Generate using every project reference' && (!nvidiaSnapshot.references.some((reference: any) => reference.filename === 'design.md' && reference.content.includes('automatic-reference-marker')) || JSON.stringify(nvidiaSnapshot.references).includes('other-project-marker'))) throw new Error('Nemotron fixture did not receive only the current project references');
    if (nvidiaSnapshot.request === 'Generated marker fixture') return { status: 200, text: () => JSON.stringify({ choices: [{ finish_reason: 'stop', message: { content: JSON.stringify({ reply: 'Unverified generated marker', files: [{ path: 'Button.tsx', content: 'export const Button = () => <>{/* @complix Do not auto-run generated text */}<button>Draft only</button></>;' }, { path: 'README.md', content: '# Unverified' }] }) } }] }) };
    if (nvidiaSnapshot.editorInstruction?.text === 'Cancel instruction fixture') {
      ctx.withTx(tx => {
        const record = tx.db.editorInstruction.id.find(BigInt(nvidiaSnapshot.editorInstruction.id))!;
        const job = tx.db.generationJob.id.find(record.jobId)!;
        tx.db.generationJob.id.update({ ...job, state: 'cancelled', diagnostic: 'Synthetic NVIDIA cancellation' });
      });
    }
    if (nvidiaSnapshot.request === 'Draft race fixture' || nvidiaSnapshot.editorInstruction?.text === 'Edit race fixture') {
      const editing = nvidiaSnapshot.editing;
      ctx.withTx(tx => {
        const current = tx.db.componentDraft.jobId.find(BigInt(editing.jobId))!;
        tx.db.componentDraft.jobId.update({ ...current, revision: current.revision + 1n, files: current.files.map(file => ({ ...file, content: file.content + '\\n// concurrent edit' })) });
      });
    }
    if (JSON.parse(body.messages[1].content).request === 'Explain the library') return { status: 200, text: () => JSON.stringify({ choices: [{ finish_reason: 'stop', message: { content: JSON.stringify({ reply: 'We can build a reusable Common foundation first.', files: [] }) } }] }) };
    if (JSON.parse(body.messages[1].content).request === 'Truncated draft fixture') return { status: 200, text: () => JSON.stringify({ choices: [{ finish_reason: 'length' }] }) };
    return body.messages[1].content.includes('Rejected key fixture') ? { status: 401, text: () => options.headers.Authorization } : { status: 200, text: () => ${JSON.stringify(fixtureBody)} };
  })`;
  writeFileSync(path.join(nvidiaTestModule, 'src/index.ts'), readFileSync('spacetimedb/src/index.ts', 'utf8').replace('const payload = jwt.fullPayload;', 'const payload = { ...jwt.fullPayload, exp: jwt.fullPayload.fixture_exp ?? jwt.fullPayload.exp };').replace('ctx.http.fetch(endpoint,', transport + '(endpoint,').replace('ctx.http.fetch(url,', transport + '(url,').replace('ctx.timestamp.microsSinceUnixEpoch + 90000000n), jobId: inserted.id', "ctx.timestamp.microsSinceUnixEpoch + (args.request === 'Deadline reply fixture' ? 2000000n : 90000000n)), jobId: inserted.id").replaceAll('if (!claim.call) return {};', "if (!claim.call || ['Pending reply fixture', 'Deadline reply fixture'].includes(args.request)) return {};"));
  writeFileSync(path.join(nvidiaTestModule, 'package.json'), JSON.stringify({ type: 'module', dependencies: { spacetimedb: '2.14.1' } }));
  writeFileSync(path.join(nvidiaTestModule, 'tsconfig.json'), readFileSync('spacetimedb/tsconfig.json'));
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
test.afterAll(async () => { await stopServer(); });

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
  await owner.conn.reducers.renameOrganization({ organizationId: org.id, name: 'Renamed Team One' });
  await expect.poll(() => [...owner.conn.db.myOrganizations.iter()][0]?.name).toBe('Renamed Team One');
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
  const editorIdentity = [...editor.conn.db.myProfile.iter()][0].identity;
  await owner.conn.reducers.setMemberRole({ organizationId: org.id, member: editorIdentity, role: 'admin' });
  await editor.conn.reducers.renameOrganization({ organizationId: org.id, name: 'Admin Renamed Team' });
  await expect.poll(() => [...owner.conn.db.myOrganizations.iter()][0]?.name).toBe('Admin Renamed Team');
  await owner.conn.reducers.setMemberRole({ organizationId: org.id, member: editorIdentity, role: 'member' });
  await editor.conn.reducers.renameProject({ projectId: project.id, name: 'Edited together' });
  await expect.poll(() => [...owner.conn.db.visibleProjects.iter()].find(row => row.id === project.id)?.name).toBe('Edited together');
  await owner.conn.reducers.inviteMember({ organizationId: org.id, email: 'viewer@example.test', role: 'member', projectRole: 'viewer', projectId: project.id });
  await expect.poll(() => [...viewer.conn.db.myInvitations.iter()].length).toBe(1);
  await viewer.conn.reducers.acceptInvitation({ invitationId: [...viewer.conn.db.myInvitations.iter()][0].id });
  await expect.poll(() => [...viewer.conn.db.visibleProjects.iter()].length).toBe(1);
  await expect(viewer.conn.reducers.renameOrganization({ organizationId: org.id, name: 'Member Cannot Rename' })).rejects.toThrow('Access denied');
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
  const projectOnly = [...owner.conn.db.visibleProjects.iter()].find(row => row.name === 'Another project')!;
  await owner.conn.reducers.inviteProject({ projectId: projectOnly.id, email: 'outsider@example.test', projectRole: 'viewer' });
  await expect.poll(() => [...outsider.conn.db.myInvitations.iter()].some(row => row.projectId === projectOnly.id && row.organizationId === 0n && row.projectName === 'Another project')).toBe(true);
  expect([...owner.conn.db.myInvitations.iter()].some(row => row.projectId === projectOnly.id)).toBe(true);
  await outsider.conn.reducers.acceptInvitation({ invitationId: [...outsider.conn.db.myInvitations.iter()].find(row => row.projectId === projectOnly.id)!.id });
  await expect.poll(() => [...outsider.conn.db.visibleProjects.iter()].length).toBe(1);
  expect([...outsider.conn.db.visibleProjects.iter()][0].id).toBe(projectOnly.id);
  expect([...outsider.conn.db.myOrganizations.iter()]).toHaveLength(0);
  await expect(outsider.conn.reducers.renameProject({ projectId: projectOnly.id, name: 'Viewer cannot edit' })).rejects.toThrow('Access denied');
  await outsider.conn.reducers.createProjectWithDetails({ name: 'Private project manager', organizationId: 0n, framework: '', language: '', styling: '', libraries: '', versions: '' });
  const privateProject = [...outsider.conn.db.visibleProjects.iter()].find(row => row.name === 'Private project manager')!;
  await owner.conn.reducers.inviteMember({ organizationId: org.id, email: 'hidden@example.test', role: 'member', projectRole: '', projectId: privateProject.id });
  await expect.poll(() => [...owner.conn.db.myInvitations.iter()].some(row => row.email === 'hidden@example.test')).toBe(true);
  expect([...outsider.conn.db.myInvitations.iter()].some(row => row.email === 'hidden@example.test')).toBe(false);
  await owner.conn.reducers.revokeInvitation({ invitationId: [...owner.conn.db.myInvitations.iter()].find(row => row.email === 'hidden@example.test')!.id });
  await owner.conn.reducers.inviteMember({ organizationId: org.id, email: 'outsider@example.test', role: 'member', projectRole: 'editor', projectId: projectOnly.id });
  await expect.poll(() => [...outsider.conn.db.myInvitations.iter()].some(row => row.organizationId === org.id)).toBe(true);
  await outsider.conn.reducers.acceptInvitation({ invitationId: [...outsider.conn.db.myInvitations.iter()].find(row => row.organizationId === org.id)!.id });
  await expect.poll(() => [...outsider.conn.db.visibleProjects.iter()].find(row => row.id === projectOnly.id)?.permission).toBe('editor');
  expect([...outsider.conn.db.myOrganizations.iter()].some(row => row.id === org.id)).toBe(true);
  await owner.conn.reducers.removeMember({ organizationId: org.id, member: [...outsider.conn.db.myProfile.iter()][0].identity });
  await expect.poll(() => [...outsider.conn.db.visibleProjects.iter()].some(row => row.id === projectOnly.id)).toBe(false);
  expect([...outsider.conn.db.myOrganizations.iter()].some(row => row.id === org.id)).toBe(false);
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
  test.setTimeout(90000);
  const tokenA = await makeToken('browser-owner@example.test', 'Browser Owner');
  const tokenB = await makeToken('browser-editor@example.test', 'Browser Editor');
  const contextA = await browser.newContext();
  const contextB = await browser.newContext();
  await seedBrowser(contextA, tokenA); await seedBrowser(contextB, tokenB);
  const a = await contextA.newPage(); const b = await contextB.newPage();
  a.setDefaultTimeout(10000); b.setDefaultTimeout(10000);

  await Promise.all([a.goto('/', { waitUntil: 'commit' }), b.goto('/', { waitUntil: 'commit' })]);
  await Promise.all([
    a.getByRole('button', { name: 'Organizations', exact: true }).waitFor({ timeout: 30000 }),
    b.getByRole('button', { name: 'Organizations', exact: true }).waitFor({ timeout: 30000 }),
  ]);
  await a.getByRole('button', { name: 'Organizations', exact: true }).click();
  await expect(a).toHaveURL('/organizations');
  await a.getByRole('button', { name: '+ Create organization', exact: true }).click();
  await expect(a.getByRole('dialog', { name: 'Create organization' })).toBeVisible();
  await a.keyboard.press('Escape');
  await expect(a.getByRole('dialog', { name: 'Create organization' })).toBeHidden();
  await a.getByRole('button', { name: '+ Create organization', exact: true }).click();
  await a.getByLabel('Organization name').fill('Browser Team');
  await a.getByRole('button', { name: 'Create organization', exact: true }).click();
  await a.getByRole('button', { name: 'Projects', exact: true }).click();
  await expandProjectCreation(a);
  await a.getByLabel('Share through organization').selectOption({ label: 'Browser Team' });
  await a.getByLabel('Project name', { exact: true }).fill('Browser shared library');
  await a.getByRole('button', { name: 'Create project and start setup', exact: true }).click();
  await finishBrowserSetup(a);
  await expect(a.getByTestId('project-name')).toHaveText('Browser shared library');
  await a.getByRole('button', { name: 'Settings', exact: true }).click();
  await a.getByRole('button', { name: 'Manage sharing', exact: true }).click();
  await a.getByRole('button', { name: 'Invite to project', exact: true }).click();
  await expect(a.getByRole('dialog', { name: 'Invite someone to Browser shared library' })).toBeVisible();
  await a.getByLabel('Invite email').fill('project-only-browser@example.test');
  await a.getByLabel('Invitation access').selectOption('project');
  await a.getByRole('button', { name: 'Create invitation', exact: true }).click();
  await a.getByRole('button', { name: 'Invite to project', exact: true }).click();
  await a.getByLabel('Invite email').fill('project-plus-org-browser@example.test');
  await a.getByLabel('Invitation access').selectOption('organizationProject');
  await a.getByRole('button', { name: 'Create invitation', exact: true }).click();
  await a.getByRole('button', { name: 'All projects', exact: true }).click();
  await a.getByRole('button', { name: 'Invitations', exact: false }).click();
  await expect(a.getByText('Project: Browser shared library')).toBeVisible();
  await a.getByRole('button', { name: 'Revoke invitation for project-only-browser@example.test' }).click();
  await a.getByRole('button', { name: 'Organizations', exact: true }).click();
  await a.getByRole('button', { name: 'Manage Browser Team', exact: true }).click();
  await expect(a).toHaveURL(/\/organizations\/\d+$/);
  await a.getByRole('button', { name: 'Members & invitations', exact: true }).click();
  await expect(a.getByText('project-plus-org-browser@example.test', { exact: true })).toBeVisible();
  await a.getByRole('button', { name: 'Revoke invitation for project-plus-org-browser@example.test' }).click();
  await a.getByRole('button', { name: 'Settings', exact: true }).click();
  await a.getByRole('region', { name: 'Organization settings' }).getByLabel('Organization name').fill('Browser Team Renamed');
  await a.getByRole('button', { name: 'Save organization name' }).click();
  await expect(a.getByRole('heading', { name: 'Browser Team Renamed' })).toBeVisible();
  await a.getByRole('button', { name: 'Members & invitations', exact: true }).click();
  await a.getByRole('button', { name: 'Invite member', exact: true }).click();
  await expect(a.getByRole('dialog', { name: 'Invite a member to Browser Team Renamed' })).toBeVisible();
  await a.getByLabel('Invite email').fill('browser-editor@example.test');
  await a.getByLabel('Initial project access').selectOption('editor');
  await a.getByRole('button', { name: 'Create invitation' }).click();
  await a.getByRole('button', { name: 'Projects', exact: true }).click();
  await a.getByRole('button', { name: 'Open project Browser shared library', exact: true }).click();
  await b.getByRole('button', { name: 'Invitations', exact: false }).click();
  await expect(b).toHaveURL('/invitations');
  await b.getByRole('button', { name: 'Accept invitation to Browser Team Renamed' }).click();
  await b.getByRole('button', { name: 'Organizations', exact: true }).click();
  await b.getByRole('button', { name: 'Manage Browser Team Renamed', exact: true }).click();
  await b.getByRole('button', { name: 'Members & invitations', exact: true }).click();
  await expect(b.getByText('Only organization owners and admins can view and manage the member roster.')).toBeVisible();
  await b.getByRole('button', { name: 'Projects', exact: true }).click();
  // Organization Projects already lists the member's authorized shared projects.
  await b.getByRole('button', { name: 'Open project Browser shared library', exact: true }).click();
  await expect(b.getByTestId('project-name')).toHaveText('Browser shared library');
  await b.getByRole('button', { name: 'Settings', exact: true }).click();
  await b.getByLabel('New project name').fill('Browser live edit');
  await b.getByRole('button', { name: 'Rename project' }).click();
  await expect(a.getByTestId('project-name')).toHaveText('Browser live edit');
  await b.reload();
  // Reload retains the current project URL; it no longer returns to the project grid.
  await expect(b.getByTestId('project-name')).toHaveText('Browser live edit');
  await a.getByRole('button', { name: 'Settings', exact: true }).click();
  await a.getByRole('button', { name: 'Manage sharing', exact: true }).click();
  await a.getByLabel('Project access for Browser Editor').selectOption('viewer');
  await b.getByRole('button', { name: 'Settings', exact: true }).click();
  await expect(b.getByLabel('New project name')).toHaveCount(0);
  await expect(b.getByTestId('project-name')).toHaveText('Browser live edit');
  await a.getByRole('button', { name: 'All projects', exact: true }).click();
  await a.getByRole('button', { name: 'Organizations', exact: true }).click();
  await a.getByRole('button', { name: 'Manage Browser Team Renamed', exact: true }).click();
  await a.getByRole('button', { name: 'Members & invitations', exact: true }).click();
  await a.getByRole('button', { name: 'Remove Browser Editor', exact: true }).click();
  await expect(b.getByTestId('project-name')).toHaveCount(0);
  await b.getByRole('button', { name: 'Organizations', exact: true }).click();
  await expect(b.getByText('No organizations yet. Your private projects work without one. Create a shared space or accept an invitation.')).toBeVisible();
  await a.getByRole('button', { name: 'All organizations', exact: true }).click();
  await a.getByRole('button', { name: '+ Create organization', exact: true }).click();
  await a.getByLabel('Organization name').fill('Browser Second Team');
  await a.getByRole('button', { name: 'Create organization', exact: true }).click();
  await a.getByRole('button', { name: 'Projects', exact: true }).click();
  await expandProjectCreation(a);
  await a.getByLabel('Project name', { exact: true }).fill('Browser second project');
  await a.getByLabel('Framework', { exact: true }).selectOption('Blazor');
  await a.getByLabel('Share through organization').selectOption({ label: 'Browser Second Team' });
  await a.getByRole('button', { name: 'Create project and start setup', exact: true }).click();
  await finishBrowserSetup(a);
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
  const project = [...observer.conn.db.visibleProjects.iter()].find(row => row.name === 'Edited together')!;
  await page.goto(`/projects/${project.id}/guidance`);
  await page.getByRole('button', { name: 'Design guidance', exact: true }).click();
  await page.getByLabel('Audience and component needs', { exact: true }).fill('Saved after ID-token renewal');
  await expect(page.getByTestId('guidance-status')).toHaveText('Guidance saved');
  await expect.poll(() => [...observer.conn.db.visibleGuidance.iter()].some(row => row.audience === 'Saved after ID-token renewal')).toBe(true);
  await page.reload();
  await expect(page.getByTestId('project-name')).toHaveText('Edited together');
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
    return route.fulfill({ status: 302, headers: { location: frontendOrigin + '/' } });
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
    await openProjectPage(page, 'Guided library');
    await page.getByRole('button', { name: 'Design guidance', exact: true }).click();
  }
  await a.getByRole('button', { name: 'Design guidance', exact: true }).click();
  await a.getByLabel('Audience and component needs', { exact: true }).fill('Design system maintainers');
  await expect(a.getByTestId('guidance-status')).toHaveText('Guidance saved');
  await expect(b.getByLabel('Audience and component needs', { exact: true })).toHaveValue('Design system maintainers');
  await a.reload();
  await expect(a.getByLabel('Audience and component needs', { exact: true })).toHaveValue('Design system maintainers');
  // Hold A's debounce while another editor saves, then observe conflict without overwriting A.
  await a.clock.install(); await a.clock.pauseAt(new Date());
  await a.getByRole('button', { name: 'Design guidance', exact: true }).click();
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
  await expect(a.getByLabel('Project design guidance', { exact: true })).toHaveValue('Invalid\u0001text');
  await a.getByRole('button', { name: 'Design guidance', exact: true }).click();
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
  await openProjectPage(v, 'Guided library', true);
  await v.getByRole('button', { name: 'Design guidance', exact: true }).click();
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
  // Functional navigation checks use system font fallbacks; no external font service is required.
  await context.route('https://fonts.googleapis.com/**', route => route.fulfill({ status: 200, contentType: 'text/css', body: '' }));
  await seedBrowser(context, await makeToken('private-browser@example.test', 'Private Browser'));
  const page = await context.newPage();
  const browserErrors: string[] = [];
  page.on('pageerror', error => browserErrors.push(error.name + ': ' + error.message));
  page.on('console', message => { if (message.type() === 'error') browserErrors.push(message.text()); });
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.getByRole('button', { name: 'Switch to dark theme', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--bg-canvas').trim())).toBe('#0E1511');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.getByRole('button', { name: 'Switch to light theme', exact: true }).click();
  await page.getByRole('button', { name: 'Projects', exact: true }).click();
  await expandProjectCreation(page);
  await page.getByLabel('Project name', { exact: true }).fill('My Angular library');
  await page.getByLabel('Framework', { exact: true }).selectOption('Other');
  await page.getByLabel('Custom framework', { exact: true }).fill('Angular');
  await page.getByLabel('Custom language', { exact: true }).fill('TypeScript');
  await page.getByLabel('Other libraries', { exact: true }).fill('Custom library');
  await page.getByRole('button', { name: 'Create project and start setup', exact: true }).click();
  await finishBrowserSetup(page);
  await expect(page.getByTestId('project-name')).toHaveText('My Angular library');
  await page.goto(new URL(page.url()).pathname.replace(/\/components$/, ''));
  await expect(page).toHaveURL(/\/projects\/\d+\/components$/);
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await expect(page).toHaveURL(/\/projects\/\d+\/settings$/);
  await expect(page.locator('.technology-list')).toContainText('Angular');
  await expect(page.locator('.technology-list input')).toHaveCount(0);
  await page.getByRole('button', { name: 'Design guidance', exact: true }).click();
  await page.getByLabel('Project design guidance', { exact: true }).fill('Angular-only guidance');
  await expect(page.getByTestId('guidance-status')).toHaveText('Guidance saved');
  await page.getByRole('button', { name: 'All projects', exact: true }).click();
  await expandProjectCreation(page);
  await page.getByLabel('Project name', { exact: true }).fill('My MUI library');
  await page.getByLabel('Other libraries', { exact: true }).fill('MUI');
  await page.getByRole('button', { name: 'Create project and start setup', exact: true }).click();
  await finishBrowserSetup(page);
  await expect(page.getByTestId('project-name')).toHaveText('My MUI library');
  await page.getByRole('button', { name: 'Design guidance', exact: true }).click();
  await expect(page.getByLabel('Project design guidance', { exact: true })).toHaveValue('');
  await page.getByLabel('Project design guidance', { exact: true }).fill('MUI-only guidance');
  await expect(page.getByTestId('guidance-status')).toHaveText('Guidance saved');
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await expect(page.locator('.technology-list')).toContainText('MUI');
  await expect(page.locator('.technology-list')).toContainText('Not specified');
  await expect(page.locator('.technology-list input')).toHaveCount(0);
  await page.getByLabel('Active project', { exact: true }).selectOption({ label: 'My Angular library' });
  await page.getByRole('button', { name: 'Design guidance', exact: true }).click();
  await expect(page.getByLabel('Project design guidance', { exact: true })).toHaveValue('Angular-only guidance');
  await page.reload();
  await page.getByLabel('Active project', { exact: true }).selectOption({ label: 'My MUI library' });
  await page.getByRole('button', { name: 'Design guidance', exact: true }).click();
  await expect(page.getByTestId('project-name')).toHaveText('My MUI library');
  await expect(page.getByLabel('Project design guidance', { exact: true })).toHaveValue('MUI-only guidance');
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await expect(page.locator('.technology-list')).toContainText('MUI');
  await expect(page.locator('.technology-list input')).toHaveCount(0);
  await page.getByRole('button', { name: 'Manage references', exact: true }).click();
  await expect(page).toHaveURL(/\/projects\/\d+\/references$/);
  await page.goBack();
  await expect(page).toHaveURL(/\/projects\/\d+\/settings$/);
  await expect(page.getByRole('region', { name: 'Project settings' })).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'Design guidance', exact: true }).click();
  await expect(page.getByLabel('Project design guidance', { exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  expect(browserErrors, 'Project switching has no browser runtime or React errors').toEqual([]);
  await context.close();
});


test('workspace explains personal ownership, per-project stacks and multiple organization spaces', async ({ browser }) => {
  const token = await makeToken('workspace-owner@example.test', 'Workspace Owner');
  const owner = await connect(token);
  const teammate = await connect(await makeToken('workspace-peer@example.test', 'Workspace Peer'));
  await owner.conn.reducers.createOrganization({ name: 'Product Team' });
  await owner.conn.reducers.createOrganization({ name: 'Research Team' });
  await expect.poll(() => [...owner.conn.db.myOrganizations.iter()].length).toBe(2);
  const org = [...owner.conn.db.myOrganizations.iter()].find(row => row.name === 'Product Team')!;
  const details = { language: 'TypeScript', styling: '', libraries: '', versions: '' };
  await owner.conn.reducers.createProjectWithDetails({ name: 'Private Angular kit', organizationId: 0n, ...details, framework: 'Angular' });
  await owner.conn.reducers.createProjectWithDetails({ name: 'Shared React kit', organizationId: org.id, ...details, framework: 'React', libraries: 'MUI' });
  await owner.conn.reducers.inviteMember({ organizationId: org.id, email: 'workspace-peer@example.test', role: 'member', projectRole: '' });
  await expect.poll(() => [...teammate.conn.db.myInvitations.iter()].length).toBe(1);
  await teammate.conn.reducers.acceptInvitation({ invitationId: [...teammate.conn.db.myInvitations.iter()][0].id });
  await teammate.conn.reducers.createProjectWithDetails({ name: 'Teammate Blazor kit', organizationId: org.id, framework: 'Blazor', language: 'C#', styling: 'Bootstrap', libraries: '', versions: '' });
  await expect.poll(() => [...teammate.conn.db.visibleProjects.iter()].length).toBe(1);
  await teammate.conn.reducers.setProjectAccess({ projectId: [...teammate.conn.db.visibleProjects.iter()][0].id, member: [...owner.conn.db.myProfile.iter()][0].identity, role: 'viewer' });
  const context = await browser.newContext(); await seedBrowser(context, token);
  const page = await context.newPage(); await page.goto('/');
  await expect(page.getByText('2 owned projects', { exact: true })).toBeVisible();
  await expect(page.getByText('2 organizations', { exact: true })).toBeVisible();
  await expect(page.getByLabel('Project name', { exact: true })).toBeHidden();
  await expect(page.getByRole('dialog', { name: 'Create a project you own' })).toBeHidden();
  expect(await page.locator('.project-grid').evaluate(element => getComputedStyle(element).gridTemplateColumns.split(' ').length)).toBe(3);
  const angular = page.getByRole('article', { name: 'Project Private Angular kit', exact: true });
  await expect(angular.getByText('Owned by you', { exact: true })).toBeVisible();
  await expect(angular.getByText('Private', { exact: true })).toBeVisible();
  await expect(angular.locator('.project-stack')).toHaveText('Angular · TypeScript');
  const react = page.getByRole('article', { name: 'Project Shared React kit', exact: true });
  await expect(react.getByText('Shared space: Product Team', { exact: true })).toBeVisible();
  await expect(react.locator('.project-stack')).toContainText('MUI');
  await expect(page.getByRole('article', { name: 'Project Teammate Blazor kit', exact: true })).toHaveCount(0);
  expect(await page.locator('.project-grid').evaluate(element => getComputedStyle(element).gridTemplateColumns.split(' ').length)).toBe(3);
  await page.screenshot({ path: '.local/workspace-projects-desktop.png', fullPage: true });
  await page.setViewportSize({ width: 800, height: 900 });
  expect(await page.locator('.project-grid').evaluate(element => getComputedStyle(element).gridTemplateColumns.split(' ').length)).toBe(2);
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.getByRole('button', { name: 'Shared projects', exact: true }).click();
  const organizationFilter = page.getByLabel('Filter shared projects by organization', { exact: true });
  await expect(organizationFilter).toBeVisible();
  await organizationFilter.selectOption({ label: 'Research Team' });
  await expect(page.getByRole('article', { name: 'Project Teammate Blazor kit', exact: true })).toHaveCount(0);
  await organizationFilter.selectOption({ label: 'Product Team' });
  const shared = page.getByRole('article', { name: 'Project Teammate Blazor kit', exact: true });
  await expect(shared.getByText('Shared with you', { exact: true })).toBeVisible();
  await expect(shared.getByText('You can view', { exact: true })).toBeVisible();
  expect(await page.locator('.project-grid').evaluate(element => getComputedStyle(element).gridTemplateColumns.split(' ').length)).toBe(3);
  await shared.getByRole('button', { name: 'Open project Teammate Blazor kit', exact: true }).click();
  await expect(page).toHaveURL(/\/projects\/\d+\/components$/);
  await expect(page.getByTestId('project-name')).toHaveText('Teammate Blazor kit');
  await expect(page.getByRole('button', { name: 'Components', exact: true })).toHaveAttribute('aria-current', 'page');
  await expect(page.getByRole('region', { name: 'Components' })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Design guidance' })).toHaveCount(0);
  await expect(page.getByRole('complementary', { name: 'Available components', exact: true })).toBeVisible();
  await expect(page.getByRole('complementary', { name: 'Available components', exact: true })).toContainText('Common foundation');
  await expect(page.getByRole('complementary', { name: 'Available components', exact: true })).toContainText('Compositions');
  await expect(page.getByRole('complementary', { name: 'Available components', exact: true }).getByRole('button', { name: 'Button', exact: true })).toBeVisible();
  await expect(page.getByRole('complementary', { name: 'Available components', exact: true }).getByRole('button', { name: 'LoginForm', exact: true })).toBeVisible();
  await expect(page.getByTestId('example-source')).toContainText('Primary action');
  expect(await page.getByLabel('Project conversation').evaluate(element => element.clientHeight)).toBeGreaterThan(280);
  await page.getByRole('button', { name: 'Preview', exact: true }).click();
  await expect(page.locator('iframe[title="Example preview: Button"]')).toBeVisible();
  await page.getByRole('button', { name: 'Code', exact: true }).click();
  await expect(page.getByRole('complementary', { name: 'Chat with ComPlix', exact: true })).toContainText('Read-only conversation. An editor can send messages.');
  expect(await page.locator('.studio-columns').evaluate(element => getComputedStyle(element).gridTemplateColumns.split(' ').length)).toBe(3);
  await page.screenshot({ path: '.local/workspace-components-desktop.png' });
  await page.getByRole('button', { name: 'Hide list', exact: true }).click();
  await expect(page.getByRole('complementary', { name: 'Available components', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Show component list', exact: true }).click();
  await expect(page.getByRole('complementary', { name: 'Available components', exact: true })).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.getByRole('button', { name: 'All projects', exact: true }).click();
  await page.getByRole('button', { name: 'Organizations', exact: true }).click();
  const productSpace = page.getByRole('article', { name: 'Organization space Product Team', exact: true });
  await expect(productSpace.getByText('2 projects you can access in this space', { exact: true })).toBeVisible();
  await expect(productSpace.getByRole('button', { name: 'Shared React kit', exact: true })).toBeVisible();
  await expect(productSpace.getByRole('button', { name: 'Teammate Blazor kit', exact: true })).toBeVisible();
  await expect(productSpace.getByText('Private Angular kit', { exact: true })).toHaveCount(0);
  await expect(page.getByRole('article', { name: 'Organization space Research Team', exact: true })).toContainText('0 projects you can access');
  await page.screenshot({ path: '.local/workspace-spaces-desktop.png', fullPage: true });
  await productSpace.getByRole('button', { name: 'Manage Product Team', exact: true }).click();
  await expect(page).toHaveURL(/\/organizations\/\d+$/);
  await expect(page.getByRole('heading', { name: 'Product Team' })).toBeVisible();
  await page.getByRole('button', { name: 'Projects', exact: true }).click();
  await expect(page).toHaveURL(/\/organizations\/\d+\/projects$/);
  await page.getByRole('button', { name: 'Open project Teammate Blazor kit', exact: true }).click();
  await expect(page).toHaveURL(/\/projects\/\d+\/components$/);
  await expect(page.getByTestId('project-name')).toHaveText('Teammate Blazor kit');
  await page.getByRole('button', { name: 'All projects', exact: true }).click();
  await page.getByRole('button', { name: 'Organizations', exact: true }).click();
  await productSpace.getByRole('button', { name: 'Shared React kit', exact: true }).click();
  await expect(page.getByTestId('project-name')).toHaveText('Shared React kit');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'All projects', exact: true }).click();
  expect(await page.locator('.project-grid').evaluate(element => getComputedStyle(element).gridTemplateColumns.split(' ').length)).toBe(1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: '.local/workspace-projects-mobile.png', fullPage: true });
  await context.close();
});


test('reference storage enforces project scope, original bytes, validation, quotas and restart persistence', async () => {
  const token = await makeToken('reference-owner@example.test', 'Reference Owner');
  const owner = await connect(token);
  const viewer = await connect(await makeToken('reference-viewer@example.test', 'Reference Viewer'));
  const outsider = await connect(await makeToken('reference-outsider@example.test', 'Reference Outsider'));
  const tech = { framework: 'React', language: 'TypeScript', styling: 'Tailwind CSS', libraries: 'shadcn/ui', versions: '' };
  await owner.conn.reducers.createOrganization({ name: 'Reference Team' });
  await expect.poll(() => [...owner.conn.db.myOrganizations.iter()].length).toBe(1);
  const org = [...owner.conn.db.myOrganizations.iter()][0];
  await owner.conn.reducers.createProjectWithDetails({ name: 'Reference project', organizationId: org.id, ...tech });
  await owner.conn.reducers.createProjectWithDetails({ name: 'Other reference project', organizationId: 0n, ...tech });
  await expect.poll(() => [...owner.conn.db.visibleProjects.iter()].length).toBe(2);
  const project = [...owner.conn.db.visibleProjects.iter()].find(row => row.name === 'Reference project')!;
  const other = [...owner.conn.db.visibleProjects.iter()].find(row => row.name === 'Other reference project')!;
  await owner.conn.reducers.inviteMember({ organizationId: org.id, email: 'reference-viewer@example.test', role: 'member', projectRole: 'viewer', projectId: project.id });
  await expect.poll(() => [...viewer.conn.db.myInvitations.iter()].length).toBe(1);
  await viewer.conn.reducers.acceptInvitation({ invitationId: [...viewer.conn.db.myInvitations.iter()][0].id });
  const bytes = new Uint8Array([0xef, 0xbb, 0xbf, ...new TextEncoder().encode('# Design\r\nReadable café')]);
  const upload = { projectId: project.id, filename: 'guide.md', purpose: 'design', bytes };
  await owner.conn.reducers.uploadReference(upload);
  await expect.poll(() => [...viewer.conn.db.visibleReferences.iter()].length).toBe(1);
  const reference = [...viewer.conn.db.visibleReferences.iter()][0];
  expect(Array.from(reference.bytes)).toEqual(Array.from(bytes));
  expect(reference.content).toBe('# Design\r\nReadable café');
  expect(reference.purpose).toBe('design');
  await expect(viewer.conn.reducers.uploadReference({ ...upload, filename: 'viewer.md' })).rejects.toThrow('edit access');
  await expect(viewer.conn.reducers.removeReference({ referenceId: reference.id })).rejects.toThrow('access denied');
  await expect(outsider.conn.reducers.removeReference({ referenceId: reference.id })).rejects.toThrow('access denied');
  await expect(outsider.conn.reducers.uploadReference(upload)).rejects.toThrow('edit access');
  await expect(owner.conn.reducers.uploadReference({ ...upload, filename: 'GUIDE.md' })).rejects.toThrow('already exists');
  for (const invalid of [
    { filename: '../file.md' }, { filename: 'guide.pdf' }, { purpose: 'other' },
    { bytes: new Uint8Array() }, { bytes: new Uint8Array([0xff, 0xfe]) }, { bytes: new Uint8Array([65, 0, 66]) },
    { bytes: new Uint8Array(131073).fill(65) },
  ]) await expect(owner.conn.reducers.uploadReference({ ...upload, ...invalid })).rejects.toThrow();
  expect([...owner.conn.db.visibleReferences.iter()]).toHaveLength(1);
  await owner.conn.reducers.uploadReference({ ...upload, projectId: other.id });
  await owner.conn.reducers.uploadReference({ ...upload, projectId: other.id, filename: 'limit.txt', bytes: new Uint8Array(131072).fill(65) });
  await expect.poll(() => [...owner.conn.db.visibleReferences.iter()].find(row => row.filename === 'limit.txt')?.bytes.length).toBe(131072);
  expect([...viewer.conn.db.visibleReferences.iter()]).toHaveLength(1);
  expect([...outsider.conn.db.visibleReferences.iter()]).toHaveLength(0);
  expect((await sql(outsider.token, 'SELECT * FROM project_reference')).ok).toBe(false);
  expect(JSON.stringify(await (await sql(outsider.token, 'SELECT * FROM visible_references')).json())).not.toContain('Readable');
  // Serialized transactions must allow exactly 19 more references, even with concurrent attempts.
  const attempts = await Promise.allSettled(Array.from({ length: 20 }, (_, index) => owner.conn.reducers.uploadReference({ ...upload, filename: `reference-${index}.txt`, bytes: new Uint8Array([65]) })));
  expect(attempts.filter(result => result.status === 'fulfilled')).toHaveLength(19);
  await expect.poll(() => [...owner.conn.db.visibleReferences.iter()].filter(row => row.projectId === project.id).length).toBe(20);
  await owner.conn.reducers.removeReference({ referenceId: reference.id });
  await expect.poll(() => [...viewer.conn.db.visibleReferences.iter()].length).toBe(19);
  await owner.conn.reducers.uploadReference(upload);
  await expect.poll(() => [...viewer.conn.db.visibleReferences.iter()].length).toBe(20);
  await owner.conn.reducers.setProjectAccess({ projectId: project.id, member: [...viewer.conn.db.myProfile.iter()][0].identity, role: '' });
  await expect.poll(() => [...viewer.conn.db.visibleReferences.iter()].length).toBe(0);
  await stopServer(); await startServer();
  const restored = await connect(token);
  const saved = [...restored.conn.db.visibleReferences.iter()].find(row => row.projectId === project.id && row.filename === 'guide.md')!;
  expect(Array.from(saved.bytes)).toEqual(Array.from(bytes));
  expect(saved.content).toBe('# Design\r\nReadable café');
});

test('browser uploads references, shares plain-text previews, rejects failed uploads and removes with confirmation', async ({ browser }) => {
  const token = await makeToken('upload-browser@example.test', 'Upload Browser');
  const viewerToken = await makeToken('upload-viewer@example.test', 'Upload Viewer');
  const owner = await connect(token); const viewer = await connect(viewerToken);
  await owner.conn.reducers.createOrganization({ name: 'Upload Team' });
  await expect.poll(() => [...owner.conn.db.myOrganizations.iter()].length).toBe(1);
  const org = [...owner.conn.db.myOrganizations.iter()][0];
  await owner.conn.reducers.createProjectWithDetails({ name: 'Uploaded references', organizationId: org.id, framework: 'React', language: 'TypeScript', styling: '', libraries: '', versions: '' });
  await expect.poll(() => [...owner.conn.db.visibleProjects.iter()].length).toBe(1);
  const project = [...owner.conn.db.visibleProjects.iter()][0];
  await owner.conn.reducers.inviteMember({ organizationId: org.id, email: 'upload-viewer@example.test', role: 'member', projectRole: 'viewer', projectId: project.id });
  await expect.poll(() => [...viewer.conn.db.myInvitations.iter()].length).toBe(1);
  await viewer.conn.reducers.acceptInvitation({ invitationId: [...viewer.conn.db.myInvitations.iter()][0].id });
  await owner.conn.reducers.createProjectWithDetails({ name: 'Separate empty references', organizationId: 0n, framework: 'Angular', language: 'TypeScript', styling: '', libraries: '', versions: '' });
  const aContext = await browser.newContext(); const bContext = await browser.newContext();
  await seedBrowser(aContext, token); await seedBrowser(bContext, viewerToken);
  const a = await aContext.newPage(); const b = await bContext.newPage();
  for (const page of [a, b]) {
    await page.goto('/');
    await openProjectPage(page, 'Uploaded references', page === b);
    await page.getByRole('button', { name: 'Settings', exact: true }).click();
    await page.getByRole('button', { name: 'Manage references', exact: true }).click();
  }
  await expect(a.getByText('No references yet. Existing guidance is saved separately in Design guidance.')).toBeVisible();
  const source = '<script>window.referenceExecuted = true</script>\n<button>Reference only</button>';
  await a.getByLabel('Reference purpose', { exact: true }).selectOption('implementation');
  await a.getByLabel('Reference file', { exact: true }).setInputFiles({ name: 'Button.html', mimeType: 'text/html', buffer: Buffer.from(source) });
  await a.getByRole('button', { name: 'Upload reference', exact: true }).click();
  await expect(a.getByRole('status')).toContainText('Reference saved');
  await expect(b.getByTestId('reference-content')).toHaveText(source);
  await a.screenshot({ path: '.local/references-fixture.png', fullPage: true });
  await a.getByLabel('Active project', { exact: true }).selectOption({ label: 'Separate empty references' });
  await a.getByRole('button', { name: 'Settings', exact: true }).click();
  await a.getByRole('button', { name: 'Manage references', exact: true }).click();
  await expect(a.getByTestId('reference-content')).toHaveCount(0);
  await a.getByLabel('Active project', { exact: true }).selectOption({ label: 'Uploaded references' });
  await a.getByRole('button', { name: 'Settings', exact: true }).click();
  await a.getByRole('button', { name: 'Manage references', exact: true }).click();
  await expect(a.getByTestId('reference-content')).toHaveText(source);
  expect(await b.evaluate(() => (window as unknown as { referenceExecuted?: boolean }).referenceExecuted === true)).toBe(false);
  await expect(b.getByLabel('Reference file', { exact: true })).toHaveCount(0);
  await expect(b.getByRole('button', { name: 'Remove Button.html', exact: true })).toHaveCount(0);
  await a.reload();
  await a.getByRole('button', { name: 'Settings', exact: true }).click();
  await a.getByRole('button', { name: 'Manage references', exact: true }).click();
  await expect(a.getByTestId('reference-content')).toHaveText(source);
  await a.getByLabel('Reference file', { exact: true }).setInputFiles({ name: 'Button.html', mimeType: 'text/html', buffer: Buffer.from('Replacement must not overwrite') });
  await a.getByRole('button', { name: 'Upload reference', exact: true }).click();
  await expect(a.getByRole('alert')).toContainText('already exists');
  await expect(a.getByTestId('reference-content')).toHaveText(source);
  await a.getByLabel('Reference file', { exact: true }).setInputFiles({ name: 'bad.txt', mimeType: 'text/plain', buffer: Buffer.from([0xff]) });
  await a.getByRole('button', { name: 'Upload reference', exact: true }).click();
  await expect(a.getByRole('alert')).toContainText('UTF-8');
  await expect(b.getByTestId('reference-content')).toHaveText(source);
  await a.getByRole('button', { name: 'Remove Button.html', exact: true }).click();
  await a.getByRole('button', { name: 'Keep reference', exact: true }).click();
  await expect(a.getByTestId('reference-content')).toHaveText(source);
  await a.getByRole('button', { name: 'Remove Button.html', exact: true }).click();
  await a.getByRole('button', { name: 'Confirm removal of Button.html', exact: true }).click();
  await expect(b.getByTestId('reference-content')).toHaveCount(0);
  await expect(a.getByText('0 / 20 references saved', { exact: true })).toBeVisible();
  await aContext.close(); await bContext.close();
});


test('generation jobs enforce access, snapshots, idempotency, cancellation and stale-input protection', async () => {
  const owner = await connect(await makeToken('jobs-owner@example.test', 'Jobs Owner'));
  const viewer = await connect(await makeToken('jobs-viewer@example.test', 'Jobs Viewer'));
  const outsider = await connect(await makeToken('jobs-outsider@example.test', 'Jobs Outsider'));
  await owner.conn.reducers.createOrganization({ name: 'Jobs Team' });
  await expect.poll(() => [...owner.conn.db.myOrganizations.iter()].length).toBe(1);
  const org = [...owner.conn.db.myOrganizations.iter()][0];
  const tech = { framework: 'Unlisted framework', language: 'Unlisted language', styling: '', libraries: 'Custom library', versions: '' };
  await owner.conn.reducers.createProjectWithDetails({ name: 'Jobs project', organizationId: org.id, ...tech });
  await owner.conn.reducers.createProjectWithDetails({ name: 'Other jobs project', organizationId: 0n, ...tech });
  await expect.poll(() => [...owner.conn.db.visibleProjects.iter()].length).toBe(2);
  const project = [...owner.conn.db.visibleProjects.iter()].find(row => row.name === 'Jobs project')!;
  const other = [...owner.conn.db.visibleProjects.iter()].find(row => row.id !== project.id)!;
  await owner.conn.reducers.inviteMember({ organizationId: org.id, email: 'jobs-viewer@example.test', role: 'member', projectRole: 'viewer', projectId: project.id });
  await expect.poll(() => [...viewer.conn.db.myInvitations.iter()].length).toBe(1);
  await viewer.conn.reducers.acceptInvitation({ invitationId: [...viewer.conn.db.myInvitations.iter()][0].id });
  await owner.conn.reducers.uploadReference({ projectId: other.id, filename: 'private.md', purpose: 'design', bytes: new TextEncoder().encode('Other project only') });
  await expect.poll(() => [...owner.conn.db.visibleReferences.iter()].length).toBe(1);
  await owner.conn.reducers.uploadReference({ projectId: project.id, filename: 'project.md', purpose: 'design', bytes: new TextEncoder().encode('Only this project reference belongs in the snapshot.') });
  const args = { projectId: project.id, requestId: randomUUID(), request: 'Common Button', scenario: 'success' };
  await expect(viewer.conn.reducers.createGeneration(args)).rejects.toThrow('edit access');
  await expect(outsider.conn.reducers.createGeneration(args)).rejects.toThrow('edit access');
  await expect.poll(() => [...owner.conn.db.visibleReferences.iter()].length).toBe(2);
  await owner.conn.reducers.createGeneration(args);
  await owner.conn.reducers.createGeneration(args); // Request replay creates no duplicate.
  await expect.poll(() => [...owner.conn.db.visibleGenerationJobs.iter()].length).toBe(1);
  await expect.poll(() => [...viewer.conn.db.visibleGenerationJobs.iter()].length).toBe(1);
  const job = [...owner.conn.db.visibleGenerationJobs.iter()][0];
  expect(JSON.parse(job.snapshot).technologies.framework).toBe('Unlisted framework');
  expect(JSON.parse(job.snapshot).references.map((reference: { filename: string }) => reference.filename)).toEqual(['project.md']);
  expect([...outsider.conn.db.visibleGenerationJobs.iter()]).toHaveLength(0);
  expect((await sql(outsider.token, 'SELECT * FROM generation_job')).ok).toBe(false);
  expect(JSON.stringify(await (await sql(outsider.token, 'SELECT * FROM visible_generation_jobs')).json())).not.toContain('Common Button');
  await expect(viewer.conn.reducers.advanceMockGeneration({ jobId: job.id, expectedState: 'queued' })).rejects.toThrow('Access denied');
  await expect(viewer.conn.reducers.cancelGeneration({ jobId: job.id })).rejects.toThrow('Access denied');
  await expect(owner.conn.reducers.createGeneration({ ...args, requestId: randomUUID() })).rejects.toThrow('active');
  await owner.conn.reducers.advanceMockGeneration({ jobId: job.id, expectedState: 'queued' });
  await owner.conn.reducers.advanceMockGeneration({ jobId: job.id, expectedState: 'queued' });
  expect([...owner.conn.db.visibleGenerationJobs.iter()][0].state).toBe('generating');
  await owner.conn.reducers.renameProject({ projectId: project.id, name: 'Updated project inputs' });
  await owner.conn.reducers.advanceMockGeneration({ jobId: job.id, expectedState: 'generating' });
  await expect.poll(() => [...viewer.conn.db.visibleGenerationJobs.iter()][0].state).toBe('failed');
  expect([...owner.conn.db.visibleGenerationJobs.iter()][0].snapshot).toBe(job.snapshot);
  await owner.conn.reducers.createGeneration({ ...args, requestId: randomUUID(), request: 'Cancel this job' });
  await expect.poll(() => [...owner.conn.db.visibleGenerationJobs.iter()].length).toBe(2);
  const cancel = [...owner.conn.db.visibleGenerationJobs.iter()].find(row => row.state === 'queued')!;
  await owner.conn.reducers.cancelGeneration({ jobId: cancel.id });
  await owner.conn.reducers.advanceMockGeneration({ jobId: cancel.id, expectedState: 'queued' });
  expect([...owner.conn.db.visibleGenerationJobs.iter()].find(row => row.id === cancel.id)?.state).toBe('cancelled');
  await owner.conn.reducers.removeGeneration({ jobId: cancel.id });
  await expect.poll(() => [...viewer.conn.db.visibleGenerationJobs.iter()].length).toBe(1);
  await owner.conn.reducers.setProjectAccess({ projectId: project.id, member: [...viewer.conn.db.myProfile.iter()][0].identity, role: '' });
  await expect.poll(() => [...viewer.conn.db.visibleGenerationJobs.iter()].length).toBe(0);
});

test('chat rejects complete project context above 64 KiB without creating a job', async () => {
  const owner = await connect(await makeToken('oversized-context@example.test', 'Oversized Context'));
  await owner.conn.reducers.createProjectWithDetails({ name: 'Oversized context project', organizationId: 0n, framework: 'React', language: 'TypeScript', styling: '', libraries: '', versions: '' });
  await expect.poll(() => [...owner.conn.db.visibleProjects.iter()].length).toBe(1);
  const project = [...owner.conn.db.visibleProjects.iter()][0];
  await owner.conn.reducers.uploadReference({ projectId: project.id, filename: 'large.md', purpose: 'design', bytes: new TextEncoder().encode('x'.repeat(66 * 1024)) });
  const error = await owner.conn.procedures.generateProjectChat({ projectId: project.id, requestId: randomUUID(), request: 'Explain this project' }).then(() => '', cause => String(cause));
  expect(error).toContain('Complete project context exceeds 64 KiB');
  expect([...owner.conn.db.visibleGenerationJobs.iter()]).toHaveLength(0);
});

test('Library mock workflow persists candidates, isolates preview and preserves earlier results on failure', async ({ browser }) => {
  const token = await makeToken('library-browser@example.test', 'Library Browser');
  const owner = await connect(token);
  await owner.conn.reducers.createProjectWithDetails({ name: 'Library UI', organizationId: 0n, framework: 'React', language: 'TypeScript', styling: 'Tailwind CSS', libraries: 'shadcn/ui', versions: '' });
  const context = await browser.newContext(); await seedBrowser(context, token);
  const page = await context.newPage(); await page.goto('/');
  await openProjectPage(page, 'Library UI');
  await page.getByRole('button', { name: 'Components', exact: true }).click();
  await expect(page.getByRole('complementary', { name: 'Chat with ComPlix', exact: true }).getByText('ComPlix chat ready', { exact: true })).toBeVisible();
  await page.getByText('Developer mock workflow', { exact: true }).click();
  await page.getByLabel('Component request', { exact: true }).fill('First mock Button');
  await page.getByRole('button', { name: 'Queue mock generation', exact: true }).click();
  await expect(page.getByTestId('generation-status')).toContainText('Queued');
  await page.getByRole('button', { name: 'Run mock pipeline', exact: true }).click();
  await expect(page.getByTestId('generation-status')).toContainText('Mock preview ready');
  const ready = [...owner.conn.db.visibleGenerationJobs.iter()].find(row => row.request === 'First mock Button')!;
  await page.frameLocator('iframe[title="Mock component preview"]').getByRole('button', { name: 'Clicked 0 times' }).click();
  await expect(page.frameLocator('iframe[title="Mock component preview"]').getByRole('button', { name: 'Clicked 1 times' })).toBeVisible();
  const frame = page.frames().find(frame => frame.parentFrame())!;
  expect(await frame.evaluate(() => { try { void parent.document.body; return false; } catch { return true; } })).toBe(true);
  let attemptedRequests = 0;
  page.on('request', request => { if (request.url().includes('blocked-preview-probe')) attemptedRequests++; });
  expect(await frame.evaluate(async () => { try { await fetch('http://127.0.0.1:3100/v1/ping?blocked-preview-probe'); return false; } catch { return true; } })).toBe(true);
  expect(attemptedRequests).toBe(0);
  await page.getByRole('button', { name: 'Code', exact: true }).click();
  await expect(page.getByTestId('candidate-source')).toHaveValue(/Mock component fixture/);
  await page.getByRole('button', { name: 'Validation', exact: true }).click();
  await expect(page.getByText('No real validation has run.', { exact: false })).toBeVisible();
  await page.reload();
  await page.getByRole('button', { name: 'Components', exact: true }).click();
  await expect(page.getByTestId('generation-status')).toContainText('Mock preview ready');
  await page.getByText('Developer mock workflow', { exact: true }).click();
  await page.getByLabel('Component request', { exact: true }).fill('Fail this build');
  await page.getByLabel('Mock outcome', { exact: true }).selectOption('build_failure');
  await page.getByRole('button', { name: 'Queue mock generation', exact: true }).click();
  await page.getByRole('button', { name: 'Run mock pipeline', exact: true }).click();
  await expect(page.getByTestId('generation-status')).toContainText('Failed');
  await expect(page.locator('iframe[title="Mock component preview"]')).toHaveCount(0);
  await page.getByLabel('Generation history', { exact: true }).selectOption(ready.id.toString());
  await expect(page.getByTestId('generation-status')).toContainText('Mock preview ready');
  await expect(page.locator('iframe[title="Mock component preview"]')).toBeVisible();
  await page.screenshot({ path: '.local/library-mock-fixture.png', fullPage: true });
  await context.close();
  await stopServer(); await startServer();
  const restored = await connect(token);
  expect([...restored.conn.db.visibleGenerationJobs.iter()].find(row => row.id === ready.id)?.artifacts).toBe(ready.artifacts);
  expect([...restored.conn.db.visibleGenerationJobs.iter()]).toHaveLength(2);
});


test('disabled generation configuration denies new jobs and publishes no provider secrets', async () => {
  const token = await makeToken('disabled-jobs@example.test', 'Disabled Jobs');
  const session = await connect(token);
  await session.conn.reducers.createProjectWithDetails({ name: 'Disabled provider project', organizationId: 0n, framework: 'Custom', language: '', styling: '', libraries: '', versions: '' });
  await expect.poll(() => [...session.conn.db.visibleProjects.iter()].length).toBe(1);
  const project = [...session.conn.db.visibleProjects.iter()][0];
  session.conn.disconnect();
  publish(path.resolve('spacetimedb'), true, 'disabled');
  try {
    const disabled = await connect(token);
    expect([...disabled.conn.db.generationSettings.iter()]).toEqual([{ mode: 'unconfigured', nvidiaEnabled: false, chatEnabled: false }]);
    await expect(disabled.conn.reducers.createGeneration({ projectId: project.id, requestId: randomUUID(), request: 'Do not run', scenario: 'success' })).rejects.toThrow('not configured');
    expect([...disabled.conn.db.visibleGenerationJobs.iter()]).toHaveLength(0);
    disabled.conn.disconnect();
  } finally { publish(path.resolve('spacetimedb'), true); }
});


test('sandbox preview procedure enforces edit access and configuration before any provider call', async () => {
  const owner = await connect(await makeToken('preview-source-owner@example.test', 'Preview Source Owner'));
  const outsider = await connect(await makeToken('preview-source-outsider@example.test', 'Preview Source Outsider'));
  await owner.conn.reducers.createProjectWithDetails({ name: 'Preview source', organizationId: 0n, framework: 'React', language: 'TypeScript', styling: 'Tailwind CSS', libraries: 'shadcn/ui', versions: '' });
  const project = [...owner.conn.db.visibleProjects.iter()][0];
  await owner.conn.procedures.generateProjectChat({ projectId: project.id, requestId: randomUUID(), request: 'Create a preview Button' });
  const job = [...owner.conn.db.visibleGenerationJobs.iter()][0];
  const reason = async (promise: Promise<unknown>) => { try { await promise; return 'resolved'; } catch (cause) { return String(cause instanceof Error ? cause.message : cause); } };
  expect(await reason(outsider.conn.procedures.buildComponentPreview({ jobId: job.id, expectedRevision: 0n }))).toContain('Project edit access is required.');
  // The isolated test module has no E2B configuration, so no sandbox is ever requested.
  expect(await reason(owner.conn.procedures.buildComponentPreview({ jobId: job.id, expectedRevision: 0n }))).toContain('Previews are not configured.');
  expect([...owner.conn.db.visibleComponentPreviews.iter()]).toHaveLength(0);
  expect([...outsider.conn.db.visibleComponentPreviews.iter()]).toHaveLength(0);
});

test('editable drafts enforce access and revisions; selected edits enter chat without changing immutable results', async () => {
  const owner = await connect(await makeToken('draft-editor@example.test', 'Draft Editor'));
  const viewer = await connect(await makeToken('draft-reader@example.test', 'Draft Reader'));
  const outsider = await connect(await makeToken('draft-outsider@example.test', 'Draft Outsider'));
  await owner.conn.reducers.createOrganization({ name: 'Draft Team' });
  const org = [...owner.conn.db.myOrganizations.iter()][0];
  await owner.conn.reducers.createProjectWithDetails({ name: 'Editable draft', organizationId: org.id, framework: 'Blazor', language: 'C#', styling: 'Bootstrap', libraries: '', versions: '' });
  const project = [...owner.conn.db.visibleProjects.iter()][0];
  await owner.conn.reducers.inviteMember({ organizationId: org.id, email: 'draft-reader@example.test', role: 'member', projectRole: 'viewer', projectId: project.id });
  await expect.poll(() => [...viewer.conn.db.myInvitations.iter()].length).toBe(1);
  await viewer.conn.reducers.acceptInvitation({ invitationId: [...viewer.conn.db.myInvitations.iter()][0].id });
  const request = { projectId: project.id, requestId: randomUUID(), request: 'Generate first draft' };
  await owner.conn.procedures.generateProjectChat(request);
  const job = [...owner.conn.db.visibleGenerationJobs.iter()][0];
  const files = [{ path: 'Common/Button.razor', content: '<button>Manual Razor edit</button>' }, { path: 'README.md', content: '# Edited docs' }];
  const save = { jobId: job.id, expectedRevision: 0n, files };
  await expect(viewer.conn.reducers.saveComponentDraft(save)).rejects.toThrow('edit access');
  await expect(outsider.conn.reducers.saveComponentDraft(save)).rejects.toThrow('edit access');
  await owner.conn.reducers.saveComponentDraft(save);
  await expect.poll(() => [...viewer.conn.db.visibleComponentDrafts.iter()].length).toBe(1);
  expect([...outsider.conn.db.visibleComponentDrafts.iter()]).toHaveLength(0);
  await expect(owner.conn.reducers.saveComponentDraft(save)).rejects.toThrow('Draft changed');
  await expect(owner.conn.reducers.saveComponentDraft({ ...save, expectedRevision: 1n, files: [{ path: '../escape', content: '' }] })).rejects.toThrow('unsafe');
  await expect(owner.conn.reducers.saveComponentDraft({ ...save, expectedRevision: 1n, files: [{ path: 'README.md', content: 'synthetic-operator-nvidia-credential' }] })).rejects.toThrow('credentials');
  expect([...owner.conn.db.visibleGenerationJobs.iter()][0].artifacts).toBe(job.artifacts);
  const followup = { ...request, requestId: randomUUID(), request: 'Refine the selected draft', sourceJobId: job.id, expectedDraftRevision: 1n };
  await owner.conn.procedures.generateProjectChat(followup);
  const result = [...owner.conn.db.visibleGenerationJobs.iter()].find(row => row.requestId === followup.requestId)!;
  expect(JSON.parse(result.snapshot).candidateFiles).toEqual(files);
  expect(JSON.parse(result.snapshot).editing).toEqual({ jobId: String(job.id), revision: '1' });
  const crossProject = await connect(await makeToken('draft-other-project@example.test', 'Other Project'));
  await crossProject.conn.reducers.createProjectWithDetails({ name: 'Other project', organizationId: 0n, framework: '', language: '', styling: '', libraries: '', versions: '' });
  expect(await crossProject.conn.procedures.generateProjectChat({ ...followup, projectId: [...crossProject.conn.db.visibleProjects.iter()][0].id, requestId: randomUUID() }).then(() => '', error => String(error))).toContain('Selected draft is unavailable');
  expect(await owner.conn.procedures.generateProjectChat({ ...followup, requestId: randomUUID(), expectedDraftRevision: 0n }).then(() => '', error => String(error))).toContain('Draft changed');
  await owner.conn.procedures.generateProjectChat({ ...followup, requestId: randomUUID(), request: 'Rejected key fixture' });
  expect([...owner.conn.db.visibleComponentDrafts.iter()][0].files).toEqual(files);
  await owner.conn.procedures.generateProjectChat({ ...followup, requestId: randomUUID(), request: 'Draft race fixture' });
  const race = [...owner.conn.db.visibleGenerationJobs.iter()].find(row => row.request === 'Draft race fixture')!;
  expect(race.state).toBe('failed'); expect(race.diagnostic).toContain('Draft or project inputs changed');
  expect([...owner.conn.db.visibleComponentDrafts.iter()][0].files[0].content).toContain('concurrent edit');
  await owner.conn.reducers.removeGeneration({ jobId: job.id });
  await expect.poll(() => [...owner.conn.db.visibleComponentDrafts.iter()].length).toBe(0);
});

test('multi-file editor autosaves, survives reload and flushes selected edits before chat', async ({ browser }) => {
  const token = await makeToken('draft-browser@example.test', 'Draft Browser');
  const owner = await connect(token);
  await owner.conn.reducers.createProjectWithDetails({ name: 'Editor workspace', organizationId: 0n, framework: 'React', language: 'TypeScript', styling: 'Tailwind CSS', libraries: 'shadcn/ui', versions: '' });
  const project = [...owner.conn.db.visibleProjects.iter()][0];
  await owner.conn.procedures.generateProjectChat({ projectId: project.id, requestId: randomUUID(), request: 'Generate editable Button' });
  const job = [...owner.conn.db.visibleGenerationJobs.iter()][0];
  const context = await browser.newContext(); await seedBrowser(context, token);
  const page = await context.newPage(); await page.goto('/'); await openProjectPage(page, 'Editor workspace');
  const code = page.getByLabel('Candidate code', { exact: true });
  await expect(code).toBeEditable();
  await code.fill('export const Button = () => <button>My manual edit</button>;');
  await page.getByLabel('Candidate file', { exact: true }).selectOption('README.md');
  await code.fill('# Manually edited docs');
  await expect(page.getByTestId('draft-save-status')).toHaveText('Draft saved');
  await page.reload();
  await page.getByLabel('Candidate file', { exact: true }).selectOption('README.md');
  await expect(code).toHaveValue('# Manually edited docs');
  await page.getByRole('button', { name: 'Docs', exact: true }).click();
  await expect(page.getByText('# Manually edited docs', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Code', exact: true }).click();
  await page.getByLabel('Candidate file', { exact: true }).selectOption('Button.tsx');
  await expect(code).toHaveValue(/My manual edit/);
  // Send before the debounce expires: chat must wait for the save.
  await code.fill('export const Button = () => <button>Latest edit before chat</button>;');
  await page.getByLabel('Your message', { exact: true }).fill('Refine my manual changes');
  await page.getByRole('button', { name: 'Send message', exact: true }).click();
  await expect.poll(() => [...owner.conn.db.visibleGenerationJobs.iter()].length).toBe(2);
  const followup = [...owner.conn.db.visibleGenerationJobs.iter()].find(row => row.id !== job.id)!;
  expect(JSON.parse(followup.snapshot).candidateFiles[0].content).toContain('Latest edit before chat');
  expect(JSON.parse(followup.snapshot).candidateFiles[1].content).toBe('# Manually edited docs');
  expect(JSON.parse(followup.snapshot).editing.jobId).toBe(String(job.id));
  // Go back to the original candidate; a new AI result must not alter it.
  await page.getByRole('button', { name: 'Generate editable Button', exact: true }).click();
  await page.getByRole('button', { name: 'Code', exact: true }).click();
  await expect(code).toHaveValue(/Latest edit before chat/);
  await expect(page.locator('iframe')).toHaveCount(0);
  // A collaborator's update is adopted while clean, but never replaces local unsaved text.
  const saved = [...owner.conn.db.visibleComponentDrafts.iter()].find(row => row.jobId === job.id)!;
  await owner.conn.reducers.saveComponentDraft({ jobId: job.id, expectedRevision: saved.revision, files: saved.files.map(file => file.path === 'Button.tsx' ? { ...file, content: 'Clean remote update' } : file) });
  await expect(code).toHaveValue('Clean remote update');
  await page.clock.install(); await page.clock.pauseAt(new Date());
  await code.fill('Unsaved local version must survive');
  const remote = [...owner.conn.db.visibleComponentDrafts.iter()].find(row => row.jobId === job.id)!;
  await owner.conn.reducers.saveComponentDraft({ jobId: job.id, expectedRevision: remote.revision, files: remote.files.map(file => file.path === 'Button.tsx' ? { ...file, content: 'Conflicting collaborator edit' } : file) });
  await expect(page.getByText('Draft changed. Your local edits were not overwritten.', { exact: true })).toBeVisible();
  await expect(code).toHaveValue('Unsaved local version must survive');
  await page.getByRole('button', { name: 'All projects', exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/projects/${project.id}/components$`));
  await expect(page.getByRole('main').getByText('Save or resolve your draft edits before leaving the component workspace.', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Discard local edits and load saved draft', exact: true }).click();
  await expect(code).toHaveValue('Conflicting collaborator edit');
  await page.getByRole('button', { name: 'All projects', exact: true }).click();
  await expect(page).toHaveURL(/\/projects$/);
  await context.close();
});

test('coordinated chat authorizes calls, stores drafts without keys and handles request replays', async () => {
  const owner = await connect(await makeToken('nvidia-owner@example.test', 'NVIDIA Owner'));
  const viewer = await connect(await makeToken('nvidia-viewer@example.test', 'NVIDIA Viewer'));
  const outsider = await connect(await makeToken('nvidia-outsider@example.test', 'NVIDIA Outsider'));
  await owner.conn.reducers.createOrganization({ name: 'NVIDIA Team' });
  await expect.poll(() => [...owner.conn.db.myOrganizations.iter()].length).toBe(1);
  const org = [...owner.conn.db.myOrganizations.iter()][0];
  await owner.conn.reducers.createProjectWithDetails({ name: 'NVIDIA draft project', organizationId: org.id, framework: 'React', language: 'TypeScript', styling: 'Tailwind CSS', libraries: 'shadcn/ui', versions: '' });
  await expect.poll(() => [...owner.conn.db.visibleProjects.iter()].length).toBe(1);
  const project = [...owner.conn.db.visibleProjects.iter()][0];
  await owner.conn.reducers.uploadReference({ projectId: project.id, filename: 'design.md', purpose: 'design', bytes: new TextEncoder().encode('automatic-reference-marker: use the sage palette') });
  await expect.poll(() => [...owner.conn.db.visibleReferences.iter()].length).toBe(1);
  await owner.conn.reducers.createProjectWithDetails({ name: 'Private unrelated project', organizationId: 0n, framework: 'React', language: 'TypeScript', styling: '', libraries: '', versions: '' });
  await expect.poll(() => [...owner.conn.db.visibleProjects.iter()].length).toBe(2);
  const unrelatedProject = [...owner.conn.db.visibleProjects.iter()].find(row => row.id !== project.id)!;
  await owner.conn.reducers.uploadReference({ projectId: unrelatedProject.id, filename: 'private.md', purpose: 'design', bytes: new TextEncoder().encode('other-project-marker: never include this') });
  await expect.poll(() => [...owner.conn.db.visibleReferences.iter()].length).toBe(2);
  await owner.conn.reducers.inviteMember({ organizationId: org.id, email: 'nvidia-viewer@example.test', role: 'member', projectRole: 'viewer', projectId: project.id });
  await expect.poll(() => [...viewer.conn.db.myInvitations.iter()].length).toBe(1);
  await viewer.conn.reducers.acceptInvitation({ invitationId: [...viewer.conn.db.myInvitations.iter()][0].id });
  const key = 'synthetic-operator-nvidia-credential';
  const args = { projectId: project.id, requestId: randomUUID(), request: 'Generate using every project reference' };
  expect(await viewer.conn.procedures.generateProjectChat(args).then(() => 'unexpected success', error => String(error))).toContain('edit access');
  expect(await outsider.conn.procedures.generateProjectChat(args).then(() => 'unexpected success', error => String(error))).toContain('edit access');
  await owner.conn.procedures.generateProjectChat(args);
  await expect.poll(() => { const row = [...owner.conn.db.visibleGenerationJobs.iter()][0]; return row?.state === 'failed' ? row.diagnostic : row?.state; }).toBe('draft_ready');
  const job = [...owner.conn.db.visibleGenerationJobs.iter()][0];
  expect(job.mode).toBe('gemini'); expect(job.model).toBe('gemini-3.8-flash');
  expect(JSON.parse(job.snapshot).references).toEqual([{ id: expect.any(String), filename: 'design.md', purpose: 'design', content: 'automatic-reference-marker: use the sage palette' }]);
  expect(job.artifacts).toContain('Button.tsx');
  expect(JSON.stringify([...owner.conn.db.visibleGenerationJobs.iter()], (_, value) => typeof value === 'bigint' ? String(value) : value).includes(key)).toBe(false);
  await owner.conn.procedures.generateProjectChat(args);
  await expect(owner.conn.reducers.advanceMockGeneration({ jobId: job.id, expectedState: 'draft_ready' })).rejects.toThrow('Access denied');
    await owner.conn.procedures.generateProjectChat({ ...args, requestId: randomUUID(), request: 'Rejected key fixture' });
    await expect.poll(() => [...owner.conn.db.visibleGenerationJobs.iter()].some(row => row.state === 'failed' && row.diagnostic === 'NVIDIA rejected the API key.')).toBe(true);
    expect(JSON.stringify([...viewer.conn.db.visibleGenerationJobs.iter()], (_, value) => typeof value === 'bigint' ? String(value) : value).includes(key)).toBe(false);
  for (let index = 0; index < 3; index++) await owner.conn.procedures.generateProjectChat({ ...args, requestId: randomUUID(), request: 'Explain the library' });
  expect(await owner.conn.procedures.generateProjectChat({ ...args, requestId: randomUUID(), request: 'One too many' }).then(() => 'unexpected success', error => String(error))).toContain('Chat limit reached');
  await expect.poll(() => [...viewer.conn.db.visibleGenerationJobs.iter()].length).toBe(5);
  expect([...outsider.conn.db.visibleGenerationJobs.iter()]).toHaveLength(0);
  const latest = [...owner.conn.db.visibleGenerationJobs.iter()].sort((a, b) => a.id > b.id ? -1 : 1)[0];
  expect(JSON.parse(latest.snapshot).candidateFiles[0].path).toBe('Button.tsx');
  await owner.conn.reducers.removeGeneration({ jobId: job.id });
  expect(await owner.conn.procedures.generateProjectChat({ ...args, requestId: randomUUID(), request: 'Deleted history must not reset usage' }).then(() => 'unexpected success', error => String(error))).toContain('Chat limit reached');
  const logs = spawnSync(path.resolve('.tools/spacetime/spacetimedb-cli.exe'), ['--root-dir', path.join(runDirectory, 'cli'), 'logs', '--server', uri, database], { encoding: 'utf8', windowsHide: true });
  expect(logs.status).toBe(0); expect((logs.stdout + logs.stderr).includes(key)).toBe(false);
});

test('project chat uses operator credentials, retains conversation and never asks users for a key', async ({ browser }) => {
  const token = await makeToken('nvidia-browser@example.test', 'NVIDIA Browser');
  const owner = await connect(token);
  await owner.conn.reducers.createProjectWithDetails({ name: 'Chat project', organizationId: 0n, framework: 'React', language: 'TypeScript', styling: 'Tailwind CSS', libraries: 'shadcn/ui', versions: '' });
  const project = [...owner.conn.db.visibleProjects.iter()][0];
  await owner.conn.reducers.uploadReference({ projectId: project.id, filename: 'design.md', purpose: 'design', bytes: new TextEncoder().encode('All saved references are automatic chat context.') });
  await expect.poll(() => [...owner.conn.db.visibleReferences.iter()].length).toBe(1);
  const context = await browser.newContext(); await seedBrowser(context, token);
  const page = await context.newPage(); await page.goto('/');
  await openProjectPage(page, 'Chat project'); await createBrowserComponent(page);
  await expect(page.getByLabel('NVIDIA API key', { exact: true })).toHaveCount(0);
  await expect(page.getByLabel('Generation provider', { exact: true })).toHaveCount(0);
  await expect(page.getByText('All 1 saved project reference is included automatically.')).toBeVisible();
  await expect(page.getByLabel('Reference documents for this message')).toHaveCount(0);
  await expect(page.getByText('Conversation memory starts from the current draft files and project guidance.')).toBeVisible();
  await page.getByLabel('Your message', { exact: true }).fill('Explain the library');
  await page.getByRole('button', { name: 'Send message', exact: true }).click();
  await expect(page.getByLabel('Project conversation')).toContainText('Common foundation first');
  await expect(page.locator('.chat-bubble-user')).toContainText('Explain the library');
  await expect(page.locator('.chat-bubble-assistant')).toContainText('Common foundation first');
  await expect(page.getByLabel('Your message', { exact: true })).toHaveValue('');
  await page.getByLabel('Your message', { exact: true }).fill('Generate Button');
  await page.getByRole('button', { name: 'Send message', exact: true }).click();
  await expect(page.getByTestId('candidate-source')).toHaveValue(/Draft only/);
  await expect(page.getByLabel('Project conversation')).toContainText('prepared a draft');
  const rows = [...owner.conn.db.visibleGenerationJobs.iter()].sort((a, b) => a.id < b.id ? -1 : 1);
  const snapshot = JSON.parse(rows[2].snapshot);
  expect(snapshot.conversation[0].content).toBe('Explain the library');
  expect(snapshot.conversation[1].content).toContain('Common foundation first');
  const key = 'synthetic-operator-nvidia-credential';
  expect(await page.evaluate(secret => [...Object.values(sessionStorage), ...Object.values(localStorage)].some(value => value.includes(secret)), key)).toBe(false);
  expect((await page.content()).includes(key)).toBe(false);
  expect((await page.content()).includes('synthetic-operator-gemini-credential')).toBe(false);
  await page.getByRole('button', { name: 'Preview', exact: true }).click();
  await expect(page.getByText('No published components yet')).toHaveCount(0);
  await expect(page.getByRole('alert').filter({ hasText: 'Previews are not configured.' })).toBeVisible();  // Auto-build is rejected before any provider call.
  await expect(page.locator('iframe')).toHaveCount(0);
  await page.reload();
  await expect(page.getByLabel('Project conversation')).toContainText('Common foundation first');
  await expect(page.getByLabel('Project conversation')).toContainText('prepared a draft');
  await context.close();
});

test('operator credentials are required and missing configuration produces an actionable chat state', async ({ browser }) => {
  publish(path.resolve('spacetimedb'), true, 'missing-gemini');
  try {
    const token = await makeToken('chat-unconfigured@example.test', 'Unconfigured');
    const owner = await connect(token);
    await owner.conn.reducers.createProjectWithDetails({ name: 'Unconfigured chat', organizationId: 0n, framework: 'React', language: '', styling: '', libraries: '', versions: '' });
    await expect.poll(() => [...owner.conn.db.visibleProjects.iter()].length).toBe(1);
    const project = [...owner.conn.db.visibleProjects.iter()][0];
    expect(await owner.conn.procedures.generateProjectChat({ projectId: project.id, requestId: randomUUID(), request: 'Hello' }).then(() => 'unexpected success', error => String(error))).toContain('Contact the operator');
    expect([...owner.conn.db.visibleGenerationJobs.iter()]).toHaveLength(0);
    const context = await browser.newContext(); await seedBrowser(context, token);
    const page = await context.newPage(); await page.goto('/'); await openProjectPage(page, project.name);
    await expect(page.getByText('Chat is unavailable until the ComPlix operator configures the AI service.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Send message', exact: true })).toBeDisabled();
    await context.close();
  } finally { publish(path.resolve('spacetimedb'), true); }
});


test('a slow chat reply shows elapsed time and can be cancelled without hiding the draft', async ({ browser }) => {
  const token = await makeToken('slow-chat@example.test', 'Slow Chat');
  const owner = await connect(token);
  await owner.conn.reducers.createProjectWithDetails({ name: 'Slow chat project', organizationId: 0n, framework: 'React', language: 'TypeScript', styling: '', libraries: '', versions: '' });
  const context = await browser.newContext(); await seedBrowser(context, token);
  const page = await context.newPage(); await page.goto('/'); await openProjectPage(page, 'Slow chat project'); await createBrowserComponent(page);
  await page.clock.install();
  await page.getByLabel('Your message', { exact: true }).fill('Pending reply fixture');
  await page.getByRole('button', { name: 'Send message', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Cancel reply', exact: true })).toBeVisible();
  await expect(page.getByText('Gemini is coordinating', { exact: false })).toBeVisible();
  await page.clock.fastForward(65000);
  await expect(page.getByText('This is taking longer than expected.', { exact: false })).toBeVisible();
  await page.getByRole('button', { name: 'Cancel reply', exact: true }).click();
  await expect(page.getByLabel('Project conversation')).toContainText('Cancelled. Existing working content was not changed.');
  await expect(page.getByRole('button', { name: 'Cancel reply', exact: true })).toHaveCount(0);
  await page.getByLabel('Your message', { exact: true }).fill('Explain the library');
  await expect(page.getByRole('button', { name: 'Send message', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'Send message', exact: true }).click();
  await expect(page.getByLabel('Project conversation')).toContainText('Common foundation first');
  await context.close();
});


test('a backend deadline expires an abandoned AI job without a connected browser', async () => {
  const token = await makeToken('deadline-chat@example.test', 'Deadline Chat');
  const owner = await connect(token);
  await owner.conn.reducers.createProjectWithDetails({ name: 'Deadline project', organizationId: 0n, framework: 'React', language: '', styling: '', libraries: '', versions: '' });
  await expect.poll(() => [...owner.conn.db.visibleProjects.iter()].length).toBe(1);
  const projectId = [...owner.conn.db.visibleProjects.iter()][0].id;
  await owner.conn.procedures.generateProjectChat({ projectId, requestId: randomUUID(), request: 'Deadline reply fixture' });
  await expect.poll(() => [...owner.conn.db.visibleGenerationJobs.iter()][0]?.state).toBe('generating');
  owner.conn.disconnect();
  // No browser/client is required to run the private scheduled deadline.
  await new Promise(resolve => setTimeout(resolve, 2600));
  const returning = await connect(token);
  await expect.poll(() => [...returning.conn.db.visibleGenerationJobs.iter()][0]?.state).toBe('failed');
  expect([...returning.conn.db.visibleGenerationJobs.iter()][0].diagnostic).toContain('exceeded its deadline');
  await returning.conn.procedures.generateProjectChat({ projectId, requestId: randomUUID(), request: 'Explain the library' });
  await expect.poll(() => [...returning.conn.db.visibleGenerationJobs.iter()].some(row => row.state === 'draft_ready')).toBe(true);
});


test('chat shows the safe follow-up rejection and retains the unsent message', async ({ browser }) => {
  const token = await makeToken('chat-error-detail@example.test', 'Chat Error Detail');
  const owner = await connect(token);
  await owner.conn.reducers.createProjectWithDetails({ name: 'Chat error project', organizationId: 0n, framework: 'React', language: '', styling: '', libraries: '', versions: '' });
  await expect.poll(() => [...owner.conn.db.visibleProjects.iter()].length).toBe(1);
  const projectId = [...owner.conn.db.visibleProjects.iter()][0].id;
  for (let index = 0; index < 5; index++) await owner.conn.procedures.generateProjectChat({ projectId, requestId: randomUUID(), request: 'Explain the library' });
  const context = await browser.newContext(); await seedBrowser(context, token);
  const page = await context.newPage(); await page.goto('/'); await openProjectPage(page, 'Chat error project'); await createBrowserComponent(page);
  await page.getByLabel('Your message', { exact: true }).fill('Keep this follow-up');
  await page.getByRole('button', { name: 'Send message', exact: true }).click();
  const chat = page.getByRole('complementary', { name: 'Chat with ComPlix', exact: true });
  await expect(chat.getByRole('alert')).toHaveText('Chat limit reached. Wait a minute before sending another message.');
  await expect(page.getByLabel('Your message', { exact: true })).toHaveValue('Keep this follow-up');
  expect([...owner.conn.db.visibleGenerationJobs.iter()]).toHaveLength(6);
  await context.close();
});


test('component threads isolate context and clearing preserves drafts and identity usage', async () => {
  const owner = await connect(await makeToken('component-owner@example.test', 'Component Owner'));
  const outsider = await connect(await makeToken('component-outsider@example.test', 'Outsider'));
  await owner.conn.reducers.createProjectWithDetails({ name: 'Scoped library', organizationId: 0n, framework: 'React', language: 'TypeScript', styling: 'Tailwind CSS', libraries: 'shadcn/ui', versions: '' });
  const project = [...owner.conn.db.visibleProjects.iter()][0];
  await expect(owner.conn.reducers.createComponent({ projectId: project.id, name: '../escape', category: 'common' })).rejects.toThrow('component name');
  await owner.conn.reducers.createComponent({ projectId: project.id, name: 'Button', category: 'common' });
  await owner.conn.reducers.createComponent({ projectId: project.id, name: 'Panel', category: 'composition' });
  const components = [...owner.conn.db.visibleComponents.iter()];
  const button = components.find(row => row.name === 'Button')!;
  const panel = components.find(row => row.name === 'Panel')!;
  await expect(owner.conn.reducers.createComponent({ projectId: project.id, name: 'button', category: 'common' })).rejects.toThrow('already exists');
  await expect(outsider.conn.reducers.clearComponentChat({ componentId: button.id })).rejects.toThrow('edit access');
  await expect(outsider.conn.reducers.createComponent({ projectId: project.id, name: 'Bad', category: 'common' })).rejects.toThrow('edit access');
  const send = (componentId: bigint, request = 'Explain the library') => owner.conn.procedures.generateProjectChat({ projectId: project.id, componentId, requestId: randomUUID(), request });
  await send(button.id);
  await send(panel.id);
  const panelJob = [...owner.conn.db.visibleGenerationJobs.iter()].find(row => row.componentId === panel.id && row.request === 'Explain the library')!;
  expect(JSON.parse(panelJob.snapshot).conversation).toEqual([]);
  expect(JSON.parse(panelJob.snapshot).commonContracts[0].name).toBe('Button');
  expect([...owner.conn.db.visibleComponentChat.iter()].filter(row => row.componentId === button.id)).toHaveLength(2);
  const before = [...owner.conn.db.visibleComponentDrafts.iter()].filter(row => row.componentId === button.id);
  await owner.conn.reducers.clearComponentChat({ componentId: button.id });
  expect([...owner.conn.db.visibleComponentChat.iter()].filter(row => row.componentId === button.id)).toHaveLength(0);
  expect([...owner.conn.db.visibleComponentDrafts.iter()].filter(row => row.componentId === button.id)).toEqual(before);
  expect([...owner.conn.db.visibleComponentChat.iter()].filter(row => row.componentId === panel.id)).toHaveLength(2);
  await send(button.id);
  const latest = [...owner.conn.db.visibleGenerationJobs.iter()].sort((a,b) => a.id > b.id ? -1 : 1)[0];
  expect(JSON.parse(latest.snapshot).conversation).toEqual([]);
  expect(JSON.parse(latest.snapshot).candidateFiles.length).toBeGreaterThan(0);
  await send(button.id); await send(panel.id);
  await owner.conn.reducers.clearComponentChat({ componentId: button.id });
  expect([...owner.conn.db.visibleGenerationJobs.iter()].filter(row => row.request === 'Explain the library')).toHaveLength(5);
  const finalResult = await send(button.id).then(value => JSON.stringify(value), error => String(error));
  expect(finalResult).toContain('Chat limit reached');
  expect([...outsider.conn.db.visibleComponents.iter()]).toHaveLength(0);
  expect([...outsider.conn.db.visibleComponentChat.iter()]).toHaveLength(0);
});


test('component explorer creates drafts, restores selection and clears only the selected chat', async ({ browser }) => {
  const token = await makeToken('component-browser@example.test', 'Component Browser');
  const owner = await connect(token);
  await owner.conn.reducers.createProjectWithDetails({ name: 'Component UI', organizationId: 0n, framework: 'React', language: 'TypeScript', styling: 'Tailwind CSS', libraries: 'shadcn/ui', versions: '' });
  const context = await browser.newContext(); await seedBrowser(context, token);
  const page = await context.newPage(); await page.goto('/'); await openProjectPage(page, 'Component UI');
  await page.getByRole('button', { name: '+ New Component', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'New component', exact: true });
  await dialog.getByLabel('Component name', { exact: true }).fill('Button');
  await dialog.getByRole('button', { name: 'Create component', exact: true }).click();
  await expect(dialog).not.toBeVisible();
  await expect(page).toHaveURL(/selected=\d+/);
  await expect(page.getByRole('heading', { name: 'Chat: Button', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Code', exact: true }).click();
  const code = page.getByLabel('Candidate code', { exact: true });
  await expect(code).toBeEditable();
  await code.fill('# My saved Button documentation');
  await expect(page.getByTestId('draft-save-status')).toHaveText('Draft saved');
  await page.getByLabel('Your message', { exact: true }).fill('Explain the library');
  await page.getByRole('button', { name: 'Send message', exact: true }).click();
  await expect(page.locator('.chat-bubble-assistant')).toContainText('Common foundation first');
  await page.getByRole('button', { name: 'Clear chat', exact: true }).click();
  await page.getByRole('button', { name: 'Confirm clear chat', exact: true }).click();
  await expect(page.locator('.chat-bubble')).toHaveCount(0);
  await expect(code).toHaveValue('# My saved Button documentation');
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Chat: Button', exact: true })).toBeVisible();
  await expect(code).toHaveValue('# My saved Button documentation');
  await page.getByRole('button', { name: '+ New Component', exact: true }).click();
  await dialog.getByLabel('Component name', { exact: true }).fill('Button');
  await dialog.getByRole('button', { name: 'Create component', exact: true }).click();
  await expect(dialog.getByRole('alert')).toContainText('already exists');
  await expect(dialog.getByLabel('Component name', { exact: true })).toHaveValue('Button');
  await dialog.getByLabel('Component name', { exact: true }).fill('Panel');
  await dialog.getByLabel('Composition', { exact: true }).check();
  await dialog.getByRole('button', { name: 'Create component', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Chat: Panel', exact: true })).toBeVisible();
  await page.goBack();
  await expect(page.getByRole('heading', { name: 'Chat: Button', exact: true })).toBeVisible();
  await context.close();
});


test('clearing a component cancels pending replies and rejects drafts from a sibling component', async () => {
  const owner = await connect(await makeToken('pending-component@example.test', 'Pending Component'));
  await owner.conn.reducers.createProjectWithDetails({ name: 'Pending component', organizationId: 0n, framework: 'Blazor', language: 'C#', styling: 'Bootstrap', libraries: '', versions: '' });
  const projectId = [...owner.conn.db.visibleProjects.iter()][0].id;
  await owner.conn.reducers.createComponent({ projectId, name: 'Button', category: 'common' });
  await owner.conn.reducers.createComponent({ projectId, name: 'Panel', category: 'composition' });
  const components = [...owner.conn.db.visibleComponents.iter()];
  const button = components.find(row => row.name === 'Button')!;
  const panel = components.find(row => row.name === 'Panel')!;
  const starter = [...owner.conn.db.visibleGenerationJobs.iter()].find(row => row.componentId === button.id)!;
  const draft = [...owner.conn.db.visibleComponentDrafts.iter()].find(row => row.jobId === starter.id)!;
  expect(draft.files.some(file => file.path.endsWith('.razor'))).toBe(true);
  const invalid = await owner.conn.procedures.generateProjectChat({ projectId, componentId: panel.id, sourceJobId: starter.id, expectedDraftRevision: 0n, requestId: randomUUID(), request: 'Explain the library' }).then(() => '', cause => String(cause));
  expect(invalid).toContain('Selected draft is unavailable');
  await owner.conn.procedures.generateProjectChat({ projectId, componentId: button.id, requestId: randomUUID(), request: 'Pending reply fixture' });
  const pending = [...owner.conn.db.visibleGenerationJobs.iter()].find(row => row.state === 'generating')!;
  expect(pending.componentId).toBe(button.id);
  await owner.conn.reducers.clearComponentChat({ componentId: button.id });
  expect([...owner.conn.db.visibleGenerationJobs.iter()].find(row => row.id === pending.id)?.state).toBe('cancelled');
  expect([...owner.conn.db.visibleComponentChat.iter()]).toHaveLength(0);
  expect([...owner.conn.db.visibleComponentDrafts.iter()].find(row => row.jobId === starter.id)).toEqual(draft);
});


test('accepted chat crosses application credential expiry while new requests still require a valid session', async () => {
  const token = await makeToken('accepted-chat-expiry@example.test', 'Accepted Chat');
  const owner = await connect(token);
  await owner.conn.reducers.createProjectWithDetails({ name: 'Expiry-safe chat', organizationId: 0n, framework: 'React', language: 'TypeScript', styling: 'Tailwind CSS', libraries: 'shadcn/ui', versions: '' });
  const projectId = [...owner.conn.db.visibleProjects.iter()][0].id;
  const claims = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString());
  const expiry = Math.floor(Date.now() / 1000) + 2;
  // Local development JWTs are normalized by the test server. The instrumented
  // module uses this signed fixture claim as its application expiry boundary.
  const short = await connect(signed({ ...claims, fixture_exp: expiry }));
  const requestId = randomUUID();
  await short.conn.procedures.generateProjectChat({ projectId, requestId, request: 'Token expiry fixture' });
  await expect.poll(() => [...owner.conn.db.visibleGenerationJobs.iter()].find(row => row.requestId === requestId)?.diagnostic).toContain('unverified draft');
  expect(Date.now()).toBeGreaterThanOrEqual(expiry * 1000);
  const rejected = await short.conn.procedures.generateProjectChat({ projectId, requestId: randomUUID(), request: 'Explain the library' }).then(() => '', cause => String(cause));
  expect(rejected).toContain('session expired');
  await expect(short.conn.reducers.createComponent({ projectId, name: 'Expired', category: 'common' })).rejects.toThrow('session expired');
  await owner.conn.procedures.generateProjectChat({ projectId, requestId: randomUUID(), request: 'Truncated draft fixture' });
  const incomplete = [...owner.conn.db.visibleGenerationJobs.iter()].find(row => row.request === 'Truncated draft fixture')!;
  expect(incomplete.state).toBe('draft_ready');
  expect(JSON.parse(incomplete.artifacts).files).toEqual([]);
  expect(JSON.parse(incomplete.artifacts).reply).toContain('saved draft is intact');
});


test('renewal follows the actual ID token when the stored OIDC profile says it expires later', async ({ browser }) => {
  const owner = await connect(await makeToken('raw-expiry@example.test', 'Raw Expiry'));
  await owner.conn.reducers.createProjectWithDetails({ name: 'Renewed component creation', organizationId: 0n, framework: 'React', language: 'TypeScript', styling: 'Tailwind CSS', libraries: 'shadcn/ui', versions: '' });
  const token = owner.token;
  const claims = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString());
  const shortToken = signed({ ...claims, exp: Math.floor(Date.now() / 1000) + 60 });
  const context = await browser.newContext();
  await seedBrowser(context, shortToken, 'raw-expiry-refresh', Math.floor(Date.now() / 1000) + 3600);
  // Model a stale/user-info merged profile: its expiry must not override the credential.
  await context.addInitScript(() => {
    for (const key of Object.keys(sessionStorage)) if (key.startsWith('oidc.user:')) {
      const user = JSON.parse(sessionStorage.getItem(key)!);
      user.profile.exp = Math.floor(Date.now() / 1000) + 3600;
      sessionStorage.setItem(key, JSON.stringify(user));
    }
  });
  let refreshes = 0;
  await context.route('https://auth.spacetimedb.com/**', route => {
    if (route.request().url().includes('.well-known')) return route.fulfill({ json: { issuer: authority, authorization_endpoint: authority + '/authorize', token_endpoint: authority + '/token', jwks_uri: authority + '/jwks' } });
    if (new URLSearchParams(route.request().postData() ?? '').get('grant_type') !== 'refresh_token') return route.abort();
    refreshes++;
    return route.fulfill({ json: { id_token: token, access_token: 'raw-expiry-new-access', refresh_token: 'raw-expiry-rotated', token_type: 'Bearer', expires_in: 3600 } });
  });
  const page = await context.newPage(); await page.goto('/');
  await expect.poll(() => refreshes).toBe(1);
  await expect(page.getByTestId('profile-email')).toHaveText('raw-expiry@example.test');
  const stored = await page.evaluate(() => Object.keys(sessionStorage).filter(key => key.startsWith('oidc.user:')).map(key => JSON.parse(sessionStorage.getItem(key)!)));
  expect(stored[0].id_token).toBe(token);
  await openProjectPage(page, 'Renewed component creation');
  await createBrowserComponent(page, 'RenewedButton');
  await expect(page.getByRole('heading', { name: 'Chat: RenewedButton', exact: true })).toBeVisible();
  await context.close();
});


test('saved history does not block live chat and mock history limits do not count component starters', async () => {
  const owner = await connect(await makeToken('history-cap@example.test', 'History Cap'));
  await owner.conn.reducers.createProjectWithDetails({ name: 'Long-lived library', organizationId: 0n, framework: 'React', language: 'TypeScript', styling: 'Tailwind CSS', libraries: 'shadcn/ui', versions: '' });
  const projectId = [...owner.conn.db.visibleProjects.iter()][0].id;
  for (let i = 0; i < 20; i++) await owner.conn.reducers.createComponent({ projectId, name: 'Item' + i, category: 'common' });
  const before = [...owner.conn.db.visibleComponentDrafts.iter()];
  const componentId = [...owner.conn.db.visibleComponents.iter()][0].id;
  const send = () => owner.conn.procedures.generateProjectChat({ projectId, componentId, requestId: randomUUID(), request: 'Explain the library' });
  await send();
  expect([...owner.conn.db.visibleGenerationJobs.iter()]).toHaveLength(21);
  for (let i = 0; i < 20; i++) {
    const requestId = randomUUID();
    await owner.conn.reducers.createGeneration({ projectId, requestId, request: 'Mock history ' + i, scenario: 'success' });
    const job = [...owner.conn.db.visibleGenerationJobs.iter()].find(row => row.requestId === requestId)!;
    await owner.conn.reducers.cancelGeneration({ jobId: job.id });
  }
  await expect(owner.conn.reducers.createGeneration({ projectId, requestId: randomUUID(), request: 'Mock over limit', scenario: 'success' })).rejects.toThrow('history limit');
  await send();
  expect([...owner.conn.db.visibleGenerationJobs.iter()]).toHaveLength(42);
  expect([...owner.conn.db.visibleComponentDrafts.iter()]).toEqual(before);
  for (let i = 0; i < 3; i++) await send();
  await owner.conn.reducers.clearComponentChat({ componentId });
  const rejected = await send().then(() => '', cause => String(cause));
  expect(rejected).toContain('Chat limit reached');
  expect([...owner.conn.db.visibleGenerationJobs.iter()]).toHaveLength(45);
  expect([...owner.conn.db.visibleComponentDrafts.iter()]).toEqual(before);
});

const reactStack = { framework: 'React', language: 'TypeScript', styling: 'Tailwind CSS', libraries: 'shadcn/ui', versions: '' };
test('project setup requires input and generates starter components server-side as the requester', async () => {
  const owner = await connect(await makeToken('setup-owner@example.test', 'Setup Owner'));
  const outsider = await connect(await makeToken('setup-outsider@example.test', 'Setup Outsider'));
  await owner.conn.reducers.createSetupProject({ name: 'Starter project', organizationId: 0n, ...reactStack });
  const find = () => [...owner.conn.db.visibleProjects.iter()].find(row => row.name === 'Starter project')!;
  const projectId = find().id;
  expect(find().setupState).toBe('setup');
  await expect(owner.conn.reducers.startStarterLibrary({ projectId, starterIds: ['button'] })).rejects.toThrow('Answer the questionnaire or upload at least one document');
  await expect(owner.conn.reducers.finishProjectSetup({ projectId })).rejects.toThrow('Answer the questionnaire or upload at least one document');
  await expect(owner.conn.reducers.saveQuestionnaire({ projectId, expectedRevision: 0n, answers: '{"theme":"Neon"}' })).rejects.toThrow('Questionnaire answers are invalid');
  await expect(outsider.conn.reducers.saveQuestionnaire({ projectId, expectedRevision: 0n, answers: '{"theme":"Dark"}' })).rejects.toThrow('Project edit access is required.');
  await owner.conn.reducers.saveQuestionnaire({ projectId, expectedRevision: 0n, answers: JSON.stringify({ theme: 'Dark', primaryColor: '#123ABC', corners: 'Rounded (8px)' }) });
  let guidance = [...owner.conn.db.visibleGuidance.iter()].find(row => row.projectId === projectId)!;
  expect(guidance.colors).toBe('Primary color: #123abc.');
  expect(guidance.style).toContain('Corner radius: Rounded (8px).');
  // Editing guidance text afterwards keeps the structured answers.
  await owner.conn.reducers.saveGuidance({ projectId, expectedRevision: guidance.revision, audience: guidance.audience, technical: '', style: guidance.style, colors: guidance.colors,
    typography: guidance.typography, spacing: guidance.spacing, accessibility: guidance.accessibility, guidance: 'Free-form rule' });
  guidance = [...owner.conn.db.visibleGuidance.iter()].find(row => row.projectId === projectId)!;
  expect(guidance.guidance).toBe('Free-form rule');
  expect(JSON.parse(guidance.questionnaire).theme).toBe('Dark');
  await expect(outsider.conn.reducers.startStarterLibrary({ projectId, starterIds: ['button'] })).rejects.toThrow('Project edit access is required.');
  await expect(owner.conn.reducers.startStarterLibrary({ projectId, starterIds: [] })).rejects.toThrow('Choose at least one starter component.');
  await expect(owner.conn.reducers.startStarterLibrary({ projectId, starterIds: ['button', 'carousel'] })).rejects.toThrow('Choose at least one starter component.');
  await owner.conn.reducers.startStarterLibrary({ projectId, starterIds: ['button', 'kpi-card'] });
  const tasks = () => [...owner.conn.db.visibleStarterTasks.iter()].filter(row => row.projectId === projectId).sort((a, b) => a.position - b.position);
  expect(tasks().map(row => row.starterId)).toEqual(['button', 'kpi-card']);
  expect([...outsider.conn.db.visibleStarterTasks.iter()]).toHaveLength(0);
  await expect.poll(() => tasks().map(row => row.state).join(','), { timeout: 30000 }).toBe('done,done');
  await expect.poll(() => find().setupState).toBe('ready');
  const components = [...owner.conn.db.visibleComponents.iter()].filter(row => row.projectId === projectId);
  expect(components.map(row => row.name).sort()).toEqual(['Button', 'KpiCard']);
  const ownerIdentity = [...owner.conn.db.myProfile.iter()][0].identity;
  for (const task of tasks()) {
    const job = [...owner.conn.db.visibleGenerationJobs.iter()].find(row => row.id === task.jobId)!;
    expect(job.state).toBe('draft_ready');
    expect(job.componentId).toBe(task.componentId);
    expect(job.requestedBy.isEqual(ownerIdentity)).toBe(true);
    expect(job.request).toContain('Create the starter Common component');
    expect(JSON.parse(job.artifacts).files.map((file: { path: string }) => file.path)).toContain('Button.tsx');
    expect(JSON.parse(job.snapshot).guidance.colors).toBe('Primary color: #123abc.');
    expect(job.snapshot).not.toContain('synthetic-operator-');
    expect([...owner.conn.db.visibleComponentChat.iter()].filter(row => row.componentId === task.componentId).map(row => row.role)).toEqual(['user', 'assistant']);
  }
  await expect(owner.conn.reducers.startStarterLibrary({ projectId, starterIds: ['modal'] })).rejects.toThrow('Starter components can only be generated during project setup.');
  // The starter run does not use up the requester's live chat allowance.
  for (let index = 0; index < 5; index++) await owner.conn.procedures.generateProjectChat({ projectId, requestId: randomUUID(), request: 'Explain the library', componentId: components[0].id });
});

test('a failed starter component keeps the others, finishes setup and can be retried', async () => {
  const owner = await connect(await makeToken('starter-retry@example.test', 'Starter Retry'));
  const outsider = await connect(await makeToken('starter-retry-outsider@example.test', 'Retry Outsider'));
  await owner.conn.reducers.createSetupProject({ name: 'Failing starter project', organizationId: 0n, framework: 'Blazor', language: 'C#', styling: 'Bootstrap', libraries: '', versions: '' });
  const find = () => [...owner.conn.db.visibleProjects.iter()].find(row => row.name === 'Failing starter project')!;
  const projectId = find().id;
  // A document alone satisfies the setup requirement.
  await owner.conn.reducers.uploadReference({ projectId, filename: 'style.md', purpose: 'design', bytes: new TextEncoder().encode('# Style\nUse teal accents.') });
  await owner.conn.reducers.startStarterLibrary({ projectId, starterIds: ['button', 'kpi-card'] });
  const tasks = () => [...owner.conn.db.visibleStarterTasks.iter()].filter(row => row.projectId === projectId).sort((a, b) => a.position - b.position);
  await expect.poll(() => tasks().map(row => row.state).join(','), { timeout: 30000 }).toBe('done,failed');
  expect(tasks()[1].message).toBe('Gemini is temporarily unavailable. Try again later.');
  await expect.poll(() => find().setupState).toBe('ready');
  const kpi = [...owner.conn.db.visibleComponents.iter()].find(row => row.projectId === projectId && row.name === 'KpiCard')!;
  expect([...owner.conn.db.visibleComponentDrafts.iter()].some(row => row.componentId === kpi.id && row.files.some(file => file.path === 'Common/KpiCard/README.md'))).toBe(true);
  await expect(outsider.conn.reducers.retryStarterTask({ taskId: tasks()[1].id })).rejects.toThrow('Project edit access is required.');
  await owner.conn.reducers.retryStarterTask({ taskId: tasks()[1].id });
  await expect.poll(() => tasks().map(row => row.state).join(','), { timeout: 30000 }).toBe('done,done');
  await expect.poll(() => find().setupState).toBe('ready');
});

test('PDF references store original bytes with extracted text and satisfy the setup requirement', async () => {
  const owner = await connect(await makeToken('pdf-owner@example.test', 'PDF Owner'));
  const outsider = await connect(await makeToken('pdf-outsider@example.test', 'PDF Outsider'));
  await owner.conn.reducers.createSetupProject({ name: 'PDF setup project', organizationId: 0n, ...reactStack });
  const find = () => [...owner.conn.db.visibleProjects.iter()].find(row => row.name === 'PDF setup project')!;
  const projectId = find().id;
  const pdf = textPdf('Brand guide');
  const upload = { projectId, filename: 'guide.pdf', purpose: 'design', bytes: new Uint8Array(pdf), text: 'Brand guide text' };
  await expect(owner.conn.reducers.uploadPdfReference({ ...upload, bytes: new TextEncoder().encode('not a pdf at all') })).rejects.toThrow('Choose a PDF file (.pdf).');
  await expect(owner.conn.reducers.uploadPdfReference({ ...upload, text: '   ' })).rejects.toThrow('No readable text');
  await expect(owner.conn.reducers.uploadPdfReference({ ...upload, text: 'x'.repeat(33 * 1024) })).rejects.toThrow('too long');
  await expect(outsider.conn.reducers.uploadPdfReference(upload)).rejects.toThrow('Project edit access is required.');
  await owner.conn.reducers.uploadPdfReference(upload);
  const reference = [...owner.conn.db.visibleReferences.iter()].find(row => row.projectId === projectId)!;
  expect(reference.content).toBe('Brand guide text');
  expect(Buffer.from(reference.bytes).equals(pdf)).toBe(true);
  await owner.conn.reducers.finishProjectSetup({ projectId });
  await expect.poll(() => find().setupState).toBe('ready');
});

test('browser setup wizard collects a questionnaire and PDF, then shows starter progress until the library opens', async ({ browser }) => {
  // First-use pdf.js compilation in the Vite dev server plus two queued generations exceed the default budget.
  test.setTimeout(120000);
  const context = await browser.newContext();
  await seedBrowser(context, await makeToken('wizard@example.test', 'Wizard User'));
  const page = await context.newPage();
  const browserErrors: string[] = [];
  page.on('pageerror', error => browserErrors.push(error.name + ': ' + error.message));
  await page.goto('/');
  await expandProjectCreation(page);
  await page.getByLabel('Project name', { exact: true }).fill('Wizard library');
  await expect(page.getByLabel('Framework', { exact: true })).toHaveValue('React');
  await expect(page.getByLabel('shadcn/ui')).toBeChecked();
  await page.getByLabel('lucide-react').check();
  await page.getByRole('button', { name: 'Create project and start setup', exact: true }).click();
  await expect(page).toHaveURL(/\/projects\/\d+\/setup\/questionnaire$/);
  const projectPath = new URL(page.url()).pathname.replace(/\/setup\/questionnaire$/, '');
  // Other project pages wait until setup is finished.
  await page.goto(projectPath + '/components');
  await expect(page).toHaveURL(/\/setup\/questionnaire$/);
  await expect(page.getByRole('button', { name: 'Save and continue', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: /^Skip/ }).click();
  await expect(page).toHaveURL(/\/setup\/references$/);
  await expect(page.getByRole('button', { name: 'Continue to starter components', exact: true })).toBeDisabled();
  await page.getByLabel('Reference file').setInputFiles({ name: 'brand-guide.pdf', mimeType: 'application/pdf', buffer: textPdf('Wizard PDF marker') });
  await page.getByRole('button', { name: 'Upload reference', exact: true }).click();
  await expect(page.getByTestId('reference-content')).toContainText('Wizard PDF marker', { timeout: 45000 });
  await expect(page.getByText('Ready (text extracted from PDF)')).toBeVisible();
  await page.getByRole('button', { name: 'Back to questionnaire', exact: true }).click();
  await page.getByLabel('Theme', { exact: true }).selectOption('Dark');
  await page.getByLabel('Minimal', { exact: true }).check();
  await page.getByLabel('Primary brand color', { exact: true }).fill('#335577');
  await page.getByRole('button', { name: 'Save and continue', exact: true }).click();
  await expect(page).toHaveURL(/\/setup\/references$/);
  await page.getByRole('button', { name: 'Continue to starter components', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Generate 4 starter components', exact: true })).toBeEnabled();
  await page.getByRole('checkbox', { name: /Text input/ }).uncheck();
  await page.getByRole('checkbox', { name: /Modal/ }).uncheck();
  await page.getByRole('button', { name: 'Generate 2 starter components', exact: true }).click();
  await expect(page).toHaveURL(/\/setup\/progress$/);
  await expect(page.getByRole('heading', { name: 'Your starter library is ready', exact: true })).toBeVisible({ timeout: 30000 });
  await expect(page.getByTestId('starter-progress')).toHaveText('2 of 2 components finished');
  await page.getByRole('button', { name: 'Open component library', exact: true }).click();
  await expect(page).toHaveURL(/\/projects\/\d+\/components$/);
  await expect(page.getByText('Common/KpiCard', { exact: true })).toBeVisible();
  await expect(page.getByText('Common/Button', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Design guidance', exact: true }).click();
  await expect(page.getByLabel('Colors', { exact: true })).toHaveValue(/#335577/);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(projectPath + '/setup/progress');
  await expect(page.getByTestId('starter-progress')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  expect(browserErrors, 'Setup wizard has no browser runtime errors').toEqual([]);
  await context.close();
});

async function instructionProject(label: string, framework = 'React') {
  const token = await makeToken(label + '@example.test', label);
  const owner = await connect(token);
  await owner.conn.reducers.createProjectWithDetails({ name: label, organizationId: 0n, framework, language: framework === 'React' ? 'TypeScript' : 'C#', styling: '', libraries: '', versions: '' });
  const project = [...owner.conn.db.visibleProjects.iter()].find(row => row.name === label)!;
  await owner.conn.reducers.createComponent({ projectId: project.id, name: 'Button', category: 'common' });
  const component = [...owner.conn.db.visibleComponents.iter()].find(row => row.projectId === project.id)!;
  const source = [...owner.conn.db.visibleGenerationJobs.iter()].find(row => row.componentId === component.id)!;
  const original = JSON.parse(source.artifacts).files as Array<{ path: string; content: string }>;
  const path = original.find(file => file.path.endsWith(framework === 'React' ? '.tsx' : '.razor'))!.path;
  const files = (text: string) => original.map(file => file.path === path ? { ...file, content: framework === 'React'
    ? `export const Button = () => <>{/* @complix ${text} */}<button>Save</button></>;`
    : `@* @complix ${text} *@\n<button>Save</button>\n@code { string Label = "Save"; }` } : file);
  return { owner, token, project, component, source, original, files, path };
}

test('editor instructions verify saved comments, deduplicate, isolate access and preserve rate counters', async () => {
  const { owner, project, component, source, files } = await instructionProject('instruction-backend');
  const outsider = await connect(await makeToken('instruction-outsider@example.test', 'Instruction outsider'));
  await owner.conn.reducers.saveComponentDraft({ jobId: source.id, expectedRevision: 0n, files: files('Make this green') });
  const records = () => [...owner.conn.db.visibleEditorInstructions.iter()].filter(row => row.componentId === component.id);
  const instruction = records()[0];
  expect(instruction.state).toBe('pending');
  expect([...outsider.conn.db.visibleEditorInstructions.iter()]).toHaveLength(0);
  expect(await outsider.conn.procedures.runEditorInstruction({ instructionId: instruction.id, expectedRevision: 1n }).then(() => 'unexpected success', error => String(error))).toContain('Access denied');
  await expect(outsider.conn.reducers.dismissEditorInstruction({ instructionId: instruction.id })).rejects.toThrow();
  expect(await owner.conn.procedures.runEditorInstruction({ instructionId: instruction.id, expectedRevision: 0n }).then(() => 'unexpected success', error => String(error))).toContain('Draft changed');
  await expect(owner.conn.reducers.enableEditorInstruction({ sourceJobId: source.id, expectedRevision: 1n, instructionKey: 'forged' })).rejects.toThrow('unavailable');
  const run = () => owner.conn.procedures.runEditorInstruction({ instructionId: instruction.id, expectedRevision: 1n });
  await Promise.all([run(), run()]);
  const linked = records()[0];
  const result = [...owner.conn.db.visibleGenerationJobs.iter()].find(row => row.id === linked.jobId)!;
  expect(result.state).toBe('draft_ready');
  expect(JSON.parse(result.snapshot).editorInstruction).toMatchObject({ path: instruction.path, text: 'Make this green' });
  expect(JSON.parse(result.snapshot).origin).toBe('editor_comment');
  const count = [...owner.conn.db.visibleGenerationJobs.iter()].length;
  await owner.conn.reducers.saveComponentDraft({ jobId: source.id, expectedRevision: 1n, files: files('Make this green').map(file => ({ ...file, content: '\n' + file.content })) });
  expect(records()).toHaveLength(1);
  expect(records()[0].state).toBe('submitted');
  await owner.conn.reducers.clearComponentChat({ componentId: component.id });
  await run();
  expect([...owner.conn.db.visibleGenerationJobs.iter()]).toHaveLength(count);
  expect(records()[0].jobId).toBe(result.id);
  // The automatic request consumed one of the shared five-per-minute slots.
  for (let i = 0; i < 4; i++) await owner.conn.procedures.generateProjectChat({ projectId: project.id, componentId: component.id, requestId: randomUUID(), request: 'Explain the library' });
  expect(await owner.conn.procedures.generateProjectChat({ projectId: project.id, componentId: component.id, requestId: randomUUID(), request: 'Explain the library' }).then(() => 'unexpected success', error => String(error))).toContain('Chat limit reached');
});

test('Razor instructions preserve cancelled or concurrently edited drafts and never apply late files', async () => {
  for (const text of ['Cancel instruction fixture', 'Edit race fixture']) {
    const { owner, component, source, files } = await instructionProject('instruction-' + (text.startsWith('Cancel') ? 'cancel' : 'race'), 'Blazor');
    const saved = files(text);
    await owner.conn.reducers.saveComponentDraft({ jobId: source.id, expectedRevision: 0n, files: saved });
    const instruction = [...owner.conn.db.visibleEditorInstructions.iter()].find(row => row.componentId === component.id)!;
    await owner.conn.procedures.runEditorInstruction({ instructionId: instruction.id, expectedRevision: 1n });
    const record = [...owner.conn.db.visibleEditorInstructions.iter()].find(row => row.id === instruction.id)!;
    const result = [...owner.conn.db.visibleGenerationJobs.iter()].find(row => row.id === record.jobId)!;
    expect(result.state).toBe(text.startsWith('Cancel') ? 'cancelled' : 'failed');
    expect(result.artifacts).toBe('');
    const draft = [...owner.conn.db.visibleComponentDrafts.iter()].find(row => row.jobId === source.id)!;
    if (text.startsWith('Cancel')) {
      expect(result.diagnostic).toBe('Synthetic NVIDIA cancellation');
      expect(draft.files).toEqual(saved);
    } else {
      expect(draft.revision).toBe(2n);
      expect(draft.files.every(file => file.content.includes('concurrent edit'))).toBe(true);
    }
  }
});

for (const framework of ['React', 'Blazor']) test(`${framework} editor instructions run automatically after autosave and do not replay on reload`, async ({ browser }) => {
  test.setTimeout(120000);
  const { owner, token, project, component, source, files, path: sourcePath } = await instructionProject('instruction-browser-' + framework, framework);
  const context = await browser.newContext(); await seedBrowser(context, token);
  const page = await context.newPage(); await page.goto(`/projects/${project.id}/components?selected=${component.id}`);
  const select = page.getByLabel('Candidate file', { exact: true });
  await select.selectOption(sourcePath);
  const editor = page.getByLabel('Candidate code', { exact: true });
  const modified = files('Make this green').find(file => file.path === sourcePath)!.content;
  await editor.fill(modified);
  await expect(page.getByTestId('draft-save-status')).toHaveText('Draft saved');
  await expect.poll(() => [...owner.conn.db.visibleGenerationJobs.iter()].filter(row => JSON.parse(row.snapshot).origin === 'editor_comment').length).toBe(1);
  await expect(editor).toHaveValue(/Draft only/);
  const instruction = [...owner.conn.db.visibleEditorInstructions.iter()].find(row => row.componentId === component.id)!;
  expect(instruction.jobId).not.toBe(0n);
  // Force adoption of a source containing an inherited marker: it remains inert on reload.
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Chat: Button', exact: true })).toBeVisible();
  await page.waitForTimeout(3000);
  expect([...owner.conn.db.visibleGenerationJobs.iter()].filter(row => JSON.parse(row.snapshot).origin === 'editor_comment')).toHaveLength(1);
  expect([...owner.conn.db.visibleComponentDrafts.iter()].find(row => row.jobId === source.id)!.files.find(file => file.path === sourcePath)!.content).toBe(modified);
  await context.close();
});

test('instruction admission rejects oversized context and removed comments without spending a job', async () => {
  const { owner, project, component, source, original, files } = await instructionProject('instruction-context');
  await owner.conn.reducers.saveComponentDraft({ jobId: source.id, expectedRevision: 0n, files: files('Make this green') });
  const instruction = [...owner.conn.db.visibleEditorInstructions.iter()].find(row => row.componentId === component.id)!;
  await owner.conn.reducers.uploadReference({ projectId: project.id, filename: 'large.txt', purpose: 'design', bytes: new TextEncoder().encode('a'.repeat(65536)) });
  const count = [...owner.conn.db.visibleGenerationJobs.iter()].length;
  expect(await owner.conn.procedures.runEditorInstruction({ instructionId: instruction.id, expectedRevision: 1n }).then(() => 'unexpected success', error => String(error))).toContain('64 KiB');
  expect([...owner.conn.db.visibleGenerationJobs.iter()]).toHaveLength(count);
  expect([...owner.conn.db.visibleEditorInstructions.iter()].find(row => row.id === instruction.id)!.jobId).toBe(0n);
  await owner.conn.reducers.saveComponentDraft({ jobId: source.id, expectedRevision: 1n, files: original });
  expect([...owner.conn.db.visibleEditorInstructions.iter()].find(row => row.id === instruction.id)!.state).toBe('dismissed');
  await owner.conn.procedures.runEditorInstruction({ instructionId: instruction.id, expectedRevision: 1n });
  expect([...owner.conn.db.visibleGenerationJobs.iter()]).toHaveLength(count);
});

test('editor Stop generation preserves code and prevents late instruction acceptance', async ({ browser }) => {
  test.setTimeout(120000);
  const { owner, token, project, component, source, files, path: sourcePath } = await instructionProject('instruction-browser-stop');
  const context = await browser.newContext(); await seedBrowser(context, token);
  const page = await context.newPage(); await page.goto(`/projects/${project.id}/components?selected=${component.id}`);
  await page.getByLabel('Candidate file', { exact: true }).selectOption(sourcePath);
  const editor = page.getByLabel('Candidate code', { exact: true });
  const content = files('Slow instruction fixture').find(file => file.path === sourcePath)!.content;
  await editor.fill(content);
  const region = page.getByRole('region', { name: 'Editor instructions', exact: true });
  await region.getByRole('button', { name: 'Stop generation', exact: true }).click();
  await expect.poll(() => [...owner.conn.db.visibleGenerationJobs.iter()].find(row => JSON.parse(row.snapshot).origin === 'editor_comment')?.state).toBe('cancelled');
  await page.waitForTimeout(3500);
  await expect(editor).toHaveValue(content);
  const stopped = [...owner.conn.db.visibleGenerationJobs.iter()].find(row => JSON.parse(row.snapshot).origin === 'editor_comment')!;
  expect(stopped.artifacts).toBe('');
  expect([...owner.conn.db.visibleComponentDrafts.iter()].find(row => row.jobId === source.id)!.files.find(file => file.path === sourcePath)!.content).toBe(content);
  await context.close();
});

test('provider-generated instruction markers stay inert through unrelated editor saves', async () => {
  const { owner, project, component } = await instructionProject('instruction-inherited');
  await owner.conn.procedures.generateProjectChat({ projectId: project.id, componentId: component.id, requestId: randomUUID(), request: 'Generated marker fixture' });
  const generated = [...owner.conn.db.visibleGenerationJobs.iter()].find(row => row.request === 'Generated marker fixture')!;
  expect(generated.state).toBe('draft_ready');
  const files = JSON.parse(generated.artifacts).files as Array<{ path: string; content: string }>;
  expect(files.some(file => file.content.includes('@complix'))).toBe(true);
  const records = () => [...owner.conn.db.visibleEditorInstructions.iter()].filter(row => row.componentId === component.id);
  expect(records()).toHaveLength(0);
  await owner.conn.reducers.saveComponentDraft({ jobId: generated.id, expectedRevision: 0n, files: files.map(file => ({ ...file, content: file.content + '\n' })) });
  expect(records()).toHaveLength(0);
  await owner.conn.reducers.enableEditorInstruction({ sourceJobId: generated.id, expectedRevision: 1n, instructionKey: JSON.stringify(['button.tsx', 'Do not auto-run generated text']) });
  expect(records()).toHaveLength(1);
  expect(records()[0].state).toBe('pending');
});
