import { test, expect } from '@playwright/test';
import { prepareE2BPreview } from '../generation/e2b.mjs';

test('E2B adapter contract keeps credentials out of runtime and requires private offline sandboxes', async () => {
  const calls: any[] = []; let killed = 0;
  const sandbox = { files: { makeDir: async (...args) => calls.push(args), write: async (...args) => calls.push(args) },
    commands: { run: async (...args) => { calls.push(args); return { exitCode: 0 }; } },
    getHost: () => '3000-fixture.e2b.app', trafficAccessToken: 'synthetic-private-traffic', kill: async () => { killed++; } };
  const config = { apiKey: 'synthetic-sandbox-key', templateId: 'operator-fixture', files: [{ path: 'index.html', content: 'Fixture' }], runner: { build: 'reviewed-build', test: 'reviewed-test', start: 'reviewed-serve', port: 3000 } };
  const result = await prepareE2BPreview({ ...config, Sandbox: { create: async (template, options) => {
    expect(template).toBe('operator-fixture'); expect(options.allowInternetAccess).toBe(false); expect(options.network.allowPublicTraffic).toBe(false);
    expect(options.envs).toBeUndefined(); return sandbox;
  } } });
  expect(JSON.stringify(calls)).not.toContain(config.apiKey);
  expect(result.internalURL).toBe('https://3000-fixture.e2b.app'); expect(killed).toBe(0);
  await result.dispose(); expect(killed).toBe(1);
});
test('E2B adapter rejects path escapes before provisioning and cleans up failed builds', async () => {
  let created = 0; let killed = 0;
  const config = { apiKey: 'synthetic-sandbox-key', templateId: 'operator-fixture', runner: { build: 'build', test: 'test', start: 'serve', port: 3000 },
    Sandbox: { create: async () => { created++; return { files: { makeDir: async () => {}, write: async () => {} }, commands: { run: async () => ({ exitCode: 1 }) }, kill: async () => { killed++; } }; } } };
  for (const path of ['../escape', '/etc/passwd', 'C:escape', 'folder\\escape', '.env', 'a/../b']) {
    await expect(prepareE2BPreview({ ...config, files: [{ path, content: 'text' }] })).rejects.toThrow('manifest');
  }
  expect(created).toBe(0);
  await expect(prepareE2BPreview({ ...config, files: [{ path: 'valid.txt', content: 'text' }] })).rejects.toThrow('No preview');
  expect(created).toBe(1); expect(killed).toBe(1);
});
