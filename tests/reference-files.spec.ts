import { test, expect } from '@playwright/test';
import { validateReferenceFile, MAX_REFERENCE_BYTES } from '../shared/referenceFiles';

const utf8 = (text: string) => new TextEncoder().encode(text);
test('text intake preserves readable Unicode and rejects unsafe names, binary data and unsupported formats', () => {
  expect(validateReferenceFile('guide.md', utf8('# Design\nUse readable text: café.'), 'design')).toBe('# Design\nUse readable text: café.');
  expect(validateReferenceFile('Button.razor', utf8('<button>@Label</button>'), 'implementation')).toContain('@Label');
  for (const filename of ['../guide.md', 'folder/guide.md', 'folder\\guide.md', 'C:guide.md', ' guide.md', 'guide.md\n']) {
    expect(() => validateReferenceFile(filename, utf8('valid'), 'design')).toThrow('filename');
  }
  for (const filename of ['guide.pdf', 'source.zip', 'photo.png', '.env']) {
    expect(() => validateReferenceFile(filename, utf8('valid'), 'design')).toThrow('supported');
  }
  expect(() => validateReferenceFile('guide.txt', new Uint8Array([0xff, 0xfe, 0x41, 0x00]), 'design')).toThrow('UTF-8');
  expect(() => validateReferenceFile('guide.txt', new Uint8Array([0xc0, 0xaf]), 'design')).toThrow('UTF-8');
  expect(() => validateReferenceFile('guide.txt', utf8('a\0b'), 'design')).toThrow('readable');
  expect(() => validateReferenceFile('guide.txt', utf8('  \n'), 'design')).toThrow('readable');
  expect(() => validateReferenceFile('guide.txt', utf8('valid'), 'toString')).toThrow('purpose');
});
test('text intake enforces byte size rather than JavaScript character count', () => {
  expect(validateReferenceFile('limit.txt', utf8('a'.repeat(MAX_REFERENCE_BYTES)), 'documentation')).toHaveLength(MAX_REFERENCE_BYTES);
  expect(() => validateReferenceFile('large.txt', utf8('a'.repeat(MAX_REFERENCE_BYTES + 1)), 'design')).toThrow('128 KiB');
  expect(() => validateReferenceFile('large.txt', utf8('é'.repeat(MAX_REFERENCE_BYTES)), 'design')).toThrow('128 KiB');
  expect(() => validateReferenceFile('empty.txt', new Uint8Array(), 'design')).toThrow('1 byte');
});
