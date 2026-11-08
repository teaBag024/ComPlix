import { randomUUID } from 'node:crypto';
import { validatePreviewFiles } from './previewProfiles.mjs';

export function safeDiagnostic(value, secrets = []) {
  let result = String(value || 'Preview build failed.').replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, '');
  for (const secret of secrets) if (secret) result = result.split(secret).join('[redacted]');
  return result.replace(/\beyJ[A-Za-z0-9_-]*\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, '[redacted]').slice(-6000);
}

/** E2B executes only the build; the application serves copied static bytes, never an untrusted server. */
export async function buildE2BArtifact({ Sandbox, apiKey, templateId, profile, files, signal, secrets = [], onSandbox }) {
  if (!['react', 'blazor'].includes(profile?.kind)) throw new Error('Unsupported preview runtime.');
  if (signal?.aborted) throw new Error('Preview build cancelled.');
  validatePreviewFiles(files, profile, [apiKey, ...secrets]);
  if (!templateId) throw new Error('This stack has no provisioned preview template.');
  let sandbox; let stage = 'create sandbox';
  try {
    sandbox = await Sandbox.create(templateId, { apiKey, timeoutMs: 180000, requestTimeoutMs: 30000, signal,
      idempotencyKey: randomUUID(), envs: {}, allowInternetAccess: false,
      network: { allowPublicTraffic: false, allowInternetAccess: false, denyOut: ['0.0.0.0/0'] } });
    if (signal?.aborted) throw new Error('Preview build cancelled.');
    stage = 'boundary probe'; await onSandbox?.(sandbox);
    signal?.addEventListener('abort', () => { void sandbox.kill().catch(() => {}); }, { once: true });
    stage = 'upload saved source';
    await sandbox.files.makeDir('/workspace/candidate', { user: 'complix' });
    for (const file of files) await sandbox.files.write('/workspace/candidate/' + file.path, file.content, { user: 'complix' });
    stage = 'compile source';
    let output = '';
    const consume = data => { output = (output + data).slice(-6000); };
    try {
      const result = await sandbox.commands.run(`python3 /opt/complix/build.py ${profile.kind}`, {
        user: 'complix', cwd: '/workspace', envs: {}, timeoutMs: 130000, requestTimeoutMs: 140000, retainOutput: false, onStdout: consume, onStderr: consume,
      });
      if (result.exitCode !== 0) throw new Error(result.stderr || result.stdout);
    } catch (cause) {
      throw new Error(safeDiagnostic(output || cause?.stderr || cause?.stdout || cause?.message, [apiKey, ...secrets]));
    }
    if (signal?.aborted) throw new Error('Preview build cancelled.');
    stage = 'collect static artifacts';
    const assets = new Map(); let total = 0; let count = 0;
    async function collect(directory) {
      const entries = await sandbox.files.list(directory, { depth: 1, user: 'complix' });
      for (const entry of entries) {
        if (++count > 2048 || !entry.path.startsWith('/workspace/output/') || entry.path.split('/').some(part => part === '..') || entry.type === 'symlink' || entry.symlinkTarget) throw new Error('Unsafe preview build artifact.');
        if (entry.type === 'dir') { await collect(entry.path); continue; }
        if (entry.type !== 'file') throw new Error('Unsupported preview build artifact.');
        if (/\.(br|gz|map)$/i.test(entry.path)) continue;
        if (!Number.isSafeInteger(entry.size) || entry.size < 0 || total + entry.size > 64 * 1024 * 1024) throw new Error('Preview artifacts exceed 64 MiB.');
        const bytes = await sandbox.files.read(entry.path, { format: 'bytes', user: 'complix' });
        total += bytes.byteLength;
        if (total > 64 * 1024 * 1024 || bytes.byteLength !== entry.size) throw new Error('Preview artifact changed during collection.');
        assets.set(entry.path.slice('/workspace/output/'.length), Buffer.from(bytes));
      }
    }
    await collect('/workspace/output');
    if (!assets.has('index.html')) throw new Error('Build did not produce a preview entry document.');
    return { assets, versions: profile.versions };
  } catch (cause) {
    throw new Error(stage + ': ' + safeDiagnostic(cause?.stderr || cause?.stdout || cause?.message, [apiKey, ...secrets]));
  } finally {
    if (sandbox) {
      try { await sandbox.kill(); }
      catch { throw new Error('Sandbox cleanup could not be confirmed; its 180-second TTL bounds the remaining lifetime.'); }
    }
  }
}
