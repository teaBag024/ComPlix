import { Sandbox } from 'e2b';
import http from 'node:http';
import path from 'node:path';
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { previewConfig } from './preview-config.mjs';
import { previewProfiles } from '../generation/previewProfiles.mjs';
import { buildE2BArtifact, safeDiagnostic } from '../generation/e2bRuntime.mjs';
import { openArtifactGateway } from '../generation/previewGateway.mjs';

process.env.PLAYWRIGHT_BROWSERS_PATH ??= path.resolve('.tools/playwright');
const { chromium } = await import('@playwright/test');
const config = previewConfig();
const requested = process.argv[2];
const profiles = Object.values(previewProfiles).filter(profile => !requested || profile.kind === requested);
if (!profiles.length || !config.apiKey) throw new Error('Configure E2B_API_KEY and choose react or blazor.');
function fixtureFiles(directory, prefix = '') {
  return readdirSync(directory, { withFileTypes: true }).flatMap(item => item.isDirectory()
    ? fixtureFiles(path.join(directory, item.name), prefix + item.name + '/')
    : [{ path: prefix + item.name, content: readFileSync(path.join(directory, item.name), 'utf8') }]);
}
const host = http.createServer((_req, res) => { res.writeHead(200, { 'Content-Type': 'text/html' }); res.end('<!doctype html><title>Trusted verification host</title><div id="preview"></div>'); });
await new Promise(resolve => host.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${host.address().port}`;
let browser;
const report = [];
try {
  browser = await chromium.launch({ headless: true });
  for (const profile of profiles) {
    console.log(`${profile.kind}: building trusted interactive fixture in a disposable offline sandbox.`);
    const artifact = await buildE2BArtifact({ Sandbox, apiKey: config.apiKey, profile,
      templateId: config.templates[profile.id]?.templateId, files: fixtureFiles(`generation/templates/${profile.kind}/fixture`), secrets: config.secrets,
      onSandbox: async sandbox => {
        let output = '';
        try { await sandbox.commands.run(`python3 -c "import os,urllib.request; assert os.getuid()!=0; assert not any(os.getenv(k) for k in ['E2B_API_KEY','GEMINI_API_KEY','NVIDIA_API_KEY','SPACETIMEDB_TOKEN']);\nfor url in ['https://1.1.1.1/cdn-cgi/trace','https://[2606:4700:4700::1111]/cdn-cgi/trace']:\n try: urllib.request.urlopen(url,timeout=4);raise AssertionError('external HTTPS allowed')\n except OSError: pass\nprint('BOUNDARY_OK')"`, { user: 'complix', timeoutMs: 15000, envs: {}, retainOutput: false, onStdout: text => { output = (output + text).slice(-4000); }, onStderr: text => { output = (output + text).slice(-4000); } });
        } catch (cause) { throw new Error(output || cause.message); }
        if (!output.includes('BOUNDARY_OK')) throw new Error('Sandbox boundary probe failed.');
      } });
    // buildE2BArtifact has already killed the VM. Browser verification uses only copied static bytes.
    const gateway = await openArtifactGateway({ ...artifact, appOrigin: origin, expiresAt: Date.now() + 120000, authorize: async () => {} });
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    try {
      await page.goto(origin);
      await page.evaluate(url => { const frame = document.createElement('iframe'); frame.title = 'Compiled fixture'; frame.sandbox.add('allow-scripts', 'allow-same-origin'); frame.referrerPolicy = 'no-referrer'; frame.src = url; document.getElementById('preview').append(frame); }, gateway.url);
      const frame = page.frameLocator('iframe');
      await frame.getByRole('button', { name: 'Clicked 0 times', exact: true }).waitFor({ timeout: 45000 });
      await frame.getByRole('button', { name: 'Clicked 0 times', exact: true }).click();
      await frame.getByRole('button', { name: 'Clicked 1 times', exact: true }).waitFor();
      const child = page.frames().find(item => item.parentFrame());
      const isolated = await child.evaluate(() => { try { void parent.document.body; return false; } catch { return true; } });
      if (!isolated || errors.length) throw new Error('Compiled fixture interaction or browser isolation failed: ' + errors.join('; '));
      await page.screenshot({ path: `.local/${profile.kind}-actual-preview.png` });
      report.push({ stack: profile.id, versions: profile.versions, compiled: true, interacted: true, parentIsolated: true, offlineNonRootNoProviderEnv: true, sandboxCleaned: true });
      writeFileSync('.local/e2b-verification.json', JSON.stringify(report, null, 2) + '\n');
      console.log(`${profile.kind}: actual-code preview rendered, clicked and isolated; sandbox cleaned up.`);
    } finally { await page.close(); gateway.dispose(); }
  }
} catch (cause) {
  console.error(safeDiagnostic(cause?.message || 'Preview verification failed.', config.secrets));
  process.exitCode = 1;
} finally { await browser?.close(); host.closeAllConnections(); host.close(); }
