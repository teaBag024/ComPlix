import { spawn } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';
import { ensureLocalKeys } from './local-keys.mjs';
import path from 'node:path';

const root = process.cwd();
const tool = path.join(root, '.tools', 'spacetime');
const windows = process.platform === 'win32';
const cli = path.join(tool, windows ? 'spacetimedb-cli.exe' : 'spacetimedb-cli');
const server = path.join(tool, windows ? 'spacetimedb-standalone.exe' : 'spacetimedb-standalone');
const action = process.argv[2];
const keys = action === 'start' ? ensureLocalKeys(path.join(root, '.local', 'keys')) : undefined;
const commands = {
  start: [server, ['start', '--listen-addr', '127.0.0.1:3000', '--data-dir', path.join(root, '.local', 'data'), '--jwt-priv-key-path', keys?.privateKeyPath, '--jwt-pub-key-path', keys?.publicKeyPath, '--non-interactive']],
  build: [cli, ['--root-dir', '.local/cli', 'build', '--module-path', 'spacetimedb']],
  publish: [cli, ['--root-dir', '.local/cli', 'publish', '--server', 'http://127.0.0.1:3000', '--module-path', 'spacetimedb', '--delete-data=never', '--break-clients', '--yes=skip-login', 'complix-local']],
  generate: [cli, ['--root-dir', '.local/cli', 'generate', '--lang', 'typescript', '--module-path', 'spacetimedb', '--out-dir', 'src/module_bindings', '--yes']],
};
if (!(action in commands)) throw new Error('Use start, build, publish or generate.');
const [executable, args] = commands[action];
if (!existsSync(executable)) throw new Error('Local SpacetimeDB tools missing. See README.md setup.');
const env = { ...process.env };
if (action === 'publish') {
  // Deliberately outside Vite's .env loading convention: backend credentials only.
  const secretsPath = path.join(root, '.local', 'backend.env');
  if (existsSync(secretsPath)) {
    const values = parseEnv(readFileSync(secretsPath, 'utf8'));
    for (const name of ['NVIDIA_API_KEY', 'NVIDIA_MODEL', 'GEMINI_API_KEY', 'GEMINI_MODEL', 'E2B_API_KEY', 'PREVIEW_APP_ORIGIN']) if (values[name] && env[name] === undefined) env[name] = values[name];
  }
  // Template IDs come from the private provisioning record written by npm run preview:template.
  const templatesPath = path.join(root, '.local', 'e2b-templates.json');
  if (existsSync(templatesPath)) {
    const templates = JSON.parse(readFileSync(templatesPath, 'utf8'));
    env.E2B_REACT_TEMPLATE ??= templates['react-tailwind-shadcn']?.agentTemplateId;
    env.E2B_BLAZOR_TEMPLATE ??= templates['blazor-bootstrap']?.agentTemplateId;
  }
  env.NVIDIA_ENABLED ??= 'true';
  env.GENERATION_MODE ??= 'mock';
  env.AUTH_ISSUER ??= 'https://auth.spacetimedb.com/oidc';
  env.AUTH_CLIENT_ID ??= 'client_034te16H37cuA4goFM0pev';
}
const child = spawn(executable, args, { stdio: 'inherit', windowsHide: true, env });
child.on('error', error => { console.error(error.message); process.exitCode = 1; });
child.on('exit', code => { process.exitCode = code ?? 1; });
process.on('SIGINT', () => child.kill('SIGINT'));
process.on('SIGTERM', () => child.kill('SIGTERM'));
