import { test, expect } from '@playwright/test';
import { spawn, type ChildProcess } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import net from 'node:net';
import { previewKind, previewMessages, previewUrl, withPreviewEntry, startSandboxBuild, type PreviewHttp } from '../shared/sandboxPreview';

const react = { framework: 'React', language: 'TypeScript', styling: 'Tailwind CSS', libraries: 'shadcn/ui', versions: '' };
const files = [{ path: 'examples/Preview.tsx', content: 'export default () => <button>Demo</button>' }];
const options = { apiKey: 'synthetic-e2b-key-0000', templateId: 'tmpl123', appOrigin: 'http://127.0.0.1:5173', revision: '3', files };
const claim = { status: 200, body: JSON.stringify({ writeKey: 'w'.repeat(40), capability: 'c'.repeat(32) }) };

test('preview kind and entry follow the stack adapters', () => {
  expect(previewKind(react)).toBe('react');
  expect(previewKind({ framework: 'Blazor', language: 'C#', styling: 'Bootstrap', libraries: '', versions: '' })).toBe('blazor');
  expect(previewKind({ framework: 'Vue', language: 'TypeScript', styling: '', libraries: '', versions: '' })).toBeUndefined();
  expect(withPreviewEntry('react', files, 'Button')).toEqual(files);  // A hand-written entry is used as-is.
  const generated = withPreviewEntry('react', [{ path: 'Common/Button.tsx', content: 'export function Button(){return <button/>}' }], 'Button');
  expect(generated.map(file => file.path)).toEqual(['Common/Button.tsx', 'examples/Preview.tsx']);
  expect(generated[1].content).toContain('import.meta.glob'); expect(generated[1].content).toContain('"Button"');
  const razor = withPreviewEntry('blazor', [{ path: 'Common/Card.razor', content: '<div/>' }], 'Card"; evil');
  expect(razor[1].path).toBe('Examples/Preview.razor'); expect(razor[1].content).toContain('"Cardevil"');
  expect(() => withPreviewEntry('blazor', [{ path: 'README.md', content: '' }], 'Card')).toThrow('.razor');
});

test('new sandbox is created offline, claimed, and receives the draft without leaking the API key to the sandbox', () => {
  const calls: Parameters<PreviewHttp>[0][] = [];
  const lease = startSandboxBuild(request => {
    calls.push(request);
    if (request.url.endsWith('/v2/sandboxes')) return { status: 201, body: JSON.stringify({ sandboxID: 'sbx1', domain: 'e2b.app' }) };
    if (request.url.endsWith('/__claim')) return claim;
    return { status: 202, body: '{}' };
  }, options);
  expect(previewUrl(lease)).toBe(`https://8080-sbx1.e2b.app/${'c'.repeat(32)}/`);
  const create = JSON.parse(calls[0].body!);
  expect(create).toMatchObject({ templateID: 'tmpl123', allow_internet_access: false, network: { allowPublicTraffic: true }, timeout: 600 });
  expect(calls[0].headers['X-API-KEY']).toBe(options.apiKey);
  for (const call of calls.filter(item => item.url.includes('8080-'))) expect(JSON.stringify(call)).not.toContain(options.apiKey);
  expect(calls.at(-1)!.headers.Authorization).toBe('Bearer ' + 'w'.repeat(40));
  expect(JSON.parse(calls.at(-1)!.body!)).toEqual({ revision: '3', files });
});

test('live sandbox is reused after extending its timeout; a dead one is replaced and deleted', () => {
  const existing = { sandboxId: 'old', host: '8080-old.e2b.app', writeKey: 'k'.repeat(40), capability: 'c'.repeat(32) };
  const reused: string[] = [];
  expect(startSandboxBuild(request => { reused.push(request.url); return { status: request.url.includes('/timeout') ? 200 : 202, body: '{}' }; }, { ...options, existing })).toBe(existing);
  expect(reused).toEqual(['https://api.e2b.app/sandboxes/old/timeout', 'https://8080-old.e2b.app/__build']);
  const replaced: string[] = [];
  const lease = startSandboxBuild(request => {
    replaced.push(request.method + ' ' + request.url);
    if (request.url.includes('/timeout')) return { status: 404, body: '' };
    if (request.url.endsWith('/v2/sandboxes')) return { status: 201, body: JSON.stringify({ sandboxID: 'new1' }) };
    if (request.url.endsWith('/__claim')) return claim;
    return { status: request.method === 'DELETE' ? 204 : 202, body: '{}' };
  }, { ...options, existing });
  expect(lease.sandboxId).toBe('new1');
  expect(replaced).toContain('DELETE https://api.e2b.app/sandboxes/old');
});

test('provider and agent failures produce fixed messages and discard unclaimed sandboxes', () => {
  expect(() => startSandboxBuild(() => ({ status: 429, body: 'raw provider text' }), options)).toThrow(previewMessages.quota);
  expect(() => startSandboxBuild(() => { throw new Error('socket detail'); }, options)).toThrow(previewMessages.create);
  const deleted: string[] = [];
  expect(() => startSandboxBuild(request => {
    if (request.method === 'DELETE') { deleted.push(request.url); return { status: 204, body: '' }; }
    if (request.url.endsWith('/v2/sandboxes')) return { status: 201, body: JSON.stringify({ sandboxID: 'sbx2' }) };
    return { status: 502, body: '' };
  }, options)).toThrow(previewMessages.agent);
  expect(deleted).toEqual(['https://api.e2b.app/sandboxes/sbx2']);
  expect(() => startSandboxBuild(request => {
    if (request.url.endsWith('/v2/sandboxes')) return { status: 201, body: JSON.stringify({ sandboxID: 'sbx3' }) };
    if (request.url.endsWith('/__claim')) return claim;
    return { status: request.method === 'DELETE' ? 204 : 400, body: JSON.stringify({ error: 'Unsafe preview file manifest.' }) };
  }, options)).toThrow('Unsafe preview file manifest.');
});

// The real agent process, with a stub build script standing in for the toolchains.
const stubBuild = `import sys, pathlib, time
profile, candidate, output = sys.argv[1], pathlib.Path(sys.argv[2]), pathlib.Path(sys.argv[3])
source = (candidate / 'examples' / 'Preview.tsx').read_text()
time.sleep(0.3)
if 'FAIL' in source:
    print('error TS1005: fixture failure'); sys.exit(1)
output.mkdir(parents=True)
(output / 'index.html').write_text('<!doctype html><p id="out">' + source + '</p><script src="app.js"></script>')
(output / 'app.js').write_text('document.body.dataset.ok = "1"')
`;
async function freePort() {
  return new Promise<number>(resolve => { const server = net.createServer().listen(0, '127.0.0.1', () => { const { port } = server.address() as net.AddressInfo; server.close(() => resolve(port)); }); });
}

test.describe('in-sandbox preview agent', () => {
  let agent: ChildProcess; let base = ''; let dir = '';
  test.beforeAll(async () => {
    dir = mkdtempSync(path.join(tmpdir(), 'complix-agent-'));
    writeFileSync(path.join(dir, 'build.py'), stubBuild);
    const port = await freePort();
    agent = spawn(process.env.COMPLIX_PYTHON ?? 'python', ['generation/templates/agent.py', 'react'], { env: { ...process.env, COMPLIX_AGENT_PORT: String(port), COMPLIX_AGENT_ROOT: dir, COMPLIX_BUILD_SCRIPT: path.join(dir, 'build.py') }, stdio: 'ignore' });
    base = `http://127.0.0.1:${port}`;
    for (let i = 0; i < 50; i++) { try { await fetch(base + '/'); break; } catch { await new Promise(r => setTimeout(r, 100)); } }
  });
  test.afterAll(() => { agent?.kill(); rmSync(dir, { recursive: true, force: true }); });

  test('claims once, authorizes builds, serves a loading page then the latest successful build', async ({ page }) => {
    const post = (url: string, body: unknown, key?: string) => fetch(base + url, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(key ? { Authorization: 'Bearer ' + key } : {}) }, body: JSON.stringify(body) });
    expect((await post('/__claim', { appOrigin: 'javascript:alert(1)' })).status).toBe(400);
    const claimed = await (await post('/__claim', { appOrigin: 'http://127.0.0.1:5173' })).json();
    expect((await post('/__claim', { appOrigin: 'http://127.0.0.1:5173' })).status).toBe(409);
    const root = `${base}/${claimed.capability}/`;
    expect((await fetch(`${base}/wrong-capability/`)).status).toBe(404);
    const loading = await fetch(root);
    expect(await loading.text()).toContain('Building preview');
    expect(loading.headers.get('content-security-policy')).toContain('frame-ancestors http://127.0.0.1:5173');

    expect((await post('/__build', { revision: '1', files })).status).toBe(403);
    expect((await post('/__build', { revision: '1', files: [{ path: '../escape', content: '' }] }, claimed.writeKey)).status).toBe(400);
    expect((await post('/__build', { revision: '1', files: [{ path: 'examples/Preview.tsx', content: 'First' }] }, claimed.writeKey)).status).toBe(202);
    await page.goto(root);  // The loading page polls and reloads itself when the build is ready.
    await expect(page.locator('#out')).toHaveText('First');
    await expect(page.locator('body')).toHaveAttribute('data-ok', '1');
    const status = await (await fetch(root + '__status')).json();
    expect(status).toMatchObject({ status: 'ready', built: '1', requested: '1' });

    expect((await post('/__build', { revision: '2', files: [{ path: 'examples/Preview.tsx', content: 'FAIL' }] }, claimed.writeKey)).status).toBe(202);
    await expect.poll(async () => (await (await fetch(root + '__status')).json()).status).toBe('failed');
    const failed = await (await fetch(root + '__status')).json();
    expect(failed.log).toContain('fixture failure'); expect(failed.built).toBe('1');
    expect(await (await fetch(root)).text()).toContain('First');  // Previous output retained.

    // Rapid saves: only the latest revision needs to win.
    await post('/__build', { revision: '3', files: [{ path: 'examples/Preview.tsx', content: 'Third' }] }, claimed.writeKey);
    await post('/__build', { revision: '4', files: [{ path: 'examples/Preview.tsx', content: 'Fourth' }] }, claimed.writeKey);
    await expect.poll(async () => (await (await fetch(root + '__status')).json()).built, { timeout: 10000 }).toBe('4');
    expect(await (await fetch(root)).text()).toContain('Fourth');
    expect((await fetch(root + 'missing.js')).status).toBe(404);
  });
});

// Vite's first request can be slow or trigger a dependency-optimization reload; retry navigation.
async function mountHarness(page: import('@playwright/test').Page, outcomes: string[]) {
  for (let attempt = 0; ; attempt++) {
    try {
      await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 90000 });
      await page.evaluate(async outcomes => {
        document.body.innerHTML = '<div id="host"></div>';
        const modulePath = '/tests/fixtures/stackPreviewHarness.tsx';
        (await import(/* @vite-ignore */ modulePath)).mount(outcomes);
      }, outcomes);
      return;
    } catch (cause) { if (attempt >= 2) throw cause; }
  }
}

test('preview auto-builds on save, waits through session renewal and retries on the renewed connection', async ({ page }) => {
  test.setTimeout(180000);  // First Vite compile of the app can be slow on Windows.
  await mountHarness(page, ['The module instance encountered a fatal error: Your session expired. Sign in again and retry.']);
  await expect(page.getByText('Renewing your sign-in, then retrying the preview…')).toBeVisible();
  await expect(page.getByRole('alert')).toHaveCount(0);
  await page.waitForTimeout(1500);
  expect(await page.evaluate(() => (window as any).previewCalls)).toEqual(['first']);  // No retry on the stale connection.
  await page.evaluate(() => (window as any).reconnect());
  await expect.poll(() => page.evaluate(() => (window as any).previewCalls)).toEqual(['first', 'renewed']);
  await expect(page.getByText('Renewing your sign-in')).toHaveCount(0);
});

test('other preview failures are shown and not retried automatically', async ({ page }) => {
  test.setTimeout(180000);  // First Vite compile of the app can be slow on Windows.
  await mountHarness(page, ['Add a runnable preview entry: examples/Preview.tsx.']);
  await expect(page.getByRole('alert')).toContainText('Add a runnable preview entry');
  await page.waitForTimeout(1500);
  expect(await page.evaluate(() => (window as any).previewCalls)).toEqual(['first']);
});
