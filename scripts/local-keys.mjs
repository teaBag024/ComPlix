import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { generateKeyPairSync } from 'node:crypto';
import path from 'node:path';

/** Generate runtime-only signing keys once, and preserve them across server restarts. */
export function ensureLocalKeys(directory) {
  mkdirSync(directory, { recursive: true });
  const privateKeyPath = path.join(directory, 'identity.pem');
  const publicKeyPath = path.join(directory, 'identity.pub');
  if (!existsSync(privateKeyPath) && !existsSync(publicKeyPath)) {
    const { privateKey, publicKey } = generateKeyPairSync('ec', {
      namedCurve: 'prime256v1',
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
      publicKeyEncoding: { type: 'spki', format: 'pem' },
    });
    writeFileSync(privateKeyPath, privateKey, { mode: 0o600, flag: 'wx' });
    writeFileSync(publicKeyPath, publicKey, { flag: 'wx' });
  }
  if (!existsSync(privateKeyPath) || !existsSync(publicKeyPath)) {
    throw new Error('Local identity keypair is incomplete. Restore the original pair; keys were not overwritten.');
  }
  return { privateKeyPath, publicKeyPath };
}
