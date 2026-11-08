/**
 * Paid live check of sandbox-hosted previews. Skipped unless COMPLIX_LIVE_E2B=1.
 * Uses the same shared startSandboxBuild sequence as the SpacetimeDB procedure, with a synchronous
 * HTTP shim (the API key travels over stdin, never argv), then renders the result in a browser.
 */
import { test, expect } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync, existsSync, writeFileSync } from 'node:fs';
import { parseEnv } from 'node:util';
import http from 'node:http';
import path from 'node:path';
import { previewUrl, startSandboxBuild, withPreviewEntry, type PreviewHttp, type SandboxLease } from '../shared/sandboxPreview';

test.skip(process.env.COMPLIX_LIVE_E2B !== '1', 'Live E2B check is opt-in (uses credits).');
test.setTimeout(420000);

const env = existsSync('.local/backend.env') ? parseEnv(readFileSync('.local/backend.env', 'utf8')) : {};
const apiKey = process.env.E2B_API_KEY ?? env.E2B_API_KEY ?? '';
const templates = existsSync('.local/e2b-templates.json') ? JSON.parse(readFileSync('.local/e2b-templates.json', 'utf8')) : {};
const shim = `let input='';process.stdin.on('data',d=>input+=d).on('end',async()=>{const r=JSON.parse(input);try{const res=await fetch(r.url,{method:r.method,headers:r.headers,body:r.body,signal:AbortSignal.timeout(r.timeoutMs)});process.stdout.write(JSON.stringify({status:res.status,body:await res.text()}))}catch{process.stdout.write(JSON.stringify({status:0,body:''}))}})`;
const syncHttp: PreviewHttp = request => JSON.parse(execFileSync(process.execPath, ['-e', shim], { input: JSON.stringify(request), maxBuffer: 4 << 20 }).toString());
const kill = (lease: SandboxLease) => syncHttp({ url: `https://api.e2b.app/sandboxes/${lease.sandboxId}`, method: 'DELETE', headers: { 'X-API-KEY': apiKey }, timeoutMs: 15000 });
function fixture(kind: string, dir = `generation/templates/${kind}/fixture`, prefix = ''): Array<{ path: string; content: string }> {
  return readdirSync(dir, { withFileTypes: true }).flatMap(item => item.isDirectory() ? fixture(kind, path.join(dir, item.name), prefix + item.name + '/') : [{ path: prefix + item.name, content: readFileSync(path.join(dir, item.name), 'utf8') }]);
}

for (const [kind, id] of [['react', 'react-tailwind-shadcn'], ['blazor', 'blazor-bootstrap']] as const) {
  test(`${kind}: sandbox builds, serves, rebuilds on new revision and stays isolated`, async ({ browser }) => {
    expect(apiKey.length).toBeGreaterThan(16);
    const templateId = templates[id]?.agentTemplateId; expect(templateId).toBeTruthy();
    const host = http.createServer((_req, res) => { res.writeHead(200, { 'Content-Type': 'text/html' }); res.end('<!doctype html><title>Host</title><div id="h"></div>'); });
    await new Promise<void>(resolve => host.listen(0, '127.0.0.1', resolve));
    const origin = `http://127.0.0.1:${(host.address() as any).port}`;
    const started = Date.now();
    const lease = startSandboxBuild(syncHttp, { apiKey, templateId, appOrigin: origin, revision: '1', files: fixture(kind) });
    const timings: Record<string, number> = { claimedMs: Date.now() - started };
    const url = previewUrl(lease);
    const page = await browser.newPage();
    try {
      const status = async () => (await page.request.get(url + '__status')).json();
      await expect.poll(async () => (await status()).status, { timeout: 240000, intervals: [2000] }).toMatch(/ready|failed/);
      const first = await status(); expect(first.log).toBe(''); expect(first.status).toBe('ready');
      timings.firstBuildMs = Date.now() - started;
      await page.goto(origin);
      await page.evaluate(src => { const f = document.createElement('iframe'); f.sandbox.add('allow-scripts', 'allow-same-origin'); f.src = src; f.style.cssText = 'width:600px;height:300px'; document.getElementById('h')!.append(f); }, url);
      const frame = page.frameLocator('iframe');
      await frame.getByRole('button', { name: 'Clicked 0 times' }).click({ timeout: 60000 });
      await expect(frame.getByRole('button', { name: 'Clicked 1 times' })).toBeVisible();
      const child = page.frames().find(item => item.parentFrame())!;
      expect(await child.evaluate(() => { try { void parent.document.body; return false; } catch { return true; } })).toBe(true);
      // Rebuild on save: same sandbox, new revision.
      const rebuildStart = Date.now();
      const again = startSandboxBuild(syncHttp, { apiKey, templateId, appOrigin: origin, existing: lease, revision: '2', files: fixture(kind).map(file => ({ ...file, content: file.content.replace('Clicked', 'Pressed') })) });
      expect(again).toBe(lease);
      await expect.poll(async () => (await status()).built, { timeout: 180000, intervals: [1000] }).toBe('2');
      timings.rebuildMs = Date.now() - rebuildStart;
      await page.reload(); await page.evaluate(src => { const f = document.createElement('iframe'); f.sandbox.add('allow-scripts', 'allow-same-origin'); f.src = src; document.getElementById('h')!.append(f); }, url);
      await expect(page.frameLocator('iframe').getByRole('button', { name: 'Pressed 0 times' })).toBeVisible({ timeout: 60000 });
      await page.screenshot({ path: `.local/${kind}-sandbox-preview.png` });
      writeFileSync(`.local/${kind}-sandbox-preview.json`, JSON.stringify({ kind, templateId, timings }, null, 2));
      console.log(kind, JSON.stringify(timings));
    } finally { await page.close(); kill(lease); host.close(); }
  });
}

// No root preview entry. The component needs a prop (it would throw without one); a nested example supplies it,
// so the generated host entry must pick the example over the bare component.
const componentOnly = {
  react: [
    { path: 'Common/Counter/Counter.tsx', content: `import { useState } from 'react';
export function Counter({ label }: { label: string }) { const [count, setCount] = useState(0); return <button className="rounded bg-green-800 px-4 py-2 text-white" onClick={() => setCount(count + 1)}>{label.toUpperCase()} {count}</button>; }
` },
    { path: 'Common/Counter/examples/Preview.tsx', content: `import { Counter } from '../Counter';
export default function Preview() { return <Counter label="Counted" />; }
` },
  ],
  blazor: [
    { path: 'Common/Counter.razor', content: `<button class="btn btn-success" @onclick="() => count++">@Label.ToUpperInvariant() @count</button>
@code { [Parameter] public string Label { get; set; } = null!; private int count; }
` },
    { path: 'Common/Examples/CounterPreview.razor', content: `@using ComPlixPreview.Library.Common
<Counter Label="Counted" />
` },
  ],
};
for (const [kind, id] of [['react', 'react-tailwind-shadcn'], ['blazor', 'blazor-bootstrap']] as const) {
  test(`${kind}: without a root entry, a nested example renders the component with props`, async ({ browser }) => {
    const templateId = templates[id]?.agentTemplateId; expect(templateId).toBeTruthy();
    const host = http.createServer((_req, res) => { res.writeHead(200, { 'Content-Type': 'text/html' }); res.end('<!doctype html><title>Host</title><div id="h"></div>'); });
    await new Promise<void>(resolve => host.listen(0, '127.0.0.1', resolve));
    const origin = `http://127.0.0.1:${(host.address() as any).port}`;
    const lease = startSandboxBuild(syncHttp, { apiKey, templateId, appOrigin: origin, revision: '1', files: withPreviewEntry(kind, componentOnly[kind], 'Counter') });
    const url = previewUrl(lease);
    const page = await browser.newPage();
    try {
      await expect.poll(async () => (await (await page.request.get(url + '__status')).json()).status, { timeout: 240000, intervals: [2000] }).toMatch(/ready|failed/);
      const status = await (await page.request.get(url + '__status')).json();
      expect(status.log).toBe(''); expect(status.status).toBe('ready');
      await page.goto(origin);
      await page.evaluate(src => { const f = document.createElement('iframe'); f.sandbox.add('allow-scripts', 'allow-same-origin'); f.src = src; document.getElementById('h')!.append(f); }, url);
      await page.frameLocator('iframe').getByRole('button', { name: 'COUNTED 0' }).click({ timeout: 60000 });
      await expect(page.frameLocator('iframe').getByRole('button', { name: 'COUNTED 1' })).toBeVisible();
    } finally { await page.close(); kill(lease); host.close(); }
  });
}
