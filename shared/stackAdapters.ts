/** Output files are stack-neutral data; never executable configuration for the host. */
export type WorkspaceFile = { path: string; content: string };
export type TargetStack = { framework: string; language: string; styling: string; libraries: string; versions: string };
export type WorkspaceRevision = { projectId: string; revisionId: string; sourceJobId?: string; draftRevision?: string; target: TargetStack; files: WorkspaceFile[] };
export type CheckResult = { passed: boolean; diagnostics: string[] };
export type PreviewSession = {
  /** Protected gateway URL, without sandbox credentials. */
  url: string;
  versions?: string;
  expiresAt?: number;
  refresh(revision: WorkspaceRevision): Promise<void>;
  dispose(): Promise<void>;
};
/** Implemented by a trusted isolated controller, never by generated code. */
export interface StackRuntime {
  cancelBuild?(revision: WorkspaceRevision): void;
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
        if (!result.passed) throw new Error(`${spec.label}: ${phase} failed. ${result.diagnostics.join('\n').slice(0, 6000)}`);
      }
      const session = await controller.startPreview(spec.id, revision);
      return { get url() { return session.url; }, get versions() { return session.versions; }, get expiresAt() { return session.expiresAt; },
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
// Match on framework and language only. Styling, extra libraries and version text do not block a
// stack: the preview host supplies Tailwind/shadcn (React) or Bootstrap (Blazor), and unsupported
// imports fail visibly at build time instead.
const isReactTypeScript = (target: TargetStack) => /\breact\b/i.test(target.framework) && !/\bnative\b/i.test(target.framework)
  && /\b(typescript|ts|tsx)\b/i.test(`${target.language} ${target.framework}`);
const isBlazor = (target: TargetStack) => /\bblazor\b/i.test(target.framework) && (!target.language.trim() || /(c#|csharp|\.net|razor)/i.test(target.language));
export const reactAdapter = adapter({
  id: 'react-tailwind-shadcn', label: 'React + TypeScript + Tailwind + shadcn/ui',
  matches: isReactTypeScript,
  conventions: 'Use .tsx components, shared .ts utilities, CSS styles, package.json dependency declarations, Markdown documentation and separate .tsx examples. Keep Common reusable.',
  generationInstructions: 'Generate React TypeScript components using Tailwind and shadcn/ui. Declare imports and package dependencies explicitly. Include public API documentation and usage examples. Include examples/Preview.tsx with a default-exported interactive example requiring no props. It may import reusable Common implementations; it is a demo host entry, not a complete application. The initial preview environment provides React 19.3.1, TypeScript 7.0.2, Tailwind 4.3.5 and Radix Slot, CVA, clsx, tailwind-merge and lucide-react; other dependencies need a separately verified environment. Respect requested versions; do not claim build/runtime verification.',
});
export const blazorAdapter = adapter({
  id: 'blazor-bootstrap', label: 'Blazor + Bootstrap',
  matches: isBlazor,
  conventions: 'Use .razor components, optional .razor.cs code-behind and .razor.css styles, a Razor class-library .csproj, Markdown/API documentation and separate .razor examples. Keep Common reusable.',
  generationInstructions: 'Generate Blazor components using Bootstrap. Declare NuGet dependencies in the project file. Document parameters and EventCallbacks. Include Examples/Preview.razor with @namespace ComPlixPreview.Library.Examples as the interactive example entry, importing reusable Common components. The preview-only host is .NET 10.0 / WebAssembly with Bootstrap 5.3.8; that does not change the requested consuming application render mode. Do not substitute JSX or React or silently change a requested .NET version. Other NuGet dependencies need a separately verified environment.',
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
