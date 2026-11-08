import { randomBytes } from 'node:crypto';
import { mkdirSync, readFileSync, appendFileSync, openSync, closeSync, unlinkSync } from 'node:fs';

/** Never reuse a preview cookie host, even across controller restarts. Stored only in ignored local state. */
export async function allocatePreviewAddress() {
  mkdirSync('.local', { recursive: true });
  let lock;
  for (let attempt = 0; attempt < 100; attempt++) {
    try { lock = openSync('.local/preview-addresses.lock', 'wx'); break; }
    catch (cause) { if (cause.code !== 'EEXIST') throw cause; await new Promise(resolve => setTimeout(resolve, 25)); }
  }
  if (lock === undefined) throw new Error('Preview address allocator is busy.');
  try {
    let existing = ''; try { existing = readFileSync('.local/preview-addresses.txt', 'utf8'); } catch (cause) { if (cause.code !== 'ENOENT') throw cause; }
    const used = new Set(existing.split('\n'));
    for (let attempt = 0; attempt < 100; attempt++) {
      const bytes = randomBytes(3);
      const host = `127.${1 + bytes[0] % 254}.${bytes[1]}.${bytes[2]}`;
      if (!used.has(host)) { appendFileSync('.local/preview-addresses.txt', host + '\n'); return host; }
    }
    throw new Error('Cannot allocate an isolated preview host.');
  } finally { closeSync(lock); unlinkSync('.local/preview-addresses.lock'); }
}
