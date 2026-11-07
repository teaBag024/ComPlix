import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
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
  env.AUTH_ISSUER ??= 'https://auth.spacetimedb.com/oidc';
  env.AUTH_CLIENT_ID ??= 'client_034te16H37cuA4goFM0pev';
}
const child = spawn(executable, args, { stdio: 'inherit', windowsHide: true, env });
child.on('error', error => { console.error(error.message); process.exitCode = 1; });
child.on('exit', code => { process.exitCode = code ?? 1; });
process.on('SIGINT', () => child.kill('SIGINT'));
process.on('SIGTERM', () => child.kill('SIGTERM'));
