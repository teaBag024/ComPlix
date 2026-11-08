// Paid live check of sandbox-hosted previews for both stacks (uses E2B credits).
import { spawnSync } from 'node:child_process';
const result = spawnSync(process.execPath, ['node_modules/@playwright/test/cli.js', 'test', 'tests/livePreview.spec.ts', ...process.argv.slice(2)],
  { stdio: 'inherit', env: { ...process.env, COMPLIX_LIVE_E2B: '1' } });
process.exitCode = result.status ?? 1;
