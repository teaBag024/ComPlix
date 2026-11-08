import { validateDraftFiles } from './draftFiles';
import { MAX_PROJECT_REFERENCES, referencePurposes, validatePdfReference, validateReferenceFile } from './referenceFiles';
import type { WorkspaceFile } from './stackAdapters';

/**
 * Wire format for a reviewed component import. The browser builds it from a reviewed plan; the
 * backend decodes and revalidates it before anything is inserted. Shared so both apply one rule set.
 * Payload content is untrusted data and is never evaluated.
 */

// Verified with the local standalone server (multi-chunk import test). Larger sizes were not measured.
export const IMPORT_CHUNK_BYTES = 1024 * 1024;
// 64 MiB of archive content plus base64 expansion of reference bytes and JSON framing.
export const MAX_IMPORT_PAYLOAD_BYTES = 96 * 1024 * 1024;
export const MAX_IMPORT_CHUNKS = Math.ceil(MAX_IMPORT_PAYLOAD_BYTES / IMPORT_CHUNK_BYTES);
export const MAX_IMPORT_COMPONENTS = 200;
export const IMPORT_STAGING_TTL_MICROS = 24n * 60n * 60n * 1_000_000n;
export const IMPORT_REQUEST_ID = /^[A-Za-z0-9-]{8,80}$/;
const COMPONENT_NAME = /^[a-zA-Z0-9_-]{1,80}$/;

export type ImportPayloadComponent = { name: string; category: 'common' | 'composition'; files: WorkspaceFile[] };
export type ImportPayloadReference = { filename: string; purpose: keyof typeof referencePurposes; bytes: Uint8Array; text: string };
export type ImportPayload = { components: ImportPayloadComponent[]; references: ImportPayloadReference[] };

export const importRootPath = (name: string, category: 'common' | 'composition') => (category === 'common' ? 'Common/' : 'Compositions/') + name;

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
export function toBase64(bytes: Uint8Array) {
  let out = '';
  for (let at = 0; at < bytes.length; at += 3) {
    const a = bytes[at], b = bytes[at + 1], c = bytes[at + 2];
    out += B64[a >> 2] + B64[((a & 3) << 4) | ((b ?? 0) >> 4)] + (b === undefined ? '=' : B64[((b & 15) << 2) | ((c ?? 0) >> 6)]) + (c === undefined ? '=' : B64[c & 63]);
  }
  return out;
}
export function fromBase64(text: string) {
  if (text.length % 4 || /[^A-Za-z0-9+/=]/.test(text) || /=[^=]/.test(text)) throw new Error('Invalid base64 data.');
  const pad = text.endsWith('==') ? 2 : text.endsWith('=') ? 1 : 0;
  const out = new Uint8Array((text.length / 4) * 3 - pad);
  let o = 0;
  for (let at = 0; at < text.length; at += 4) {
    const n = (B64.indexOf(text[at]) << 18) | (B64.indexOf(text[at + 1]) << 12) | ((B64.indexOf(text[at + 2]) & 63) << 6) | (B64.indexOf(text[at + 3]) & 63);
    if (o < out.length) out[o++] = n >> 16;
    if (o < out.length) out[o++] = (n >> 8) & 255;
    if (o < out.length) out[o++] = n & 255;
  }
  return out;
}

const K = new Uint32Array([0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da, 0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070, 0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2]);
/** Synchronous SHA-256 (the module runtime has no async WebCrypto inside reducers). */
export function sha256Hex(data: Uint8Array) {
  const h = new Uint32Array([0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19]);
  const length = data.length;
  const padded = new Uint8Array(Math.ceil((length + 9) / 64) * 64);
  padded.set(data);
  padded[length] = 0x80;
  const view = new DataView(padded.buffer);
  view.setUint32(padded.length - 8, Math.floor(length / 0x20000000), false);
  view.setUint32(padded.length - 4, (length * 8) >>> 0, false);
  const w = new Uint32Array(64);
  for (let block = 0; block < padded.length; block += 64) {
    for (let i = 0; i < 16; i++) w[i] = view.getUint32(block + i * 4, false);
    for (let i = 16; i < 64; i++) {
      const s0 = ((w[i - 15] >>> 7) | (w[i - 15] << 25)) ^ ((w[i - 15] >>> 18) | (w[i - 15] << 14)) ^ (w[i - 15] >>> 3);
      const s1 = ((w[i - 2] >>> 17) | (w[i - 2] << 15)) ^ ((w[i - 2] >>> 19) | (w[i - 2] << 13)) ^ (w[i - 2] >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
    }
    let [a, b, c, d, e, f, g, hh] = h;
    for (let i = 0; i < 64; i++) {
      const t1 = (hh + (((e >>> 6) | (e << 26)) ^ ((e >>> 11) | (e << 21)) ^ ((e >>> 25) | (e << 7))) + ((e & f) ^ (~e & g)) + K[i] + w[i]) >>> 0;
      const t2 = ((((a >>> 2) | (a << 30)) ^ ((a >>> 13) | (a << 19)) ^ ((a >>> 22) | (a << 10))) + ((a & b) ^ (a & c) ^ (b & c))) >>> 0;
      hh = g; g = f; f = e; e = (d + t1) >>> 0; d = c; c = b; b = a; a = (t1 + t2) >>> 0;
    }
    h[0] += a; h[1] += b; h[2] += c; h[3] += d; h[4] += e; h[5] += f; h[6] += g; h[7] += hh;
  }
  return Array.from(h, value => value.toString(16).padStart(8, '0')).join('');
}

export function encodeImportPayload(payload: ImportPayload) {
  const json = JSON.stringify({ version: 1, components: payload.components, references: payload.references.map(item => ({ filename: item.filename, purpose: item.purpose, text: item.text, bytes: toBase64(item.bytes) })) });
  return new TextEncoder().encode(json);
}
export function chunkImportPayload(bytes: Uint8Array, size = IMPORT_CHUNK_BYTES) {
  const chunks: Uint8Array[] = [];
  for (let at = 0; at < bytes.length; at += size) chunks.push(bytes.slice(at, at + size));
  return chunks;
}

const isRecord = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);

/** Decodes and fully revalidates a payload. Throws Error with a user-safe message. */
export function decodeImportPayload(bytes: Uint8Array): ImportPayload {
  if (bytes.length > MAX_IMPORT_PAYLOAD_BYTES) throw new Error('The import is larger than the allowed size.');
  let raw: unknown;
  try { raw = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)); } catch { throw new Error('The import data is malformed.'); }
  if (!isRecord(raw) || raw.version !== 1 || !Array.isArray(raw.components) || !Array.isArray(raw.references)) throw new Error('The import data is malformed.');
  if (!raw.components.length) throw new Error('The import contains no components.');
  if (raw.components.length > MAX_IMPORT_COMPONENTS) throw new Error(`An import can contain at most ${MAX_IMPORT_COMPONENTS} components.`);
  const names = new Set<string>();
  const components = raw.components.map(item => {
    if (!isRecord(item) || typeof item.name !== 'string' || !COMPONENT_NAME.test(item.name)) throw new Error('Use component names of 1-80 letters, numbers, hyphens or underscores.');
    if (item.category !== 'common' && item.category !== 'composition') throw new Error(`Component ${item.name} has an unknown category.`);
    if (names.has(item.name.toLowerCase())) throw new Error(`Component ${item.name} appears more than once.`);
    names.add(item.name.toLowerCase());
    let files: WorkspaceFile[];
    try { files = validateDraftFiles(item.files); } catch (cause) { throw new Error(`Component ${item.name}: ${cause instanceof Error ? cause.message : 'invalid files'}`); }
    const root = importRootPath(item.name, item.category) + '/';
    if (files.some(file => !file.path.startsWith(root))) throw new Error(`Component ${item.name} has files outside ${root}.`);
    return { name: item.name, category: item.category, files } satisfies ImportPayloadComponent;
  });
  if (raw.references.length > MAX_PROJECT_REFERENCES) throw new Error(`An import can restore at most ${MAX_PROJECT_REFERENCES} references.`);
  const filenames = new Set<string>();
  const references = raw.references.map(item => {
    if (!isRecord(item) || typeof item.filename !== 'string' || typeof item.purpose !== 'string' || typeof item.text !== 'string' || typeof item.bytes !== 'string') throw new Error('The import data is malformed.');
    if (filenames.has(item.filename.toLowerCase())) throw new Error(`Reference filename ${JSON.stringify(item.filename)} appears more than once.`);
    filenames.add(item.filename.toLowerCase());
    const data = fromBase64(item.bytes);
    try {
      if (/\.pdf$/i.test(item.filename)) validatePdfReference(item.filename, data, item.text, item.purpose);
      else if (validateReferenceFile(item.filename, data, item.purpose) !== item.text) throw new Error('Stored text does not match the original file.');
    } catch (cause) { throw new Error(`Reference ${JSON.stringify(item.filename)}: ${cause instanceof Error ? cause.message : 'invalid'}`); }
    return { filename: item.filename, purpose: item.purpose as ImportPayloadReference['purpose'], bytes: data, text: item.text };
  });
  return { components, references };
}
