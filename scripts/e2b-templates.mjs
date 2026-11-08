import { Template } from 'e2b';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { previewProfiles } from '../generation/previewProfiles.mjs';
import { safeDiagnostic } from '../generation/e2bRuntime.mjs';
import { previewConfig } from './preview-config.mjs';

const config = previewConfig();
const selected = process.argv[2];
const profile = Object.values(previewProfiles).find(item => item.kind === selected);
if (!profile || !config.apiKey) throw new Error('Use e2b-templates.mjs react|blazor with E2B_API_KEY configured privately.');
const context = path.resolve('generation/templates');
let template = Template({ fileContextPath: context, fileIgnorePatterns: ['**/node_modules/**', '**/.env*', '**/bin/**', '**/obj/**'] })
  .fromImage(profile.image).setUser('root')
  .runCmd('mkdir -p /opt/complix/host /workspace && useradd -m -u 1500 -s /bin/bash complix && chown complix:complix /workspace')
  .copy('build.py', '/opt/complix/build.py');
const files = profile.kind === 'react'
  ? ['package.json', 'package-lock.json', 'main.tsx', 'styles.css', 'tsconfig.json', 'vite.config.mjs', 'index.html']
  : ['PreviewHost.csproj', 'Program.cs', 'App.razor', '_Imports.razor', 'NuGet.Config', 'wwwroot/index.html'];
for (const file of files) template = template.copy(`${profile.kind}/${file}`, `/opt/complix/host/${file}`);
template = template.setWorkdir('/opt/complix/host');
if (profile.kind === 'react') {
  template = template.runCmd('npm ci --ignore-scripts --no-audit --no-fund');
} else {
  // Only trusted, pinned host files are restored online. Candidate code is never present in a template build.
  template = template.runCmd('apt-get update && apt-get install -y --no-install-recommends python3 curl ca-certificates && rm -rf /var/lib/apt/lists/*')
    .copy('blazor/fixture/Examples/Preview.razor', '/opt/complix/host/Library/Examples/Preview.razor')
    .copy('blazor/fixture/Common/Button.razor', '/opt/complix/host/Library/Common/Button.razor')
    .setEnvs({ NUGET_PACKAGES: '/opt/complix/packages', DOTNET_CLI_TELEMETRY_OPTOUT: '1', DOTNET_NOLOGO: '1' })
    .runCmd('dotnet restore PreviewHost.csproj --source https://api.nuget.org/v3/index.json -p:NuGetAudit=false && dotnet publish PreviewHost.csproj -c Release --no-restore -o /tmp/warmup -p:NuGetAudit=false');
  const meta = await (await fetch('https://registry.npmjs.org/bootstrap/5.3.8', { signal: AbortSignal.timeout(15000) })).json();
  const checksum = Buffer.from(meta.dist.integrity.replace('sha512-', ''), 'base64').toString('hex');
  if (!/^[a-f0-9]{128}$/.test(checksum)) throw new Error('Cannot verify the pinned Bootstrap package.');
  template = template.runCmd(`curl -fsSL https://registry.npmjs.org/bootstrap/-/bootstrap-5.3.8.tgz -o /tmp/bootstrap.tgz && echo '${checksum}  /tmp/bootstrap.tgz' | sha512sum -c - && tar xzf /tmp/bootstrap.tgz -C /tmp package/dist/css/bootstrap.min.css && cp /tmp/package/dist/css/bootstrap.min.css /opt/complix/host/wwwroot/bootstrap.min.css && rm -rf /tmp/warmup /tmp/package /tmp/bootstrap.tgz /opt/complix/host/Library /opt/complix/host/bin /opt/complix/host/obj`);
}
template = template.runCmd('chmod -R a+rX /opt/complix && chmod -R go-w /opt/complix').setUser('complix');
mkdirSync('.local', { recursive: true });
const logs = [];
try {
  const info = await Template.buildInBackground(template, `complix-${profile.kind}-preview-v1`, { apiKey: config.apiKey,
    cpuCount: profile.cpuCount, memoryMB: profile.memoryMB, requestTimeoutMs: 60000 });
  console.log(`${profile.kind}: remote template build started (${info.buildId}).`);
  const end = Date.now() + 900000;
  while (Date.now() < end) {
    const status = await Template.getBuildStatus(info, { apiKey: config.apiKey, requestTimeoutMs: 30000 });
    for (const log of status.logEntries ?? []) logs.push(safeDiagnostic(log.message, config.secrets));
    writeFileSync(`.local/e2b-${profile.kind}-build.log`, logs.slice(-400).join('\n'));
    if (status.status === 'error') throw new Error(status.reason?.message || 'Template build failed.');
    if (status.status === 'ready') {
      config.templates[profile.id] = { templateId: info.templateId, buildId: info.buildId, versions: profile.versions, image: profile.image };
      writeFileSync('.local/e2b-templates.json', JSON.stringify(config.templates, null, 2) + '\n');
      console.log(`${profile.kind}: template ready; private local template configuration saved.`);
      process.exit(0);
    }
    await new Promise(resolve => setTimeout(resolve, 5000));
  }
  throw new Error('Template build has not finished within 15 minutes. Inspect its dashboard status before retrying; no second build was started.');
} catch (cause) {
  console.error(safeDiagnostic(cause?.message || 'E2B template build failed.', config.secrets));
  console.error('Sanitized build log: .local/e2b-' + profile.kind + '-build.log');
  process.exitCode = 1;
}
