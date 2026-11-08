import { parseNvidiaDraft, nvidiaStatusError } from '../shared/nvidiaDraft';
import { generationMessages } from '../generation/context.mjs';
import { test, expect } from '@playwright/test';
import { requestNemotron, NVIDIA_MODEL } from '../generation/nvidia.mjs';

// Synthetic credentials only. No test calls NVIDIA or loads real keys.
const fakeKey = 'synthetic-provider-credential';
const messages = [{ role: 'user', content: 'Generate a Button draft.' }];
test('NVIDIA adapter sends bounded requests and returns only the assistant content and safe usage', async () => {
  let called = false;
  const result = await requestNemotron({ apiKey: fakeKey, messages }, async (url, options) => {
    called = true;
    expect(url).toBe('https://integrate.api.nvidia.com/v1/chat/completions');
    expect(options.headers.Authorization === 'Bearer ' + fakeKey).toBe(true);
    const body = JSON.parse(options.body);
    expect(body.model).toBe(NVIDIA_MODEL); expect(body.stream).toBe(false); expect(body.max_tokens).toBe(4096);
    expect(options.body.includes(fakeKey)).toBe(false);
    return new Response(JSON.stringify({ choices: [{ finish_reason: 'stop', message: { content: 'Draft code', reasoning_content: 'Private reasoning is not returned' } }], usage: { prompt_tokens: 8, completion_tokens: 2, total_tokens: 10 } }));
  });
  expect(called).toBe(true); expect(result.text).toBe('Draft code'); expect(result.usage.totalTokens).toBe(10);
  expect(JSON.stringify(result)).not.toContain('Private reasoning');
});
test('NVIDIA adapter sanitizes provider failures and rejects incomplete, excessive or credential-bearing output', async () => {
  for (const status of [401, 403, 429, 500]) {
    let message = '';
    try { await requestNemotron({ apiKey: fakeKey, messages }, async () => new Response(fakeKey, { status })); }
    catch (error) { message = error.message; }
    expect(message.length > 0 && !message.includes(fakeKey)).toBe(true);
  }
  await expect(requestNemotron({ apiKey: fakeKey, messages }, async () => { throw new Error(fakeKey); })).rejects.toThrow('Could not reach NVIDIA');
  for (const payload of [
    { choices: [{ finish_reason: 'length', message: { content: 'Partial draft' } }] },
    { choices: [{ finish_reason: 'stop', message: { content: fakeKey } }] },
    { choices: [{ finish_reason: 'stop', message: { content: '' } }] },
  ]) await expect(requestNemotron({ apiKey: fakeKey, messages }, async () => new Response(JSON.stringify(payload)))).rejects.toThrow();
  await expect(requestNemotron({ apiKey: fakeKey, messages }, async () => new Response('x'.repeat(1024 * 1024 + 1)))).rejects.toThrow('oversized');
});


test('generation context stays within one project and omits identity and original binary metadata', () => {
  const project = { id: 1n, name: 'Library', framework: 'Angular', language: 'TypeScript', libraries: 'Custom library', ownerEmail: 'not-context@example.test' };
  const reference = { projectId: 1n, filename: 'guide.md', purpose: 'design', content: 'No shadows', bytes: [65], uploadedBy: 'not-context' };
  const result = generationMessages({ project, references: [reference], request: 'Generate Input' });
  const payload = JSON.parse(result[1].content);
  expect(payload.project.framework).toBe('Angular');
  expect(payload.references[0].content).toBe('No shadows');
  expect(JSON.stringify(result)).not.toContain('not-context');
  expect(() => generationMessages({ project, references: [{ ...reference, projectId: 2n }], request: 'Generate Input' })).toThrow('one project');
  expect(() => generationMessages({ project, guidance: { projectId: 2n }, request: 'Generate Input' })).toThrow('one project');
  expect(() => generationMessages({ project, references: [{ ...reference, content: 'x'.repeat(65536) }], request: 'Generate Input' })).toThrow('64 KiB');
});


test('persisted NVIDIA manifests reject unsafe paths, escaped credentials and incomplete drafts', () => {
  const body = (files: unknown, finish = 'stop') => JSON.stringify({ choices: [{ finish_reason: finish, message: { content: JSON.stringify({ files }) } }] });
  expect(JSON.parse(parseNvidiaDraft(body([{ path: 'src/Button.tsx', content: 'safe draft' }]), fakeKey)).files).toHaveLength(1);
  for (const path of ['../outside', '/absolute', 'C:/file', '.env.local', 'src/../file', 'src\\file']) {
    expect(() => parseNvidiaDraft(body([{ path, content: 'draft' }]), fakeKey)).toThrow('unsafe');
  }
  expect(() => parseNvidiaDraft(body([{ path: 'A.ts', content: '' }, { path: 'a.ts', content: '' }]), fakeKey)).toThrow('unsafe');
  expect(() => parseNvidiaDraft(body([{ path: 'A.ts', content: 'draft' }], 'length'), fakeKey)).toThrow('incomplete');
  const escaped = body([{ path: 'A.ts', content: fakeKey }]).split(fakeKey).join('\\u0073' + fakeKey.slice(1));
  expect(() => parseNvidiaDraft(escaped, fakeKey)).toThrow('unusable');
  expect(() => parseNvidiaDraft(body([{ path: 'A.ts', content: 'x'.repeat(256 * 1024 + 1) }]), fakeKey)).toThrow('size limit');
  expect(nvidiaStatusError(401)).toBe('NVIDIA rejected the API key.');
});


test('ComPlix accepts a conversational reply without generating files and bounds reply size', () => {
  const body = (reply: string) => JSON.stringify({ choices: [{ finish_reason: 'stop', message: { content: JSON.stringify({ reply, files: [] }) } }] });
  expect(JSON.parse(parseNvidiaDraft(body('Which interaction should we design first?'), fakeKey))).toEqual({ reply: 'Which interaction should we design first?', files: [] });
  expect(() => parseNvidiaDraft(body(''), fakeKey)).toThrow('valid file draft');
  expect(() => parseNvidiaDraft(body('x'.repeat(12001)), fakeKey)).toThrow('reply exceeds');
});
