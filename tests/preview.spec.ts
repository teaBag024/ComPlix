import { test, expect } from '@playwright/test';
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
