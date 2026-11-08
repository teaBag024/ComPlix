// Shared intake rules; reference content is data and must never be executed.
export const MAX_REFERENCE_BYTES = 128 * 1024;
export const MAX_PROJECT_REFERENCES = 20;
// PDFs keep their original bytes for provenance; only the browser-extracted text is used as context.
export const MAX_PDF_BYTES = 2 * 1024 * 1024;
export const MAX_PDF_TEXT_BYTES = 32 * 1024;
const controlCharacters = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g;
const PDF_ERRORS = {
  type: 'Choose a PDF file (.pdf).', size: 'PDF files must be at most 2 MiB.',
  text: 'No readable text was found in this PDF. Scanned or image-only PDFs are not supported yet.',
  length: 'Extracted PDF text is too long. Upload a shorter document.',
} as const;
/** Validates a PDF upload and its extracted text. The server never parses or renders the PDF itself. */
export function validatePdfReference(filename: string, bytes: Uint8Array, text: string, purpose: string) {
  if (!filename.trim() || filename.length > 180 || /[\/\\:\u0000-\u001f\u007f]/.test(filename) || filename !== filename.trim()) {
    throw new Error('Use a filename of 1-180 characters without paths or control characters.');
  }
  if (filename.split('.').pop()?.toLowerCase() !== 'pdf') throw new Error(PDF_ERRORS.type);
  if (!(purpose in referencePurposes) || !Object.hasOwn(referencePurposes, purpose)) throw new Error('Choose a reference purpose.');
  if (bytes.length < 5 || bytes.length > MAX_PDF_BYTES) throw new Error(PDF_ERRORS.size);
  if (String.fromCharCode(...bytes.slice(0, 5)) !== '%PDF-') throw new Error(PDF_ERRORS.type);
  if (!text.trim() || new RegExp(controlCharacters.source).test(text)) throw new Error(PDF_ERRORS.text);
  if (new TextEncoder().encode(text).length > MAX_PDF_TEXT_BYTES) throw new Error(PDF_ERRORS.length);
  return text;
}
/** Normalizes extracted text and trims it to the stored limit, marking any truncation. */
export function limitPdfText(text: string) {
  const cleaned = text.replace(controlCharacters, ' ').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
  if (new TextEncoder().encode(cleaned).length <= MAX_PDF_TEXT_BYTES) return cleaned;
  const note = '\n\n[Text truncated to the first 32 KiB.]';
  let end = Math.min(cleaned.length, MAX_PDF_TEXT_BYTES);
  while (end > 0 && new TextEncoder().encode(cleaned.slice(0, end) + note).length > MAX_PDF_TEXT_BYTES) end -= 256;
  return cleaned.slice(0, Math.max(0, end)) + note;
}
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
    ...Object.values(PDF_ERRORS), 'Project edit access is required.', 'Your session expired. Sign in again and retry.', 'Reference not found or access denied.'];
  return safe.find(text => message.includes(text)) ?? 'The reference operation could not be confirmed. Check your connection and project access, then retry.';
}
