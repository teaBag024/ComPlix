import { test, expect } from '@playwright/test';
import { unzipSync, zipSync, strToU8, strFromU8 } from 'fflate';
import { createLibraryZip, type LibraryExportSnapshot } from '../shared/libraryExport';
import { planImportFromZip, projectConflicts, readZipEntries, MAX_IMPORT_ENTRY_BYTES } from '../shared/componentImport';

const pdf = [37, 80, 68, 70, 45, 49, 46, 55, 10, 255, 0];
function react(): LibraryExportSnapshot {
  return { exportedAt: '2026-11-08T12:00:00.000Z', project: { id: '1', name: 'React lib', revision: '3', framework: 'React', language: 'TypeScript', styling: 'Tailwind CSS', libraries: 'shadcn/ui', versions: 'React 19' },
    guidance: [{ label: 'colors', content: 'Use sage green.' }], warnings: [], components: [
      { id: '2', name: 'Button', category: 'common', rootPath: 'Common/Button', jobId: '5', revision: '7', model: 'fixture', origin: 'generated', files: [
        { path: 'Common/Button/Button.tsx', content: 'import { cn } from "clsx";\nexport const Button = () => <button>Saved edit ✓</button>;\n' },
        { path: 'Common/Button/README.md', content: '# Button\n' },
        { path: 'Common/Button/examples/Preview.tsx', content: 'import { Button } from "../Button";\n' },
      ] },
      { id: '3', name: 'Card', category: 'composition', rootPath: 'Compositions/Card', jobId: '6', revision: '1', model: 'fixture', origin: 'generated', files: [
        { path: 'Compositions/Card/Card.tsx', content: 'import { Button } from "../../Common/Button/Button";\nexport const Card = () => <Button />;\n' },
      ] },
    ], references: [
      { id: '9', filename: 'guide.pdf', purpose: 'design', bytes: pdf, content: 'Extracted reference text' },
      { id: '10', filename: 'notes.md', purpose: 'documentation', bytes: [...strToU8('# Notes\n')], content: '# Notes\n' },
    ] };
}
function blazor(): LibraryExportSnapshot {
  return { exportedAt: '2026-11-08T13:00:00.000Z', project: { id: '4', name: 'Blazor lib', revision: '1', framework: 'Blazor', language: 'C#', styling: 'Bootstrap', libraries: '', versions: '.NET 9' },
    guidance: [], warnings: [], references: [], components: [
      { id: '7', name: 'Alert', category: 'common', rootPath: 'Common/Alert', jobId: '8', revision: '0', model: 'fixture', origin: 'generated', files: [
        { path: 'Alert.razor', content: '<div class="alert alert-info">@ChildContent</div>\n@code { [Parameter] public RenderFragment? ChildContent { get; set; } }\n' },
        { path: 'Alert.md', content: '# Alert\n' },
      ] },
    ] };
}

/** Unpacks an export, lets a test tamper with it, and repacks under the same wrapper folder. */
async function repack(snapshot: LibraryExportSnapshot, mutate: (files: Record<string, Uint8Array>, root: string) => void) {
  const raw = unzipSync((await createLibraryZip(snapshot)).bytes);
  const root = Object.keys(raw)[0].split('/')[0] + '/';
  mutate(raw, root);
  return zipSync(raw);
}
function editManifest(files: Record<string, Uint8Array>, root: string, edit: (manifest: any) => void) {
  const manifest = JSON.parse(strFromU8(files[root + 'manifest.json']));
  edit(manifest);
  files[root + 'manifest.json'] = strToU8(JSON.stringify(manifest));
}
/** Locates the first central-directory header so tests can forge flags the writer never produces. */
function centralHeader(zip: Uint8Array) {
  for (let at = zip.length - 46; at >= 0; at--) if (zip[at] === 0x50 && zip[at + 1] === 0x4b && zip[at + 2] === 1 && zip[at + 3] === 2) {
    let first = at;
    for (let back = at - 1; back >= 0; back--) if (zip[back] === 0x50 && zip[back + 1] === 0x4b && zip[back + 2] === 1 && zip[back + 3] === 2) first = back;
    return new DataView(zip.buffer, zip.byteOffset + first);
  }
  throw new Error('no central header');
}

test('React export round-trips into a reviewed plan with exact source, reference bytes and design reference', async () => {
  const plan = await planImportFromZip((await createLibraryZip(react())).bytes);
  expect(plan.kind).toBe('complix');
  expect(plan.technologies).toMatchObject({ framework: 'React', styling: 'Tailwind CSS' });
  expect(plan.components.map(item => [item.name, item.category, item.rootPath])).toEqual([['Button', 'common', 'Common/Button'], ['Card', 'composition', 'Compositions/Card']]);
  const button = plan.components[0];
  expect(button.files.find(file => file.path === 'Common/Button/Button.tsx')?.content).toContain('Saved edit ✓');
  expect(button.files.map(file => file.path)).toContain('Common/Button/examples/Preview.tsx');
  expect(button.warnings.join(' ')).toContain('clsx');
  expect(plan.components[1].warnings.join(' ')).toContain('Imports another component');
  const reference = plan.references.find(item => item.filename === 'guide.pdf')!;
  expect([...reference.bytes]).toEqual(pdf);
  expect(reference.text).toBe('Extracted reference text');
  const design = plan.references.find(item => item.origin === 'design-guidance')!;
  expect(design).toMatchObject({ filename: 'design.md', purpose: 'design' });
  expect(design.text).toContain('Use sage green.');
  // Every archive file has an explicit disposition; handoff instructions are never components.
  expect(plan.files).toHaveLength(plan.totals.files);
  expect(plan.files.find(file => file.path === 'AGENTS.md')?.disposition).toBe('handoff');
  expect(plan.components.flatMap(item => item.files).some(file => file.path.endsWith('AGENTS.md'))).toBe(false);
});

test('Blazor export round-trips, including unrooted saved paths', async () => {
  const plan = await planImportFromZip((await createLibraryZip(blazor())).bytes);
  expect(plan.technologies.framework).toBe('Blazor');
  expect(plan.components[0].files.map(file => file.path).sort()).toEqual(['Common/Alert/Alert.md', 'Common/Alert/Alert.razor']);
  expect(plan.components[0].files.find(file => file.path.endsWith('.razor'))?.content).toContain('alert-info');
  expect(plan.references.map(item => item.filename)).toEqual(['design.md']);
});

test('tampered, undeclared or missing files are rejected rather than imported', async () => {
  const tampered = await repack(react(), (files, root) => { files[root + 'components/Common/Button/Button.tsx'] = strToU8('export const Button = () => null;'); });
  await expect(planImportFromZip(tampered)).rejects.toThrow('checksum');
  const extra = await repack(react(), (files, root) => { files[root + 'components/Common/Button/Extra.tsx'] = strToU8('x'); });
  await expect(planImportFromZip(extra)).rejects.toThrow('not declared');
  const missingReference = await repack(react(), (files, root) => { delete files[root + 'references/originals/9/guide.pdf']; });
  await expect(planImportFromZip(missingReference)).rejects.toThrow('missing');
  const outside = await repack(react(), files => { files['stray.txt'] = strToU8('x'); });
  await expect(planImportFromZip(outside)).rejects.toThrow('outside the library folder');
});

test('malformed or inconsistent manifests are rejected with a useful error', async () => {
  const cases: Array<[(manifest: any) => void, string]> = [
    [manifest => { manifest.formatVersion = 2; }, 'formatVersion 1'],
    [manifest => { manifest.components[1].name = 'button'; manifest.components[1].rootPath = 'Compositions/button'; }, 'more than once'],
    [manifest => { manifest.components.push(structuredClone(manifest.components[0])); }, 'more than once'],
    [manifest => { manifest.components[0].name = '../evil'; }, 'letters, numbers'],
    [manifest => { manifest.components[0].category = 'page'; }, 'unknown category'],
    [manifest => { manifest.components[1].files.push(manifest.components[0].files[0]); }, 'outside component'],
    [manifest => { manifest.references[0].purpose = 'instructions'; }, 'unknown purpose'],
    [manifest => { manifest.components = []; }, 'no components'],
  ];
  for (const [edit, message] of cases) {
    const zip = await repack(react(), (files, root) => editManifest(files, root, edit));
    await expect(planImportFromZip(zip), message).rejects.toThrow(message);
  }
  const invalidJson = await repack(react(), (files, root) => { files[root + 'manifest.json'] = strToU8('{'); });
  await expect(planImportFromZip(invalidJson)).rejects.toThrow('not valid JSON');
  const two = await repack(react(), files => { files['other/manifest.json'] = strToU8('{}'); });
  await expect(planImportFromZip(two)).rejects.toThrow('more than one');
  await expect(planImportFromZip(zipSync({ 'src/Button.tsx': strToU8('x') }))).rejects.toThrow('explicit mapping');
});

test('ZIP reader rejects traversal, unsafe names, case collisions, symlinks and encryption', () => {
  for (const name of ['../evil.txt', 'a/../../evil.txt', 'lib/NUL.txt', 'lib/a:b.txt', 'lib/trailing. ']) {
    expect(() => readZipEntries(zipSync({ [name]: strToU8('x') })), name).toThrow('Unsafe archive path');
  }
  expect(() => readZipEntries(zipSync({ 'lib/Button.tsx': strToU8('a'), 'lib/button.tsx': strToU8('b') }))).toThrow('case-colliding');
  const symlink = zipSync({ 'lib/link': strToU8('/etc/passwd') });
  const header = centralHeader(symlink);
  header.setUint16(4, (3 << 8) | 20, true);
  header.setUint32(38, (0o120777 << 16) >>> 0, true);
  expect(() => readZipEntries(symlink)).toThrow('Symbolic links');
  const encrypted = zipSync({ 'lib/secret.txt': strToU8('x') });
  const flags = centralHeader(encrypted);
  flags.setUint16(8, flags.getUint16(8, true) | 1, true);
  expect(() => readZipEntries(encrypted)).toThrow('Encrypted');
  expect(() => readZipEntries(strToU8('not a zip'))).toThrow('not a readable ZIP');
});

test('expansion is bounded by actual inflated bytes, not header sizes', () => {
  const big = new Uint8Array(MAX_IMPORT_ENTRY_BYTES + 1);
  expect(() => readZipEntries(zipSync({ 'lib/big.txt': big }))).toThrow('per-file import limit');
  // A forged small declared size must not let a highly compressible entry expand unchecked.
  const lying = zipSync({ 'lib/big.txt': big }, { level: 9 });
  centralHeader(lying).setUint32(24, 10, true);
  expect(() => readZipEntries(lying)).toThrow('expands beyond');
  const many: Record<string, Uint8Array> = {};
  for (let index = 0; index < 33; index++) many[`lib/part${index}.bin`] = new Uint8Array(MAX_IMPORT_ENTRY_BYTES);
  expect(() => readZipEntries(zipSync(many, { level: 9 }))).toThrow('64 MiB import limit');
});

test('project conflicts block confirmation: existing names, reference filename collisions and quota', async () => {
  const plan = await planImportFromZip((await createLibraryZip(react())).bytes);
  expect(projectConflicts(plan, { componentNames: [], referenceFilenames: [] })).toEqual([]);
  const issues = projectConflicts(plan, { componentNames: ['BUTTON'], referenceFilenames: ['Design.md', ...Array.from({ length: 17 }, (_, index) => `doc${index}.md`)] });
  expect(issues.join('\n')).toContain('Component Button already exists');
  expect(issues.join('\n')).toContain('"design.md" is used 2 times');
  expect(issues.join('\n')).toContain('limit is 20');
});
