import { test, expect } from '@playwright/test';
import { createPreviewController } from '../generation/previewController.mjs';
import { buildE2BArtifact } from '../generation/e2bRuntime.mjs';
import { previewProfiles, profileFor, validatePreviewFiles } from '../generation/previewProfiles.mjs';

const profile = previewProfiles['react-tailwind-shadcn'];
const sourceFiles = [{ path: 'examples/Preview.tsx', content: 'export default function Preview(){return <button>Demo</button>}' }];
test('preview profiles reject unsafe files, unavailable dependencies and unsupported stacks before provisioning', () => {
  expect(profileFor({ framework: 'Blazor', language: 'C#', styling: 'Bootstrap', libraries: '' }).kind).toBe('blazor');
  expect(() => profileFor({ framework: 'Vue' })).toThrow('Unsupported');
  for (const path of ['../escape', '/absolute', 'src\\escape', '.env', 'src/.git/config', 'node_modules/x.js']) {
    expect(() => validatePreviewFiles([{ path, content: '' }], profile)).toThrow('Unsafe');
  }
  expect(() => validatePreviewFiles([{ path: 'Button.tsx', content: '' }], profile)).toThrow('preview entry');
  expect(() => validatePreviewFiles([...sourceFiles, { path: 'package.json', content: '{"dependencies":{"react":"18.0.0"}}' }], profile)).toThrow('verified preview');
});
test('E2B build runtime uses private offline instances, copies bounded artifacts and always terminates them', async () => {
  let created = 0, killed = 0;
  const sandbox = { files: { makeDir: async () => {}, write: async () => {}, list: async () => [{ path: '/workspace/output/index.html', type: 'file', size: 4 }], read: async () => new TextEncoder().encode('Demo') },
    commands: { run: async () => ({ exitCode: 0 }) }, kill: async () => { killed++; } };
  const Sandbox = { create: async (_template, options) => { created++; expect(options.allowInternetAccess).toBe(false); expect(options.network.allowPublicTraffic).toBe(false); expect(options.envs).toEqual({}); return sandbox; } };
  const result = await buildE2BArtifact({ Sandbox, apiKey: 'synthetic-e2b-key', templateId: 'template-fixture', profile, files: sourceFiles });
  expect(result.assets.get('index.html').toString()).toBe('Demo'); expect(killed).toBe(1);
  sandbox.files.list = async () => [{ path: '/workspace/output/escape', type: 'symlink', size: 1 }];
  await expect(buildE2BArtifact({ Sandbox, apiKey: 'synthetic-e2b-key', templateId: 'template-fixture', profile, files: sourceFiles })).rejects.toThrow('Unsafe');
  expect(created).toBe(2); expect(killed).toBe(2);
});

test('controller scopes builds, rejects browser-supplied files and preserves the previous artifact after failure', async ({ page, baseURL }) => {
  const origin = new URL(baseURL!).origin;
  const browserErrors: string[] = [];
  page.on('console', message => { if (message.type() === 'error') browserErrors.push(message.text()); });
  page.on('requestfailed', request => browserErrors.push(`${new URL(request.url()).origin}: ${request.failure()?.errorText}`));
  let allowed = true, fail = false, builds = 0;
  const owner = 'synthetic-owner';
  const source = { projectId: '1', jobId: '2', revision: '0', owner, expiresAt: Date.now() + 60000,
    target: { framework: 'React', language: 'TypeScript', styling: 'Tailwind CSS', libraries: 'shadcn/ui' }, files: sourceFiles };
  const access = async token => { if (!allowed || token !== 'synthetic-user-token') throw new Error('Access denied'); return { owner }; };
  const authorizer = { access, source: async (token, request) => { await access(token); if (request.projectId !== '1') throw new Error('Access denied'); return structuredClone(source); } };
  const controller = createPreviewController({ appOrigin: origin, configuredProfiles: [profile.id], authorizer,
    build: async () => {
      builds++; if (fail) throw new Error('Fixture compilation failure');
      return { versions: 'test fixture', assets: new Map([
        ['index.html', Buffer.from('<!doctype html><button id="button">Clicked 0 times</button><script src="./demo.js"></script>')],
        ['demo.js', Buffer.from('let count=0;document.querySelector("button").onclick=event=>event.target.textContent="Clicked "+(++count)+" times";')],
      ]) };
    } });
  await new Promise<void>(resolve => controller.server.listen(0, '127.0.0.1', resolve));
  const endpoint = `http://127.0.0.1:${(controller.server.address() as any).port}`;
  const request = async (body = { projectId: '1', jobId: '2', revision: '0' }, token = 'synthetic-user-token', requestOrigin = origin) => fetch(endpoint + '/build', { method: 'POST', headers: { Origin: requestOrigin, Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  try {
    expect((await request(undefined, 'bad-token')).ok).toBe(false); expect(builds).toBe(0);
    expect((await request({ projectId: 'other', jobId: '2', revision: '0' })).ok).toBe(false); expect(builds).toBe(0);
    expect((await request({ projectId: '1', jobId: '2', revision: '0', files: [] } as any)).ok).toBe(false); expect(builds).toBe(0);
    expect((await request(undefined, undefined, 'https://attacker.invalid')).status).toBe(403);
    const response = await request(); expect(response.ok).toBe(true);
    const ready = await response.json(); expect(ready.url).not.toContain('synthetic-user-token');
    // Use a real loopback response so Chromium records the host's network address space.
    await page.goto('/');
    await page.evaluate(() => { document.body.innerHTML = '<div id="host"></div>'; });
    await page.evaluate(async endpoint => {
      const modulePath = '/tests/fixtures/previewHarness.tsx';
      const harness = await import(/* @vite-ignore */ modulePath); harness.mount(endpoint);
    }, endpoint);
    await expect(page.locator('iframe')).toHaveCount(0);
    await page.getByRole('button', { name: 'Build preview', exact: true }).click();
    try { await page.frameLocator('iframe').getByRole('button', { name: 'Clicked 0 times' }).click({ timeout: 10000 }); }
    catch (cause) { throw new Error(browserErrors.join('\n') + '\n' + String(cause)); }
    await expect(page.frameLocator('iframe').getByRole('button', { name: 'Clicked 1 times' })).toBeVisible();
    const frame = page.frames().find(item => item.parentFrame())!;
    expect(await frame.evaluate(() => { try { void parent.document.body; return false; } catch { return true; } })).toBe(true);
    expect(await frame.evaluate(async url => { try { await fetch(url); return false; } catch { return true; } }, endpoint + '/health')).toBe(true);
    fail = true;
    await page.getByRole('button', { name: 'Rebuild preview', exact: true }).click();
    await expect(page.getByRole('alert')).toContainText('The previous preview is retained.');
    await expect(page.frameLocator('iframe').getByRole('button', { name: 'Clicked 1 times' })).toBeVisible();
    expect((await fetch(ready.url)).ok).toBe(true);
    allowed = false; expect((await fetch(ready.url)).status).toBe(403);
  } finally { await controller.close(); }
});
