import { Inflate } from 'fflate';
import { validateDraftFiles } from './draftFiles';
import { MAX_PDF_BYTES, MAX_PDF_TEXT_BYTES, MAX_PROJECT_REFERENCES, MAX_REFERENCE_BYTES, referencePurposes, validateReferenceFile } from './referenceFiles';
import type { WorkspaceFile } from './stackAdapters';
import type { ImportPayload } from './importPayload';

/**
 * Existing-component import, increment 1: bounded ZIP reading and ComPlix manifest validation.
 * Everything here is data handling only. Archive content is never evaluated, and all manifest
 * metadata (names, checksums, technologies) is untrusted input that only shapes a review plan.
 */

// Aggregate cap matches the export so any accepted ComPlix export can be re-imported.
export const MAX_IMPORT_EXPANDED_BYTES = 64 * 1024 * 1024;
export const MAX_IMPORT_COMPRESSED_BYTES = 64 * 1024 * 1024;
export const MAX_IMPORT_ENTRIES = 2000;
// Largest legitimate entry is a stored PDF reference; the manifest gets its own allowance.
export const MAX_IMPORT_ENTRY_BYTES = MAX_PDF_BYTES;
export const MAX_IMPORT_MANIFEST_BYTES = 8 * 1024 * 1024;
const INFLATE_SLICE = 4096;

export class ImportError extends Error {}

export type ArchiveEntry = { path: string; bytes: Uint8Array };

const COMPONENT_NAME = /^[a-zA-Z0-9_-]{1,80}$/;
const RESERVED = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i;

/** Rejects absolute, traversing, Windows-unsafe and control-character paths. */
export function validateArchivePath(path: string) {
  if (!path || path.length > 500 || path.startsWith('/') || /[\\:\u0000-\u001f\u007f<>"|?*]/.test(path)) throw new ImportError(`Unsafe archive path: ${JSON.stringify(path.slice(0, 120))}.`);
  for (const part of path.split('/')) {
    if (!part || part === '.' || part === '..' || /[. ]$/.test(part) || RESERVED.test(part)) throw new ImportError(`Unsafe archive path: ${JSON.stringify(path.slice(0, 120))}.`);
  }
  return path;
}

function inflateBounded(data: Uint8Array, limit: number, name: string) {
  const chunks: Uint8Array[] = [];
  let total = 0;
  let done = false;
  const inflater = new Inflate((chunk, final) => {
    total += chunk.length;
    if (total > limit) throw new ImportError(`${name} expands beyond the allowed size.`);
    chunks.push(chunk);
    if (final) done = true;
  });
  try {
    for (let offset = 0; offset < data.length; offset += INFLATE_SLICE) inflater.push(data.subarray(offset, offset + INFLATE_SLICE), offset + INFLATE_SLICE >= data.length);
    if (!data.length) inflater.push(new Uint8Array(0), true);
  } catch (cause) {
    if (cause instanceof ImportError) throw cause;
    throw new ImportError(`${name} is corrupt and could not be decompressed.`);
  }
  if (!done) throw new ImportError(`${name} is truncated.`);
  const output = new Uint8Array(total);
  let at = 0;
  for (const chunk of chunks) { output.set(chunk, at); at += chunk.length; }
  return output;
}

/**
 * Reads a ZIP from its central directory. Header sizes are untrusted: actual inflated bytes are
 * counted against per-entry and aggregate limits while decompressing. Rejects encryption,
 * symlinks, ZIP64, multi-disk archives, unsupported compression, duplicates and case collisions.
 */
export function readZipEntries(zip: Uint8Array): ArchiveEntry[] {
  if (zip.length > MAX_IMPORT_COMPRESSED_BYTES) throw new ImportError('The ZIP exceeds the 64 MiB import limit.');
  const view = new DataView(zip.buffer, zip.byteOffset, zip.byteLength);
  let eocd = -1;
  for (let at = zip.length - 22; at >= Math.max(0, zip.length - 22 - 65535); at--) {
    if (view.getUint32(at, true) === 0x06054b50) { eocd = at; break; }
  }
  if (eocd < 0) throw new ImportError('This file is not a readable ZIP archive.');
  if (view.getUint16(eocd + 4, true) !== 0 || view.getUint16(eocd + 6, true) !== 0) throw new ImportError('Multi-part ZIP archives are not supported.');
  const count = view.getUint16(eocd + 10, true);
  let at = view.getUint32(eocd + 16, true);
  if (count === 0xffff || at === 0xffffffff) throw new ImportError('ZIP64 archives are not supported.');
  if (count > MAX_IMPORT_ENTRIES) throw new ImportError(`The ZIP has more than ${MAX_IMPORT_ENTRIES} entries.`);
  const entries: ArchiveEntry[] = [];
  const seen = new Set<string>();
  let expanded = 0;
  const decoder = new TextDecoder('utf-8', { fatal: true });
  for (let index = 0; index < count; index++) {
    if (at + 46 > zip.length || view.getUint32(at, true) !== 0x02014b50) throw new ImportError('The ZIP central directory is corrupt.');
    const madeBy = view.getUint16(at + 4, true) >> 8;
    const flags = view.getUint16(at + 8, true);
    const method = view.getUint16(at + 10, true);
    const compressedSize = view.getUint32(at + 20, true);
    const declaredSize = view.getUint32(at + 24, true);
    const nameLength = view.getUint16(at + 28, true);
    const extraLength = view.getUint16(at + 30, true);
    const commentLength = view.getUint16(at + 32, true);
    const external = view.getUint32(at + 38, true);
    const localOffset = view.getUint32(at + 42, true);
    if (at + 46 + nameLength > zip.length) throw new ImportError('The ZIP central directory is corrupt.');
    let name: string;
    try { name = decoder.decode(zip.subarray(at + 46, at + 46 + nameLength)); } catch { throw new ImportError('The ZIP contains a file name that is not valid UTF-8.'); }
    at += 46 + nameLength + extraLength + commentLength;
    if (flags & 0x41) throw new ImportError(`Encrypted ZIP entries are not supported (${JSON.stringify(name.slice(0, 120))}).`);
    if (compressedSize === 0xffffffff || declaredSize === 0xffffffff || localOffset === 0xffffffff) throw new ImportError('ZIP64 archives are not supported.');
    const unixMode = external >>> 16;
    if (madeBy === 3 && (unixMode & 0xf000) === 0xa000) throw new ImportError(`Symbolic links are not allowed (${JSON.stringify(name.slice(0, 120))}).`);
    const isDirectory = name.endsWith('/');
    validateArchivePath(isDirectory ? name.slice(0, -1) : name);
    const key = name.toLowerCase();
    if (seen.has(key)) throw new ImportError(`The ZIP contains duplicate or case-colliding entries (${JSON.stringify(name.slice(0, 120))}).`);
    seen.add(key);
    if (isDirectory) { if (declaredSize || compressedSize) throw new ImportError('A ZIP directory entry contains data.'); continue; }
    if (localOffset + 30 > zip.length || view.getUint32(localOffset, true) !== 0x04034b50) throw new ImportError('A ZIP local file header is corrupt.');
    const dataStart = localOffset + 30 + view.getUint16(localOffset + 26, true) + view.getUint16(localOffset + 28, true);
    if (dataStart + compressedSize > zip.length) throw new ImportError('A ZIP entry extends beyond the archive.');
    const limit = name.toLowerCase().endsWith('manifest.json') ? MAX_IMPORT_MANIFEST_BYTES : MAX_IMPORT_ENTRY_BYTES;
    if (declaredSize > limit) throw new ImportError(`${name} exceeds the per-file import limit.`);
    const raw = zip.subarray(dataStart, dataStart + compressedSize);
    let bytes: Uint8Array;
    if (method === 0) bytes = raw.slice();
    else if (method === 8) bytes = inflateBounded(raw, limit, name);
    else throw new ImportError(`Unsupported ZIP compression method for ${JSON.stringify(name.slice(0, 120))}.`);
    if (bytes.length > limit) throw new ImportError(`${name} exceeds the per-file import limit.`);
    if (bytes.length !== declaredSize) throw new ImportError(`${name} does not match its declared size.`);
    expanded += bytes.length;
    if (expanded > MAX_IMPORT_EXPANDED_BYTES) throw new ImportError('The ZIP expands beyond the 64 MiB import limit.');
    entries.push({ path: name, bytes });
  }
  if (!entries.length) throw new ImportError('The ZIP contains no files.');
  return entries;
}

export type FileDisposition = { path: string; disposition: 'component' | 'reference' | 'design-reference' | 'handoff' | 'manifest'; detail: string };
export type ImportedComponent = { name: string; category: 'common' | 'composition'; rootPath: string; files: WorkspaceFile[]; warnings: string[] };
export type ImportedReference = { filename: string; purpose: keyof typeof referencePurposes; bytes: Uint8Array; text: string; origin: 'archive' | 'design-guidance' };
export type ImportPlan = {
  kind: 'complix';
  formatVersion: 1;
  root: string;
  totals: { files: number; expandedBytes: number };
  /** Archived requested technologies for review only; never applied automatically. */
  technologies: Record<string, string>;
  components: ImportedComponent[];
  references: ImportedReference[];
  files: FileDisposition[];
  warnings: string[];
};

// Generated handoff files: shown in the review but never imported as components or instructions.
const HANDOFF = new Set(['README.md', 'AGENTS.md', 'docs/dependencies.md', 'docs/technologies.md', 'docs/validation.md', 'examples/README.md', 'references/README.md']);
const TECHNOLOGY_KEYS = ['framework', 'language', 'styling', 'libraries', 'versions'] as const;

const isRecord = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
const str = (value: unknown, label: string, max = 500) => {
  if (typeof value !== 'string' || value.length > max) throw new ImportError(`The manifest has an invalid ${label}.`);
  return value;
};
const list = (value: unknown, label: string) => {
  if (!Array.isArray(value)) throw new ImportError(`The manifest is missing its ${label} list.`);
  return value as unknown[];
};
function utf8(bytes: Uint8Array, path: string) {
  try { return new TextDecoder('utf-8', { fatal: true }).decode(bytes); } catch { throw new ImportError(`${path} is not valid UTF-8 text.`); }
}
async function sha256(bytes: Uint8Array) {
  const digest = await crypto.subtle.digest('SHA-256', Uint8Array.from(bytes).buffer);
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
}

/** Finds the single wrapper folder of a ComPlix export. Returns undefined when no manifest is present. */
export function findBundleRoot(entries: ArchiveEntry[]) {
  const manifests = entries.filter(entry => /^[^/]+\/manifest\.json$/.test(entry.path) || entry.path === 'manifest.json');
  if (!manifests.length) return undefined;
  if (manifests.length > 1) throw new ImportError('The ZIP contains more than one ComPlix manifest. Upload a single library export.');
  const root = manifests[0].path === 'manifest.json' ? '' : manifests[0].path.split('/')[0] + '/';
  const outside = entries.find(entry => !entry.path.startsWith(root));
  if (outside) throw new ImportError(`Files outside the library folder were found (${JSON.stringify(outside.path.slice(0, 120))}). Upload an unmodified ComPlix export.`);
  return root;
}

/** Validates a ComPlix formatVersion 1 export and proposes components and references for review. */
export async function planComplixImport(entries: ArchiveEntry[]): Promise<ImportPlan> {
  const root = findBundleRoot(entries);
  if (root === undefined) throw new ImportError('No ComPlix manifest was found. Ordinary source ZIPs need explicit mapping, which is not available yet.');
  const files = new Map<string, Uint8Array>();
  for (const entry of entries) files.set(entry.path.slice(root.length), entry.bytes);
  let manifest: unknown;
  try { manifest = JSON.parse(utf8(files.get('manifest.json')!, 'manifest.json')); } catch (cause) {
    if (cause instanceof ImportError) throw cause;
    throw new ImportError('manifest.json is not valid JSON.');
  }
  if (!isRecord(manifest)) throw new ImportError('manifest.json must contain an object.');
  if (manifest.formatVersion !== 1) throw new ImportError('Unsupported ComPlix export version. This build reads formatVersion 1.');

  // Checksums detect inconsistency, not trust. Every archive file except the manifest must be declared and match.
  const declared = new Map<string, true>();
  for (const item of list(manifest.files, 'files')) {
    if (!isRecord(item)) throw new ImportError('The manifest has an invalid file record.');
    const path = str(item.path, 'file path');
    if (declared.has(path.toLowerCase())) throw new ImportError(`The manifest declares ${JSON.stringify(path)} twice.`);
    declared.set(path.toLowerCase(), true);
    const bytes = files.get(path);
    if (!bytes) throw new ImportError(`The manifest lists ${JSON.stringify(path)}, but the file is missing.`);
    if (item.byteLength !== bytes.length || typeof item.sha256 !== 'string' || item.sha256 !== await sha256(bytes)) throw new ImportError(`${path} does not match its manifest checksum. The archive was modified or corrupted.`);
  }
  for (const path of files.keys()) if (path !== 'manifest.json' && !declared.has(path.toLowerCase())) throw new ImportError(`${JSON.stringify(path)} is not declared in the manifest.`);

  const dispositions = new Map<string, FileDisposition>([['manifest.json', { path: 'manifest.json', disposition: 'manifest', detail: 'Validated archive manifest.' }]]);
  const claim = (path: string, disposition: FileDisposition['disposition'], detail: string) => {
    if (dispositions.has(path)) throw new ImportError(`${JSON.stringify(path)} is assigned more than once in the manifest.`);
    dispositions.set(path, { path, disposition, detail });
  };

  const project = isRecord(manifest.project) ? manifest.project : {};
  const technologies: Record<string, string> = {};
  for (const key of TECHNOLOGY_KEYS) technologies[key] = typeof project[key] === 'string' ? (project[key] as string).slice(0, 500) : '';

  const names = new Set<string>();
  const components: ImportedComponent[] = [];
  for (const item of list(manifest.components, 'components')) {
    if (!isRecord(item)) throw new ImportError('The manifest has an invalid component record.');
    const name = str(item.name, 'component name', 80);
    if (!COMPONENT_NAME.test(name)) throw new ImportError(`Component name ${JSON.stringify(name)} must use 1-80 letters, numbers, hyphens or underscores.`);
    if (names.has(name.toLowerCase())) throw new ImportError(`The archive contains component ${JSON.stringify(name)} more than once.`);
    names.add(name.toLowerCase());
    const category = item.category;
    if (category !== 'common' && category !== 'composition') throw new ImportError(`Component ${name} has an unknown category.`);
    const rootPath = (category === 'common' ? 'Common/' : 'Compositions/') + name;
    if (item.rootPath !== rootPath) throw new ImportError(`Component ${name} has an inconsistent root folder.`);
    const draft: WorkspaceFile[] = [];
    for (const file of list(item.files, `files for ${name}`)) {
      if (!isRecord(file)) throw new ImportError(`Component ${name} has an invalid file record.`);
      const archivePath = str(file.archivePath, 'archive path');
      if (!archivePath.startsWith('components/' + rootPath + '/')) throw new ImportError(`${archivePath} is outside component ${name}'s folder.`);
      const bytes = files.get(archivePath);
      if (!bytes) throw new ImportError(`Component ${name} references missing file ${JSON.stringify(archivePath)}.`);
      claim(archivePath, 'component', name);
      // Import the exported current source under its rooted archive layout, not historical paths.
      draft.push({ path: archivePath.slice('components/'.length), content: utf8(bytes, archivePath) });
    }
    let validated: WorkspaceFile[];
    try { validated = validateDraftFiles(draft); } catch (cause) { throw new ImportError(`Component ${name}: ${cause instanceof Error ? cause.message : 'invalid files'}`); }
    components.push({ name, category, rootPath, files: validated, warnings: [] });
  }
  if (!components.length) throw new ImportError('The archive contains no components.');

  // Preview builds each component alone; flag external and cross-component imports from the manifest inventory.
  for (const row of Array.isArray(manifest.imports) ? manifest.imports : []) {
    if (!isRecord(row) || typeof row.file !== 'string' || typeof row.kind !== 'string') continue;
    const owner = dispositions.get(row.file)?.detail;
    const component = components.find(item => item.name === owner);
    if (!component) continue;
    const resolved = typeof row.resolvedPath === 'string' ? row.resolvedPath : '';
    if (row.kind.startsWith('external')) component.warnings.push(`Imports ${String(row.specifier).slice(0, 120)}; preview only provides pinned template packages.`);
    else if (row.kind.startsWith('unresolved')) component.warnings.push(`Unresolved relative import ${String(row.specifier).slice(0, 120)}.`);
    else if (resolved && !resolved.startsWith('components/' + component.rootPath + '/')) component.warnings.push(`Imports another component (${resolved.slice(0, 160)}); it may not preview on its own.`);
  }
  for (const component of components) component.warnings = [...new Set(component.warnings)];

  const references: ImportedReference[] = [];
  for (const item of list(manifest.references, 'references')) {
    if (!isRecord(item)) throw new ImportError('The manifest has an invalid reference record.');
    const filename = str(item.filename, 'reference filename', 180);
    const purpose = item.purpose;
    if (typeof purpose !== 'string' || !Object.hasOwn(referencePurposes, purpose)) throw new ImportError(`Reference ${JSON.stringify(filename)} has an unknown purpose.`);
    const originalPath = str(item.originalPath, 'reference path');
    const textPath = str(item.textPath, 'reference text path');
    if (!originalPath.startsWith('references/originals/') || !textPath.startsWith('references/extracted-text/')) throw new ImportError(`Reference ${JSON.stringify(filename)} is stored outside the references folder.`);
    const bytes = files.get(originalPath);
    const textBytes = files.get(textPath);
    if (!bytes || !textBytes) throw new ImportError(`Reference ${JSON.stringify(filename)} is missing from the archive. All references must be restored.`);
    claim(originalPath, 'reference', filename);
    claim(textPath, 'reference', `${filename} (stored text)`);
    const text = utf8(textBytes, textPath);
    try {
      if (/\.pdf$/i.test(filename)) {
        if (bytes.length < 5 || bytes.length > MAX_PDF_BYTES || String.fromCharCode(...bytes.slice(0, 5)) !== '%PDF-') throw new Error('PDF reference is invalid or larger than 2 MiB.');
        if (!text.trim() || new TextEncoder().encode(text).length > MAX_PDF_TEXT_BYTES) throw new Error('Stored PDF text is empty or longer than 32 KiB.');
      } else {
        const content = validateReferenceFile(filename, bytes, purpose);
        if (content !== text) throw new Error('Stored text does not match the original file.');
      }
    } catch (cause) { throw new ImportError(`Reference ${JSON.stringify(filename)}: ${cause instanceof Error ? cause.message : 'invalid'}`); }
    references.push({ filename, purpose: purpose as ImportedReference['purpose'], bytes, text, origin: 'archive' });
  }

  // Archived guidance stays untrusted reference text; intake answers remain authoritative (owner decision).
  const design = files.get('docs/design.md');
  if (design) {
    if (design.length > MAX_REFERENCE_BYTES) throw new ImportError('docs/design.md is larger than the 128 KiB reference limit.');
    let text: string;
    try { text = validateReferenceFile('design.md', design, 'design'); } catch (cause) { throw new ImportError(`docs/design.md: ${cause instanceof Error ? cause.message : 'invalid'}`); }
    references.push({ filename: 'design.md', purpose: 'design', bytes: design, text, origin: 'design-guidance' });
    claim('docs/design.md', 'design-reference', 'Archived design guidance, attached as a reviewed reference.');
  }

  for (const path of files.keys()) {
    if (dispositions.has(path)) continue;
    if (HANDOFF.has(path)) { claim(path, 'handoff', 'Generated handoff document; not imported as a component or instruction.'); continue; }
    throw new ImportError(`${JSON.stringify(path)} is not assigned to any component or reference.`);
  }

  const warnings = ['Imported components are unverified drafts. Import validates storage only, not compilation.'];
  if (references.length > MAX_PROJECT_REFERENCES) warnings.push(`The archive brings ${references.length} references; a project can hold ${MAX_PROJECT_REFERENCES}.`);
  return {
    kind: 'complix', formatVersion: 1, root: root.replace(/\/$/, ''),
    totals: { files: entries.length, expandedBytes: entries.reduce((sum, entry) => sum + entry.bytes.length, 0) },
    technologies, components, references, files: [...dispositions.values()].sort((a, b) => a.path.localeCompare(b.path)), warnings,
  };
}

/**
 * Review-blocking issues against the target project's current state. All-or-nothing: confirmation
 * stays disabled until every issue is resolved (rename an archived reference or remove an intake upload).
 */
export function projectConflicts(plan: Pick<ImportPlan, 'components' | 'references'>, project: { componentNames: string[]; referenceFilenames: string[] }) {
  const issues: string[] = [];
  const existing = new Set(project.componentNames.map(name => name.toLowerCase()));
  for (const component of plan.components) if (existing.has(component.name.toLowerCase())) issues.push(`Component ${component.name} already exists in this project.`);
  const filenames = new Map<string, number>();
  for (const name of [...project.referenceFilenames, ...plan.references.map(reference => reference.filename)]) filenames.set(name.toLowerCase(), (filenames.get(name.toLowerCase()) ?? 0) + 1);
  for (const [name, count] of filenames) if (count > 1) issues.push(`Reference filename ${JSON.stringify(name)} is used ${count} times. Rename the archived reference or remove the existing upload.`);
  const total = project.referenceFilenames.length + plan.references.length;
  if (total > MAX_PROJECT_REFERENCES) issues.push(`This import would bring the project to ${total} references; the limit is ${MAX_PROJECT_REFERENCES}. Remove intake uploads first.`);
  return issues;
}

/** The reviewed plan as the backend payload: only names, categories, files and references, never archive IDs or grants. */
export function planToPayload(plan: Pick<ImportPlan, 'components' | 'references'>): ImportPayload {
  return {
    components: plan.components.map(item => ({ name: item.name, category: item.category, files: item.files })),
    references: plan.references.map(item => ({ filename: item.filename, purpose: item.purpose, bytes: item.bytes, text: item.text })),
  };
}

/** Reads and plans a ComPlix export in one step for the browser review. */
export async function planImportFromZip(zip: Uint8Array) {
  return planComplixImport(readZipEntries(zip));
}
