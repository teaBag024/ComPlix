import { test, expect } from '@playwright/test';
import { createHash, randomBytes } from 'node:crypto';
import { chunkImportPayload, decodeImportPayload, encodeImportPayload, fromBase64, sha256Hex, toBase64, IMPORT_CHUNK_BYTES, type ImportPayload } from '../shared/importPayload';

const payload = (): ImportPayload => ({
  components: [{ name: 'Button', category: 'common', files: [{ path: 'Common/Button/Button.tsx', content: 'export const Button = () => <button />;' }] }],
  references: [
    { filename: 'guide.pdf', purpose: 'design', bytes: new Uint8Array([37, 80, 68, 70, 45, 49, 10, 0, 255]), text: 'PDF text' },
    { filename: 'design.md', purpose: 'design', bytes: new TextEncoder().encode('# Design\n'), text: '# Design\n' },
  ],
});
const withRaw = (edit: (raw: any) => void) => {
  const raw = JSON.parse(new TextDecoder().decode(encodeImportPayload(payload())));
  edit(raw);
  return new TextEncoder().encode(JSON.stringify(raw));
};

test('synchronous SHA-256 and base64 match Node for edge-case lengths', () => {
  for (const length of [0, 1, 2, 3, 55, 56, 63, 64, 65, 1000, 100_003]) {
    const bytes = randomBytes(length);
    expect(sha256Hex(bytes), `sha ${length}`).toBe(createHash('sha256').update(bytes).digest('hex'));
    expect(toBase64(bytes), `b64 ${length}`).toBe(bytes.toString('base64'));
    expect([...fromBase64(toBase64(bytes))]).toEqual([...bytes]);
  }
  expect(() => fromBase64('a=bc')).toThrow('Invalid base64');
});

test('payload round-trips exact bytes and chunks reassemble', () => {
  const encoded = encodeImportPayload(payload());
  const chunks = chunkImportPayload(encoded, 7);
  expect(chunks.every(chunk => chunk.length <= 7)).toBe(true);
  const joined = new Uint8Array(chunks.reduce((sum, chunk) => sum + chunk.length, 0));
  let at = 0; for (const chunk of chunks) { joined.set(chunk, at); at += chunk.length; }
  const decoded = decodeImportPayload(joined);
  expect([...decoded.references[0].bytes]).toEqual([37, 80, 68, 70, 45, 49, 10, 0, 255]);
  expect(decoded.components[0].files[0].path).toBe('Common/Button/Button.tsx');
  expect(chunkImportPayload(new Uint8Array(IMPORT_CHUNK_BYTES + 1))).toHaveLength(2);
});

test('payload decoding revalidates names, roots, draft limits and references', () => {
  const cases: Array<[(raw: any) => void, string]> = [
    [raw => { raw.version = 2; }, 'malformed'],
    [raw => { raw.components = []; }, 'no components'],
    [raw => { raw.components[0].name = '../x'; }, 'letters, numbers'],
    [raw => { raw.components.push(structuredClone(raw.components[0])); raw.components[1].name = 'BUTTON'; raw.components[1].files[0].path = 'Common/BUTTON/B.tsx'; }, 'more than once'],
    [raw => { raw.components[0].files[0].path = 'Compositions/Other/Button.tsx'; }, 'outside Common/Button/'],
    [raw => { raw.components[0].files[0].path = '../escape.tsx'; }, 'unsafe or duplicate'],
    [raw => { raw.components[0].files = Array.from({ length: 21 }, (_, index) => ({ path: `Common/Button/f${index}.tsx`, content: 'x' })); }, '1–20 files'],
    [raw => { raw.references[1].filename = 'GUIDE.pdf'; raw.references[1].bytes = raw.references[0].bytes; raw.references[1].text = 'x'; }, 'more than once'],
    [raw => { raw.references[1].text = 'tampered'; }, 'does not match'],
    [raw => { raw.references[0].purpose = 'instructions'; }, 'purpose'],
    [raw => { raw.references[0].bytes = toBase64(new TextEncoder().encode('not a pdf')); }, 'PDF'],
  ];
  for (const [edit, message] of cases) expect(() => decodeImportPayload(withRaw(edit)), message).toThrow(message);
  expect(() => decodeImportPayload(new TextEncoder().encode('{'))).toThrow('malformed');
});
