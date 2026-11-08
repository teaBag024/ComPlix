/** Output files are stack-neutral data; never executable configuration for the host. */
export type WorkspaceFile = { path: string; content: string };
export type TargetStack = { framework: string; language: string; styling: string; libraries: string; versions: string };
export type WorkspaceRevision = { projectId: string; revisionId: string; target: TargetStack; files: WorkspaceFile[] };
export type CheckResult = { passed: boolean; diagnostics: string[] };
export type PreviewSession = {
  /** Protected gateway URL, without sandbox credentials. */
  url: string;
  refresh(revision: WorkspaceRevision): Promise<void>;
  dispose(): Promise<void>;
};
/** Implemented by a trusted isolated controller, never by generated code. */
export interface StackRuntime {
  resolveDependencies(adapterId: string, revision: WorkspaceRevision): Promise<CheckResult>;
  compile(adapterId: string, revision: WorkspaceRevision): Promise<CheckResult>;
  validate(adapterId: string, revision: WorkspaceRevision): Promise<CheckResult>;
  startPreview(adapterId: string, revision: WorkspaceRevision): Promise<PreviewSession>;
}
export interface StackAdapter {
  id: string;
  label: string;
  conventions: string;
  generationInstructions: string;
  matches(target: TargetStack): boolean;
  documentation(files: WorkspaceFile[]): WorkspaceFile[];
  resolveDependencies(revision: WorkspaceRevision, runtime?: StackRuntime): Promise<CheckResult>;
  compile(revision: WorkspaceRevision, runtime?: StackRuntime): Promise<CheckResult>;
  validate(revision: WorkspaceRevision, runtime?: StackRuntime): Promise<CheckResult>;
  startPreview(revision: WorkspaceRevision, runtime?: StackRuntime): Promise<PreviewSession>;
  prepareExport(revision: WorkspaceRevision): WorkspaceFile[];
}
function adapter(spec: Pick<StackAdapter, 'id' | 'label' | 'conventions' | 'generationInstructions' | 'matches'>): StackAdapter {
  function requireRuntime(revision: WorkspaceRevision, runtime?: StackRuntime): StackRuntime {
    if (!spec.matches(revision.target)) throw new Error('Revision target does not match adapter.');
    if (!runtime) throw new Error(`${spec.label}: isolated build/runtime is not connected.`);
    return runtime;
  }
  return {
    ...spec,
    documentation: files => files.filter(file => /\.(md|mdx|xml)$/i.test(file.path)),
    resolveDependencies: async (revision, runtime) => requireRuntime(revision, runtime).resolveDependencies(spec.id, revision),
    compile: async (revision, runtime) => requireRuntime(revision, runtime).compile(spec.id, revision),
    validate: async (revision, runtime) => requireRuntime(revision, runtime).validate(spec.id, revision),
    startPreview: async (revision, runtime) => {
      const controller = requireRuntime(revision, runtime);
      for (const phase of ['resolveDependencies', 'compile', 'validate'] as const) {
        const result = await controller[phase](spec.id, revision);
        if (!result.passed) throw new Error(`${spec.label}: ${phase} failed. Preview was not started.`);
      }
      const session = await controller.startPreview(spec.id, revision);
      return { url: session.url,
        refresh: async next => {
          requireRuntime(next, runtime);
          if (next.projectId !== revision.projectId) throw new Error('Preview cannot switch projects.');
          for (const phase of ['resolveDependencies', 'compile', 'validate'] as const) {
            if (!(await controller[phase](spec.id, next)).passed) throw new Error('Preview refresh checks failed.');
          }
          await session.refresh(next);
        }, dispose: () => session.dispose() };
    },
    prepareExport: revision => {
      if (!spec.matches(revision.target)) throw new Error('Revision target does not match adapter.');
      return [...revision.files.map(file => ({ ...file })), { path: 'COMPLIX-EXPORT.md', content: `# ${spec.label} draft export\n\n${spec.conventions}\n\nRequested versions: ${revision.target.versions || 'unspecified'}.\nUnverified source; export preparation does not establish build or runtime support.` }];
    },
  };
}
const exact = (value: string, accepted: string[]) => accepted.includes(value.trim().toLowerCase());
export const reactAdapter = adapter({
  id: 'react-tailwind-shadcn', label: 'React + TypeScript + Tailwind + shadcn/ui',
  matches: target => exact(target.framework, ['react']) && exact(target.language, ['typescript']) && exact(target.styling, ['tailwind', 'tailwind css']) && exact(target.libraries, ['shadcn/ui']),
  conventions: 'Use .tsx components, shared .ts utilities, CSS styles, package.json dependency declarations, Markdown documentation and separate .tsx examples. Keep Common reusable.',
  generationInstructions: 'Generate React TypeScript components using Tailwind and shadcn/ui. Declare imports and package dependencies explicitly. Include public API documentation and usage examples. Respect requested versions; do not claim browser compilation or runtime verification.',
});
export const blazorAdapter = adapter({
  id: 'blazor-bootstrap', label: 'Blazor + Bootstrap',
  matches: target => exact(target.framework, ['blazor']) && exact(target.language, ['c#', 'csharp']) && exact(target.styling, ['bootstrap']) && !target.libraries.trim(),
  conventions: 'Use .razor components, optional .razor.cs code-behind and .razor.css styles, a Razor class-library .csproj, Markdown/API documentation and separate .razor examples. Keep Common reusable.',
  generationInstructions: 'Generate Blazor components using Bootstrap. Declare NuGet dependencies in the project file. Document parameters and EventCallbacks and supply Razor examples. Do not substitute JSX or React. Do not choose an unspecified render mode or .NET version silently. Compilation requires a compatible isolated .NET runtime.',
});
export const stackAdapters: readonly StackAdapter[] = [reactAdapter, blazorAdapter];
export function selectStackAdapter(target: TargetStack, registry = stackAdapters): StackAdapter | undefined {
  const matches = registry.filter(item => item.matches(target));
  return matches.length === 1 ? matches[0] : undefined;
}
export function stackGenerationInstructions(target: TargetStack): string {
  const selected = selectStackAdapter(target);
  return selected ? `${selected.conventions}\n${selected.generationInstructions}` : 'Unsupported target stack: no verified adapter matches these requested technologies. Discuss requirements or return CLARIFICATIONS.md; do not substitute React or claim generic compilation support.';
}
