import { limitPdfText } from '../shared/referenceFiles';

/**
 * Extracts selectable text from a PDF in the browser. pdf.js loads only when a PDF is chosen.
 * The document is parsed in a worker and never rendered, so embedded scripts and forms never run.
 */
export async function extractPdfText(bytes: Uint8Array): Promise<string> {
  // The legacy build: the modern one needs very new APIs (e.g. Uint8Array.prototype.toHex) and hangs without them.
  const [pdfjs, worker] = await Promise.all([import('pdfjs-dist/legacy/build/pdf.mjs'), import('pdfjs-dist/legacy/build/pdf.worker.min.mjs?url')]);
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
  // pdf.js transfers the buffer it receives, so pass a copy and keep the original bytes for upload.
  // pdf.js 6 has no eval-based font path (the isEvalSupported option was removed); XFA forms stay off.
  const task = pdfjs.getDocument({ data: bytes.slice(), enableXfa: false, stopAtErrors: false });
  const document = await task.promise;
  try {
    const pages: string[] = [];
    for (let number = 1; number <= Math.min(document.numPages, 200); number++) {
      const page = await document.getPage(number);
      const content = await page.getTextContent();
      pages.push(content.items.map(item => ('str' in item ? item.str + (item.hasEOL ? '\n' : ' ') : '')).join(''));
      page.cleanup();
      if (pages.join('\n\n').length > 200000) break;
    }
    return limitPdfText(pages.join('\n\n'));
  } finally { await task.destroy(); }
}
