import type { WorkspaceFile } from './stackAdapters';

export const MAX_DRAFT_BYTES = 256 * 1024;
/** Validate data only. Files must never be evaluated by the application host. */
export function validateDraftFiles(input: unknown): WorkspaceFile[] {
  if (!Array.isArray(input) || !input.length || input.length > 20) throw new Error('A draft must contain 1–20 files.');
  const paths = new Set<string>();
  let bytes = 0;
  return input.map(file => {
    if (!file || typeof file.path !== 'string' || typeof file.content !== 'string' || file.path.length > 180 ||
      !file.path || file.path.startsWith('/') || /[\\:\u0000-\u001f\u007f]/.test(file.path) ||
      file.path.split('/').some((part: string) => !part || part === '.' || part === '..' || part.toLowerCase().startsWith('.env')) ||
      paths.has(file.path.toLowerCase())) throw new Error('Draft contains an unsafe or duplicate file path.');
    paths.add(file.path.toLowerCase());
    bytes += new TextEncoder().encode(file.content).length;
    if (bytes > MAX_DRAFT_BYTES) throw new Error('Draft files exceed 256 KiB.');
    return { path: file.path, content: file.content };
  });
}
