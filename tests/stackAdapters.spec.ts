import { test, expect } from '@playwright/test';
import { blazorAdapter, reactAdapter, selectStackAdapter, type StackRuntime, type WorkspaceRevision } from '../shared/stackAdapters';
import { nvidiaMessages } from '../shared/nvidiaDraft';

const target = { framework: 'Blazor', language: 'C#', styling: 'Bootstrap', libraries: '', versions: '' };
const revision: WorkspaceRevision = { projectId: 'one', revisionId: 'draft', target, files: [{ path: 'Common/Button.razor', content: '<button>@ChildContent</button>' }, { path: 'README.md', content: '# Button' }] };
test('adapter selection never falls back to React or generic compilation', () => {
  expect(selectStackAdapter(target)).toBe(blazorAdapter);
  expect(selectStackAdapter({ ...target, framework: 'Angular' })).toBeUndefined();
  expect(selectStackAdapter({ ...target, framework: 'React' })).toBeUndefined();
  expect(selectStackAdapter({ framework: 'React', language: 'TypeScript', styling: 'Tailwind CSS', libraries: 'shadcn/ui', versions: '' })).toBe(reactAdapter);
  expect(nvidiaMessages(JSON.stringify({ technologies: target }))[0].content).toContain('.razor');
  expect(nvidiaMessages(JSON.stringify({ technologies: { ...target, framework: 'Vue' } }))[0].content).toContain('Unsupported target stack');
  expect(blazorAdapter.prepareExport(revision).map(file => file.path)).toContain('Common/Button.razor');
  expect(blazorAdapter.documentation(revision.files)[0].path).toBe('README.md');
});
test('preview checks gate startup and refresh; runtime missing and cross-project refresh fail', async () => {
  const calls: string[] = [];
  let pass = true;
  const runtime: StackRuntime = {
    resolveDependencies: async () => { calls.push('dependencies'); return { passed: pass, diagnostics: [] }; },
    compile: async () => { calls.push('compile'); return { passed: true, diagnostics: [] }; },
    validate: async () => { calls.push('validate'); return { passed: true, diagnostics: [] }; },
    startPreview: async () => { calls.push('start'); return { url: 'https://preview.example/revision', refresh: async () => { calls.push('refresh'); }, dispose: async () => { calls.push('dispose'); } }; },
  };
  await expect(blazorAdapter.startPreview(revision)).rejects.toThrow('not connected');
  const session = await blazorAdapter.startPreview(revision, runtime);
  expect(calls).toEqual(['dependencies', 'compile', 'validate', 'start']);
  await expect(session.refresh({ ...revision, projectId: 'other' })).rejects.toThrow('switch projects');
  pass = false;
  await expect(session.refresh(revision)).rejects.toThrow('checks failed');
  await expect(blazorAdapter.startPreview(revision, runtime)).rejects.toThrow('failed');
  expect(calls.filter(item => item === 'start')).toHaveLength(1);
  await session.dispose(); expect(calls.at(-1)).toBe('dispose');
});
