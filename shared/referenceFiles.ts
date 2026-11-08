// Shared intake rules; reference content is data and must never be executed.
export const MAX_REFERENCE_BYTES = 128 * 1024;
export const MAX_PROJECT_REFERENCES = 20;
export const referencePurposes = {
  design: 'Design guide', implementation: 'Previous implementation', documentation: 'Technical documentation',
} as const;
export const referenceExtensions = ['txt', 'md', 'markdown', 'js', 'jsx', 'mjs', 'cjs', 'ts', 'tsx', 'css', 'scss', 'sass', 'less', 'html', 'htm', 'json', 'yaml', 'yml', 'cs', 'razor', 'cshtml', 'vue', 'svelte', 'py', 'java', 'kt', 'kts', 'swift', 'go', 'rs', 'cpp', 'cc', 'c', 'h', 'hpp', 'sql', 'xml', 'toml'];
export function validateReferenceFile(filename: string, bytes: Uint8Array, purpose: string) {
  if (!filename.trim() || filename.length > 180 || /[\/\\:\u0000-\u001f\u007f]/.test(filename) || filename !== filename.trim()) {
    throw new Error('Use a filename of 1-180 characters without paths or control characters.');
  }
  if (!referenceExtensions.includes(filename.split('.').pop()?.toLowerCase() ?? '')) throw new Error('Choose a supported text, Markdown or source file. PDF, images and archives are not supported yet.');
  if (!(purpose in referencePurposes) || !Object.hasOwn(referencePurposes, purpose)) throw new Error('Choose a reference purpose.');
  if (!bytes.length || bytes.length > MAX_REFERENCE_BYTES) throw new Error('Files must contain 1 byte to 128 KiB.');
  let content: string;
  try { content = new TextDecoder('utf-8', { fatal: true }).decode(bytes); }
  catch { throw new Error('The file must be valid UTF-8 text.'); }
  if (!content.trim() || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(content)) throw new Error('The file must contain readable text without binary control characters.');
  return content;
}
export function referenceFailure(cause: unknown) {
  const message = cause instanceof Error ? cause.message : '';
  const safe = ['Use a filename of 1-180 characters without paths or control characters.',
    'Choose a supported text, Markdown or source file. PDF, images and archives are not supported yet.',
    'Choose a reference purpose.', 'Files must contain 1 byte to 128 KiB.', 'The file must be valid UTF-8 text.',
    'The file must contain readable text without binary control characters.', 'This project already has 20 references.',
    'A reference with this filename already exists. Remove it first or use a different filename.',
    'Project edit access is required.', 'Your session expired. Sign in again and retry.', 'Reference not found or access denied.'];
  return safe.find(text => message.includes(text)) ?? 'The reference operation could not be confirmed. Check your connection and project access, then retry.';
}
