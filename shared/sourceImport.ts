import { findBundleRoot, planComplixImport, readZipEntries, ImportError, type ArchiveEntry, type ImportedComponent, type ImportPlan } from './componentImport';
import { validateDraftFiles } from './draftFiles';
import { importRootPath } from './importPayload';

/**
 * Existing-component import, increment 4: ordinary source ZIPs. Nothing is inferred as final: the
 * planner proposes groups and the user's mapping decides. Files are re-rooted under the stored
 * component root (Common/<name> or Compositions/<name>); imports are reported, never rewritten.
 */

export type SourceFile = { path: string; content: string; excluded?: string };
export type SourceSuggestion = { name: string; category: 'common' | 'composition'; files: string[] };
export type SourcePlan = {
  kind: 'source';
  totals: { files: number; expandedBytes: number };
  /** Every archive file, with the reason when it cannot be imported. */
  files: SourceFile[];
  suggestions: SourceSuggestion[];
  /** Source-derived hints for review only; never applied to the project. */
  detectedTechnologies: string[];
};
export type SourceMapping = { components: Array<{ name: string; category: 'common' | 'composition' }>; /** path -> component index, or -1 for "don't import". */ assignment: Record<string, number> };
export type SourceBuild = { components: ImportedComponent[]; issues: string[]; skipped: string[] };

const EXCLUDED_DIRS = new Set(['node_modules', '.git', '.svn', '.hg', 'dist', 'build', 'out', '.next', '.nuxt', '.turbo', '.cache', 'coverage', 'bin', 'obj', '.vs', '.idea', '.vscode', '__pycache__', 'storybook-static']);
const SOURCE_EXTENSIONS = new Set(['tsx', 'ts', 'jsx', 'js', 'mjs', 'cjs', 'css', 'scss', 'sass', 'less', 'md', 'mdx', 'json', 'razor', 'cs', 'cshtml', 'html', 'xml', 'svg']);
const CREDENTIAL = /^(\.env(\..*)?|\.npmrc|\.netrc|id_rsa.*|id_ed25519.*|.*\.(pem|key|p12|pfx|keystore))$/i;
const LOCKFILES = new Set(['package-lock.json', 'yarn.lock', 'pnpm-lock.yaml', 'bun.lockb', 'packages.lock.json']);
// Folders that usually hold many components side by side; their files group by file stem instead.
const COLLECTION_DIRS = new Set(['components', 'component', 'ui', 'common', 'shared', 'primitives', 'atoms', 'molecules', 'organisms', 'compositions', 'widgets', 'src', 'lib', 'app', 'pages', 'hooks', 'utils']);
const COMMON_HINTS = new Set(['ui', 'common', 'primitives', 'atoms', 'foundation', 'base', 'core']);

function exclusion(path: string, bytes: Uint8Array): { reason: string } | { content: string } {
  const parts = path.split('/');
  const name = parts[parts.length - 1];
  const dir = parts.slice(0, -1).find(part => EXCLUDED_DIRS.has(part.toLowerCase()));
  if (dir) return { reason: `Build output, dependency or tool folder (${dir}).` };
  if (CREDENTIAL.test(name)) return { reason: 'Possible credential file; never imported.' };
  if (LOCKFILES.has(name.toLowerCase())) return { reason: 'Lockfile; not part of a component.' };
  const extension = name.includes('.') ? name.split('.').pop()!.toLowerCase() : '';
  if (!SOURCE_EXTENSIONS.has(extension)) return { reason: 'Unsupported file type (only text source, styles and docs are imported).' };
  let content: string;
  try { content = new TextDecoder('utf-8', { fatal: true }).decode(bytes); } catch { return { reason: 'Not valid UTF-8 text.' }; }
  if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(content)) return { reason: 'Contains binary control characters.' };
  if (bytes.length > 256 * 1024) return { reason: 'Larger than the 256 KiB component draft limit.' };
  return { content };
}

/** Converts a folder or file stem into a valid component name (letters, numbers, - and _). */
export function componentName(raw: string) {
  const words = raw.replace(/\.[^.]*$/, '').split(/[^A-Za-z0-9]+/).filter(Boolean);
  const name = words.map(word => word[0].toUpperCase() + word.slice(1)).join('').slice(0, 80);
  return name || 'Component';
}

export function planSourceImport(entries: ArchiveEntry[]): SourcePlan {
  // Strip a single wrapper folder (common for zipped repositories) so suggestions use meaningful paths.
  const tops = new Set(entries.map(entry => entry.path.split('/')[0]));
  // Never strip an excluded folder (a ZIP of only node_modules/ must not become importable).
  const wrapper = tops.size === 1 && !EXCLUDED_DIRS.has([...tops][0].toLowerCase()) && entries.every(entry => entry.path.includes('/')) ? [...tops][0] + '/' : '';
  const files: SourceFile[] = entries.map(entry => {
    const path = entry.path.slice(wrapper.length);
    const result = exclusion(path, entry.bytes);
    return 'reason' in result ? { path, content: '', excluded: result.reason } : { path, content: result.content };
  }).sort((a, b) => a.path.localeCompare(b.path));
  const included = files.filter(file => !file.excluded);
  if (!included.length) throw new ImportError('No importable source files were found in this ZIP.');

  // Group key: the file's folder, unless the folder is a collection (ui/, components/...), then the file stem.
  const groups = new Map<string, { key: string; files: string[]; hint: string[] }>();
  for (const file of included) {
    const parts = file.path.split('/');
    const filename = parts.pop()!;
    if (!parts.length && /^(package\.json|tsconfig.*\.json|readme\.md|.*\.csproj|.*\.sln)$/i.test(filename)) continue; // project-level files stay unassigned
    const folder = parts[parts.length - 1] ?? '';
    const key = !folder || COLLECTION_DIRS.has(folder.toLowerCase()) ? [...parts, filename.split('.')[0]].join('/') : parts.join('/');
    const group = groups.get(key) ?? { key, files: [], hint: parts.map(part => part.toLowerCase()) };
    group.files.push(file.path);
    groups.set(key, group);
  }
  const used = new Set<string>();
  const suggestions = [...groups.values()].map(group => {
    let name = componentName(group.key.split('/').pop()!);
    for (let index = 2; used.has(name.toLowerCase()); index++) name = componentName(group.key.split('/').pop()!).slice(0, 76) + index;
    used.add(name.toLowerCase());
    return { name, category: group.hint.some(part => COMMON_HINTS.has(part)) ? 'common' : 'composition', files: group.files } satisfies SourceSuggestion;
  });

  const detected = new Set<string>();
  const extensions = new Set(included.map(file => file.path.split('.').pop()!.toLowerCase()));
  if (extensions.has('tsx') || extensions.has('jsx')) detected.add('React');
  if (extensions.has('ts') || extensions.has('tsx')) detected.add('TypeScript');
  if (extensions.has('razor')) detected.add('Blazor');
  const packageJson = files.find(file => /(^|\/)package\.json$/.test(file.path) && !file.excluded);
  if (packageJson) {
    try {
      const pkg = JSON.parse(packageJson.content);
      const deps = { ...pkg.dependencies, ...pkg.devDependencies } as Record<string, string>;
      for (const [dep, label] of [['tailwindcss', 'Tailwind CSS'], ['@radix-ui/react-slot', 'shadcn/ui (Radix)'], ['bootstrap', 'Bootstrap'], ['react', 'React']] as const) if (deps[dep]) detected.add(`${label} ${String(deps[dep]).slice(0, 20)}`.trim());
    } catch { /* malformed package.json is just not used as a hint */ }
  }
  if (included.some(file => /\.razor$/.test(file.path) && /class="[^"]*\b(btn|card|form-control|alert)\b/.test(file.content))) detected.add('Bootstrap classes');
  return { kind: 'source', totals: { files: entries.length, expandedBytes: entries.reduce((sum, entry) => sum + entry.bytes.length, 0) }, files, suggestions, detectedTechnologies: [...detected] };
}

export function defaultMapping(plan: SourcePlan): SourceMapping {
  const assignment: Record<string, number> = {};
  for (const file of plan.files) if (!file.excluded) assignment[file.path] = -1;
  plan.suggestions.forEach((suggestion, index) => { for (const path of suggestion.files) assignment[path] = index; });
  return { components: plan.suggestions.map(({ name, category }) => ({ name, category })), assignment };
}

const IMPORT_PATTERN = /(?:import|export)\s[^'"]*?from\s*['"]([^'"]+)['"]|import\s*\(\s*['"]([^'"]+)['"]\s*\)|require\(\s*['"]([^'"]+)['"]\s*\)|@import\s+['"]([^'"]+)['"]/g;
function resolveRelative(from: string, specifier: string, paths: Set<string>) {
  const parts = from.split('/').slice(0, -1);
  for (const part of specifier.split('/')) { if (part === '..') parts.pop(); else if (part !== '.') parts.push(part); }
  const base = parts.join('/');
  return [base, ...['.ts', '.tsx', '.js', '.jsx', '.css', '.scss', '.json', '/index.ts', '/index.tsx', '/index.js', '/index.jsx'].map(ext => base + ext)].find(path => paths.has(path));
}
function commonDirectory(paths: string[]) {
  const split = paths.map(path => path.split('/').slice(0, -1));
  const first = split[0] ?? [];
  let length = 0;
  while (length < first.length && split.every(parts => parts[length] === first[length])) length++;
  return first.slice(0, length).join('/');
}

/** Applies the user's mapping: validates names and limits, re-roots files and reports import breakage. */
export function buildSourceImport(plan: SourcePlan, mapping: SourceMapping): SourceBuild {
  const issues: string[] = [];
  const byPath = new Map(plan.files.filter(file => !file.excluded).map(file => [file.path, file]));
  const names = new Map<string, number>();
  mapping.components.forEach(item => names.set(item.name.toLowerCase(), (names.get(item.name.toLowerCase()) ?? 0) + 1));
  const owner = (path: string) => mapping.assignment[path] ?? -1;
  const components: ImportedComponent[] = [];
  mapping.components.forEach((item, index) => {
    const paths = [...byPath.keys()].filter(path => owner(path) === index);
    if (!/^[a-zA-Z0-9_-]{1,80}$/.test(item.name)) { issues.push(`Component name ${JSON.stringify(item.name)} must use 1-80 letters, numbers, hyphens or underscores.`); return; }
    if ((names.get(item.name.toLowerCase()) ?? 0) > 1) { issues.push(`Component name ${item.name} is used more than once.`); return; }
    if (!paths.length) { issues.push(`Component ${item.name} has no files. Assign files or remove it.`); return; }
    const root = importRootPath(item.name, item.category);
    const base = commonDirectory(paths);
    const files = paths.map(path => ({ path: root + '/' + (base ? path.slice(base.length + 1) : path), content: byPath.get(path)!.content }));
    try { validateDraftFiles(files); } catch (cause) { issues.push(`Component ${item.name}: ${cause instanceof Error ? cause.message : 'invalid files'}`); return; }
    const warnings: string[] = [];
    const all = new Set(byPath.keys());
    for (const path of paths) {
      if (!/\.(tsx?|jsx?|mjs|cjs|css|scss|less)$/i.test(path)) continue;
      for (const match of byPath.get(path)!.content.matchAll(IMPORT_PATTERN)) {
        const specifier = match[1] ?? match[2] ?? match[3] ?? match[4];
        if (!specifier) continue;
        if (specifier.startsWith('.')) {
          const target = resolveRelative(path, specifier, all);
          if (!target) warnings.push(`Unresolved relative import ${specifier} in ${path}.`);
          else if (owner(target) === -1) warnings.push(`${path} imports ${target}, which is not being imported.`);
          else if (owner(target) !== index) warnings.push(`${path} imports ${target} from component ${mapping.components[owner(target)]?.name}; the relative path will break after re-rooting and is not rewritten.`);
        } else if (/^[@~#]\//.test(specifier)) warnings.push(`Alias import ${specifier} in ${path}; configure the alias or edit the import.`);
        else if (!/\.(css|scss)$/.test(specifier)) warnings.push(`Imports ${specifier.slice(0, 80)}; preview only provides pinned template packages.`);
      }
    }
    components.push({ name: item.name, category: item.category, rootPath: root, files, warnings: [...new Set(warnings)].slice(0, 20) });
  });
  if (!components.length && !issues.length) issues.push('Assign files to at least one component.');
  const skipped = [...byPath.keys()].filter(path => owner(path) === -1);
  return { components, issues, skipped };
}

export type AnyImportPlan = ImportPlan | SourcePlan;
/** Reads a ZIP once and plans it as a ComPlix export when it has a manifest, otherwise as ordinary source. */
export async function planAnyImportFromZip(zip: Uint8Array): Promise<AnyImportPlan> {
  const entries = readZipEntries(zip);
  return findBundleRoot(entries) === undefined ? planSourceImport(entries) : planComplixImport(entries);
}
