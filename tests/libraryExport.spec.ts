import { test, expect } from '@playwright/test';
import { unzipSync, strFromU8 } from 'fflate';
import { createHash } from 'node:crypto';
import { createLibraryZip, type LibraryExportSnapshot } from '../shared/libraryExport';

function snapshot(): LibraryExportSnapshot {
  return { exportedAt: '2026-11-08T12:00:00.000Z', project: { id: '1', name: 'My library', revision: '3', framework: 'React', language: 'TypeScript', styling: 'Tailwind', libraries: 'shadcn/ui', versions: 'Requested versions' },
    guidance: [{ label: 'colors', content: 'Use sage green.' }], warnings: [], components: [
      { id: '2', name: 'Button', category: 'common', rootPath: 'Common/Button', jobId: '5', revision: '7', model: 'fixture', origin: 'generated', files: [
        { path: 'Common/Button/Button.tsx', content: 'export const Button = () => <button>Saved manual edit</button>;' },
        { path: 'Common/Button/README.md', content: '# Button\nProps: children. Public API documentation.' },
        { path: 'Common/Button/examples/Preview.tsx', content: 'import { Button } from "../Button";' },
      ] },
      { id: '3', name: 'LoginForm', category: 'composition', rootPath: 'Compositions/LoginForm', jobId: '6', revision: '0', model: '', origin: 'starter-placeholder', files: [{ path: 'LoginForm.razor', content: '<button>Save</button>' }] },
    ], references: [{ id: '9', filename: 'guide.pdf', purpose: 'design', bytes: [37, 80, 68, 70, 45, 255, 0], content: 'Extracted reference text' }, { id: '10', filename: 'guide.pdf', purpose: 'documentation', bytes: [1, 2, 3], content: 'Other reference' }] };
}

test('ZIP preserves source, examples, exact reference bytes and meaningful handoff docs with checksums', async () => {
  const result = await createLibraryZip(snapshot());
  const raw = unzipSync(result.bytes);
  const root = Object.keys(raw)[0].split('/')[0] + '/';
  const content = (path: string) => strFromU8(raw[root + path]);
  expect(content('components/Common/Button/Button.tsx')).toContain('Saved manual edit');
  expect(content('components/Compositions/LoginForm/LoginForm.razor')).toContain('<button>Save</button>');
  expect(content('components/Common/Button/examples/Preview.tsx')).toContain('../Button');
  expect([...raw[root + 'references/originals/9/guide.pdf']]).toEqual([37, 80, 68, 70, 45, 255, 0]);
  expect([...raw[root + 'references/originals/10/guide.pdf']]).toEqual([1, 2, 3]);
  expect(content('references/extracted-text/9.txt')).toBe('Extracted reference text');
  expect(content('README.md')).toContain('Common foundations');
  expect(content('components/Common/Button/README.md')).toContain('Public API documentation');
  expect(content('AGENTS.md')).toContain('untrusted');
  expect(content('docs/design.md')).toContain('Use sage green.');
  expect(content('docs/validation.md')).toContain('UNVERIFIED');
  const manifest = JSON.parse(content('manifest.json'));
  expect(manifest.components[0].draftRevision).toBe('7');
  expect(manifest.references).toHaveLength(2);
  expect(manifest.warnings.join(' ')).toContain('starter placeholder');
  for (const file of manifest.files) expect(createHash('sha256').update(raw[root + file.path]).digest('hex')).toBe(file.sha256);
  expect(Object.keys(raw).length).toBe(manifest.files.length + 1);
  expect(JSON.stringify(manifest)).not.toContain('previewUrl');
});

test('ZIP rejects traversal, Windows-unsafe paths and case-insensitive content conflicts', async () => {
  for (const path of ['../outside.tsx', '/absolute.tsx', 'Common/Button/NUL.tsx', 'Common/Button/a\\b.tsx']) {
    const data = snapshot(); data.components[0].files[0].path = path;
    await expect(createLibraryZip(data)).rejects.toThrow();
  }
  const data = snapshot();
  data.components[1].files = [{ path: 'Common/Button/Button.tsx', content: 'conflicting source' }];
  await expect(createLibraryZip(data)).rejects.toThrow('conflict');
  const empty = snapshot(); empty.components = [];
  await expect(createLibraryZip(empty)).rejects.toThrow('No saved component files');
});

test('export lists unresolved imports without inventing dependencies or versions', async () => {
  const data = snapshot();
  data.components[0].files[0].content = 'import Missing from "./Missing"; import React from "react"; export const Button = () => <Missing />;';
  const result = await createLibraryZip(data);
  expect(result.manifest.imports).toContainEqual(expect.objectContaining({ specifier: './Missing', kind: 'unresolved relative dependency' }));
  expect(result.manifest.imports).toContainEqual(expect.objectContaining({ specifier: 'react', kind: 'external package or configured alias; version unresolved' }));
  expect(result.manifest.imports).toContainEqual(expect.objectContaining({ specifier: '../Button', kind: 'included relative dependency' }));
  expect(result.manifest.warnings.join(' ')).toContain('Unresolved relative import ./Missing');
});
