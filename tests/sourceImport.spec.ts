import { test, expect } from '@playwright/test';
import { zipSync, strToU8 } from 'fflate';
import { buildSourceImport, componentName, defaultMapping, planAnyImportFromZip, type SourcePlan } from '../shared/sourceImport';
import { createLibraryZip } from '../shared/libraryExport';
import { decodeImportPayload, encodeImportPayload } from '../shared/importPayload';
import { planToPayload } from '../shared/componentImport';

const repo = () => zipSync({
  'my-app/package.json': strToU8(JSON.stringify({ dependencies: { react: '^19.0.0', tailwindcss: '4.1.0' } })),
  'my-app/src/components/ui/button.tsx': strToU8('import { cn } from "@/lib/utils";\nexport function Button() { return <button className={cn("b")} />; }\n'),
  'my-app/src/components/ui/button.test.tsx': strToU8('import { Button } from "./button";\n'),
  'my-app/src/components/ui/card.tsx': strToU8('export function Card() { return <div />; }\n'),
  'my-app/src/components/LoginForm/LoginForm.tsx': strToU8('import { Button } from "../ui/button";\nimport { Field } from "./Field";\nexport function LoginForm() { return <Button />; }\n'),
  'my-app/src/components/LoginForm/Field.tsx': strToU8('export function Field() { return <input />; }\n'),
  'my-app/src/components/LoginForm/README.md': strToU8('# LoginForm\n'),
  'my-app/src/lib/utils.ts': strToU8('export const cn = (...v: string[]) => v.join(" ");\n'),
  'my-app/node_modules/react/index.js': strToU8('module.exports = {};'),
  'my-app/.git/HEAD': strToU8('ref: refs/heads/main'),
  'my-app/dist/app.js': strToU8('bundle'),
  'my-app/.env.local': strToU8('SECRET=1'),
  'my-app/package-lock.json': strToU8('{}'),
  'my-app/public/logo.png': new Uint8Array([137, 80, 78, 71, 0, 1]),
  'my-app/src/components/ui/broken.tsx': new Uint8Array([0xff, 0xfe, 0x00]),
});
async function plan() { return await planAnyImportFromZip(repo()) as SourcePlan; }

test('ordinary ZIPs give every file a disposition and exclude build output, dependencies, secrets and binaries', async () => {
  const result = await plan();
  expect(result.kind).toBe('source');
  const reason = (path: string) => result.files.find(file => file.path === path)?.excluded ?? '';
  expect(result.files).toHaveLength(result.totals.files);
  expect(reason('node_modules/react/index.js')).toContain('node_modules');
  expect(reason('.git/HEAD')).toContain('.git');
  expect(reason('dist/app.js')).toContain('dist');
  expect(reason('.env.local')).toContain('credential');
  expect(reason('package-lock.json')).toContain('Lockfile');
  expect(reason('public/logo.png')).toContain('Unsupported');
  expect(reason('src/components/ui/broken.tsx')).toContain('UTF-8');
  expect(reason('src/components/ui/button.tsx')).toBe('');
  expect(result.detectedTechnologies).toEqual(expect.arrayContaining(['React', 'TypeScript', 'Tailwind CSS 4.1.0']));
});

test('suggestions group component folders and split collection folders by file stem with hints only', async () => {
  const result = await plan();
  const find = (name: string) => result.suggestions.find(item => item.name === name);
  expect(find('LoginForm')).toMatchObject({ category: 'composition', files: ['src/components/LoginForm/Field.tsx', 'src/components/LoginForm/LoginForm.tsx', 'src/components/LoginForm/README.md'] });
  expect(find('Button')).toMatchObject({ category: 'common', files: ['src/components/ui/button.test.tsx', 'src/components/ui/button.tsx'] });
  expect(find('Card')?.category).toBe('common');
  expect(find('Utils')?.files).toEqual(['src/lib/utils.ts']);
  // Project-level files are not assigned to any component by default.
  expect(result.suggestions.flatMap(item => item.files)).not.toContain('package.json');
  expect(componentName('date-picker.tsx')).toBe('DatePicker');
});

test('mapping re-roots files, reports cross-component and alias imports, and the payload passes server validation', async () => {
  const result = await plan();
  const mapping = defaultMapping(result);
  const utils = mapping.components.findIndex(item => item.name === 'Utils');
  mapping.assignment['src/lib/utils.ts'] = -1; // user chooses not to import the shared utility
  mapping.components[utils].name = 'UnusedUtils';
  const built = buildSourceImport(result, { ...mapping, components: mapping.components });
  expect(built.issues).toEqual(['Component UnusedUtils has no files. Assign files or remove it.']);
  const withoutUtils = { components: mapping.components.filter((_, index) => index !== utils), assignment: Object.fromEntries(Object.entries(mapping.assignment).map(([path, index]) => [path, index > utils ? index - 1 : index])) };
  const ok = buildSourceImport(result, withoutUtils);
  expect(ok.issues).toEqual([]);
  expect(ok.skipped).toEqual(expect.arrayContaining(['package.json', 'src/lib/utils.ts']));
  const login = ok.components.find(item => item.name === 'LoginForm')!;
  expect(login.files.map(file => file.path).sort()).toEqual(['Compositions/LoginForm/Field.tsx', 'Compositions/LoginForm/LoginForm.tsx', 'Compositions/LoginForm/README.md']);
  expect(login.warnings.join('\n')).toContain('from component Button; the relative path will break');
  expect(login.warnings.join('\n')).not.toContain('./Field');
  const button = ok.components.find(item => item.name === 'Button')!;
  expect(button.files.map(file => file.path).sort()).toEqual(['Common/Button/button.test.tsx', 'Common/Button/button.tsx']);
  expect(button.warnings.join('\n')).toContain('Alias import @/lib/utils');
  const decoded = decodeImportPayload(encodeImportPayload(planToPayload({ components: ok.components, references: [] })));
  expect(decoded.components.map(item => item.name).sort()).toEqual(['Button', 'Card', 'LoginForm']);
});

test('mapping rejects invalid or duplicate names and over-limit components without dropping files silently', async () => {
  const result = await plan();
  const mapping = defaultMapping(result);
  mapping.components[0].name = 'bad name';
  mapping.components[1].name = mapping.components[2].name.toUpperCase();
  const built = buildSourceImport(result, mapping);
  expect(built.issues.join('\n')).toContain('"bad name" must use');
  expect(built.issues.join('\n')).toContain('used more than once');
  const many: Record<string, Uint8Array> = {};
  for (let index = 0; index < 21; index++) many[`repo/Big/part${index}.ts`] = strToU8('export {};');
  const big = await planAnyImportFromZip(zipSync(many)) as SourcePlan;
  expect(buildSourceImport(big, defaultMapping(big)).issues.join('\n')).toContain('1–20 files');
  await expect(planAnyImportFromZip(zipSync({ 'node_modules/x.js': strToU8('x') }))).rejects.toThrow('No importable source files');
});

test('ZIPs with a ComPlix manifest still use the verified export path', async () => {
  const archive = await createLibraryZip({ exportedAt: '2026-11-08T12:00:00.000Z', project: { id: '1', name: 'L', revision: '1', framework: 'React', language: 'TypeScript', styling: '', libraries: '', versions: '' },
    guidance: [], warnings: [], references: [], components: [{ id: '2', name: 'Button', category: 'common', rootPath: 'Common/Button', jobId: '3', revision: '0', model: 'x', origin: 'generated', files: [{ path: 'Common/Button/Button.tsx', content: 'export {};' }] }] });
  expect((await planAnyImportFromZip(archive.bytes)).kind).toBe('complix');
});
