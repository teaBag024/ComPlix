import { test, expect } from '@playwright/test';
import { spawn, spawnSync, type ChildProcess } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { DbConnection, tables } from '../src/module_bindings';
import { ensureLocalKeys } from '../scripts/local-keys.mjs';

const uri = 'http://127.0.0.1:3100';
const database = 'complix-test';
const executable = path.resolve('.tools/spacetime/spacetimedb-standalone.exe');
const runDirectory = path.resolve('.local/e2e', randomUUID());
let server: ChildProcess;
const clients: DbConnection[] = [];

async function waitForServer() {
  await expect.poll(async () => {
    try { return (await fetch(`${uri}/v1/ping`)).ok; } catch { return false; }
  }, { timeout: 20000 }).toBe(true);
}

async function startServer() {
  mkdirSync(runDirectory, { recursive: true });
  const keys = ensureLocalKeys(path.join(runDirectory, 'keys'));
  server = spawn(executable, ['start', '--listen-addr', '127.0.0.1:3100', '--data-dir', path.join(runDirectory, 'data'),
    '--jwt-priv-key-path', keys.privateKeyPath,
    '--jwt-pub-key-path', keys.publicKeyPath, '--non-interactive'], { stdio: 'ignore', windowsHide: true });
  await waitForServer();
  if (server.exitCode !== null) throw new Error('Test server failed to start (port 3100 must be free).');
}

async function stopServer() {
  clients.splice(0).forEach(conn => conn.disconnect());
  if (!server || server.exitCode !== null || server.signalCode !== null) return;
  const stopped = new Promise<void>(resolve => server.once('exit', () => resolve()));
  server.kill();
  await stopped;
}

async function connect(token?: string) {
  return new Promise<{ conn: DbConnection; token: string }>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Client connection timed out.')), 10000);
    const conn = DbConnection.builder().withUri(uri).withDatabaseName(database).withToken(token)
      .onConnect((ctx, _identity, credential) => {
        ctx.subscriptionBuilder().onApplied(() => {
          clearTimeout(timer);
          resolve({ conn: ctx, token: credential });
        }).onError(() => { clearTimeout(timer); reject(new Error('Subscription failed.')); }).subscribe(tables.myProject);
      })
      .onConnectError(() => { clearTimeout(timer); reject(new Error('Client connection failed.')); })
      .build();
    clients.push(conn);
  });
}

test.beforeAll(async () => {
  await startServer();
  const publish = spawnSync(path.resolve('.tools/spacetime/spacetimedb-cli.exe'), ['--root-dir', path.join(runDirectory, 'cli'),
    'publish', '--server', uri, '--module-path', 'spacetimedb', '--delete-data=never', '--yes=skip-login', database],
    { encoding: 'utf8', windowsHide: true, timeout: 60000 });
  // Do not print CLI output: it can contain local identity information.
  expect(publish.status, 'Test module publishes without deleting existing data').toBe(0);
});
test.afterAll(stopServer);

test('server validates input, isolates identities, enforces one project, and persists across restart', async () => {
  const a = await connect();
  const b = await connect();
  for (const name of ['   ', 'x'.repeat(81), 'hello\u0001world']) {
    await expect(a.conn.reducers.createProject({ name, outputStack: 'blazor-bootstrap' })).rejects.toThrow('Project name');
  }
  await expect(a.conn.reducers.createProject({ name: 'Invalid', outputStack: 'angular' })).rejects.toThrow('supported output profile');
  expect([...a.conn.db.myProject.iter()]).toHaveLength(0);
  await a.conn.reducers.createProject({ name: '  Owner A  ', outputStack: 'blazor-bootstrap' });
  await expect.poll(() => [...a.conn.db.myProject.iter()].length).toBe(1);
  const row = [...a.conn.db.myProject.iter()][0];
  expect(row.name).toBe('Owner A');
  expect(row.outputStack).toBe('blazor-bootstrap');
  expect([...b.conn.db.myProject.iter()]).toHaveLength(0);
  await expect(a.conn.reducers.createProject({ name: 'Duplicate', outputStack: 'react-ts-tailwind-shadcn' })).rejects.toThrow('already have');
  await expect(b.conn.reducers.renameProject({ projectId: row.id, name: 'Stolen' })).rejects.toThrow('access denied');
  await expect(a.conn.reducers.renameProject({ projectId: row.id, name: ' ' })).rejects.toThrow('Project name');
  const privateRead = await fetch(`${uri}/v1/database/${database}/sql`, {
    method: 'POST', headers: { Authorization: `Bearer ${b.token}`, 'Content-Type': 'text/plain' }, body: 'SELECT * FROM project',
  });
  expect(privateRead.ok, 'Private table cannot be queried directly').toBe(false);
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Private subscription was not rejected.')), 10000);
    b.conn.subscriptionBuilder().onError(() => { clearTimeout(timer); resolve(); })
      .onApplied(() => { clearTimeout(timer); reject(new Error('Private subscription unexpectedly accepted.')); })
      .subscribe('SELECT * FROM project');
  });
  const scopedRead = await fetch(`${uri}/v1/database/${database}/sql`, {
    method: 'POST', headers: { Authorization: `Bearer ${b.token}`, 'Content-Type': 'text/plain' }, body: 'SELECT * FROM my_project',
  });
  expect(scopedRead.ok).toBe(true);
  expect(JSON.stringify(await scopedRead.json())).not.toContain('Owner A');
  await b.conn.reducers.createProject({ name: 'Owner B', outputStack: 'react-ts-tailwind-shadcn' });
  await expect.poll(() => [...b.conn.db.myProject.iter()].length).toBe(1);
  expect([...a.conn.db.myProject.iter()][0].name).toBe('Owner A');
  const token = a.token;
  await stopServer();
  await startServer();
  const restored = await connect(token);
  expect([...restored.conn.db.myProject.iter()].map(project => project.name)).toEqual(['Owner A']);
});

test('browser creates, reloads and receives edits in another tab through subscriptions', async ({ page, context }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Create your project' })).toBeVisible();
  await page.getByLabel('Project name', { exact: true }).fill('Browser project');
  await page.getByLabel('Generated output profile').selectOption('react-ts-tailwind-shadcn');
  await page.getByRole('button', { name: 'Create project', exact: true }).click();
  await expect(page.getByTestId('project-name')).toHaveText('Browser project');
  const owner = await page.getByTestId('owner').textContent();
  await page.reload();
  await expect(page.getByTestId('project-name')).toHaveText('Browser project');
  await expect(page.getByTestId('owner')).toHaveText(owner!);
  const second = await context.newPage();
  await second.goto('/');
  await expect(second.getByTestId('project-name')).toHaveText('Browser project');
  await page.getByLabel('New project name').fill('Live rename');
  await page.getByRole('button', { name: 'Rename project' }).click();
  await expect(second.getByTestId('project-name')).toHaveText('Live rename');
  await page.getByLabel('New project name').fill('   ');
  await page.getByRole('button', { name: 'Rename project' }).click();
  await expect(page.getByRole('alert')).toContainText('Project name');
  await expect(second.getByTestId('project-name')).toHaveText('Live rename');
});

test('browser can select the Blazor profile', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Project name', { exact: true }).fill('Blazor project');
  await page.getByLabel('Generated output profile').selectOption('blazor-bootstrap');
  await page.getByRole('button', { name: 'Create project', exact: true }).click();
  await expect(page.getByTestId('project-name')).toHaveText('Blazor project');
  await expect(page.getByRole('definition').first()).toHaveText('Blazor + Bootstrap');
});

test('browser shows disconnection and recovers the same project after server restart', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Project name', { exact: true }).fill('Recovery project');
  await page.getByRole('button', { name: 'Create project', exact: true }).click();
  await expect(page.getByTestId('project-name')).toHaveText('Recovery project');
  await stopServer();
  await expect(page.getByRole('alert')).toContainText('Cannot load your project');
  await startServer();
  await page.getByRole('button', { name: 'Retry connection' }).click();
  await expect(page.getByTestId('project-name')).toHaveText('Recovery project');
});
