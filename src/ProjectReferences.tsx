import { Button } from './components/Common/Button';
import { useState, useRef, type FormEvent } from 'react';
import { MAX_PROJECT_REFERENCES, MAX_REFERENCE_BYTES, MAX_PDF_BYTES, referenceExtensions, referencePurposes, referenceFailure, validateReferenceFile, validatePdfReference } from '../shared/referenceFiles';
import { extractPdfText } from './pdfText';

const isPdf = (name: string) => name.toLowerCase().endsWith('.pdf');

export type ReferencePreview = { id: bigint; filename: string; purpose: string; content: string; byteLength: number };
export function ProjectReferences({ editable, references, upload, uploadPdf, remove, heading = 'Project references' }: {
  editable: boolean; references: ReferencePreview[];
  upload: (filename: string, purpose: string, bytes: Uint8Array) => Promise<void>;
  uploadPdf: (filename: string, purpose: string, bytes: Uint8Array, text: string) => Promise<void>;
  heading?: string;
  remove: (referenceId: bigint) => Promise<void>;
}) {
  const [file, setFile] = useState<File>();
  const [purpose, setPurpose] = useState('design');
  const [busy, setBusy] = useState(false);
  const [phase, setPhase] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [selected, setSelected] = useState('');
  const [removing, setRemoving] = useState('');
  const input = useRef<HTMLInputElement>(null);
  const preview = references.find(row => row.id.toString() === selected) ?? references[0];
  async function submit(event: FormEvent) {
    event.preventDefault(); if (!file) return;
    setBusy(true); setError(''); setNotice(''); setPhase(isPdf(file.name) ? 'Extracting text from the PDF…' : 'Reading and checking text…');
    try {
      if (isPdf(file.name)) {
        if (file.size < 5 || file.size > MAX_PDF_BYTES) throw new Error('PDF files must be at most 2 MiB.');
        const bytes = new Uint8Array(await file.arrayBuffer());
        let text = '';
        try { text = await extractPdfText(bytes); } catch { throw new Error('No readable text was found in this PDF. Scanned or image-only PDFs are not supported yet.'); }
        validatePdfReference(file.name, bytes, text, purpose);
        setPhase('Uploading reference…');
        await uploadPdf(file.name, purpose, bytes, text);
      } else {
        if (file.size < 1 || file.size > MAX_REFERENCE_BYTES) throw new Error('Files must contain 1 byte to 128 KiB.');
        const bytes = new Uint8Array(await file.arrayBuffer());
        validateReferenceFile(file.name, bytes, purpose);
        setPhase('Uploading reference…');
        await upload(file.name, purpose, bytes);
      }
      setFile(undefined); if (input.current) input.current.value = '';
      setNotice('Reference saved. Its text is ready to use as project context.');
    } catch (cause) { setError(referenceFailure(cause)); }
    finally { setBusy(false); setPhase(''); }
  }
  return <section className="panel"><h2>{heading}</h2>
    <p className="note">Design guides, technical documentation and previous implementations for this project only. Uploads are reference material; they do not run code, change your library or start AI generation.</p>
    <p className="note">PDF style guides (up to 2 MiB; the first 32 KiB of text is used), plus UTF-8 Markdown, text and selected source files (up to 128 KiB). {MAX_PROJECT_REFERENCES} files per project. Scanned PDFs, images, ZIPs and links are not supported yet. Do not upload API keys or other credentials.</p>
    {editable ? <form onSubmit={event => void submit(event)}><fieldset disabled={busy}>
      <label>Reference purpose<select aria-label="Reference purpose" value={purpose} onChange={event => setPurpose(event.target.value)}>{Object.entries(referencePurposes).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <label>Reference file<input ref={input} aria-label="Reference file" type="file" accept={['pdf', ...referenceExtensions].map(ext => '.' + ext).join(',')} onChange={event => { setFile(event.target.files?.[0]); setError(''); setNotice(''); }} /></label>
      <Button disabled={!file || references.length >= MAX_PROJECT_REFERENCES}>Upload reference</Button>
      {references.length >= MAX_PROJECT_REFERENCES && <p>Reference limit reached. Remove a reference before uploading another.</p>}
    </fieldset></form> : <p className="note">Read-only access. Project editors can upload and remove references.</p>}
    {phase && <p role="status">{phase}</p>}{notice && <p role="status">{notice}</p>}{error && <p role="alert">{error}</p>}
    <p>{references.length} / {MAX_PROJECT_REFERENCES} references saved</p>
    {!references.length && <p>No references yet. Your saved project setup guidance is retained separately.</p>}
    <ul className="reference-list">{references.map(row => <li key={row.id.toString()}>
      <div><strong>{row.filename}</strong><p className="note">{referencePurposes[row.purpose as keyof typeof referencePurposes] ?? row.purpose} · {row.byteLength} bytes · {isPdf(row.filename) ? 'Ready (text extracted from PDF)' : 'Ready (UTF-8 text)'}</p></div>
      <Button type="button" variant="secondary" onClick={() => setSelected(row.id.toString())}>Preview {row.filename}</Button>
      {editable && <Button type="button" variant="secondary" disabled={busy} onClick={() => setRemoving(row.id.toString())}>Remove {row.filename}</Button>}
      {editable && removing === row.id.toString() && <div><p>Remove this reference and its stored original? This cannot be undone.</p><Button variant="danger" disabled={busy} onClick={() => {
        setBusy(true); setError(''); setNotice('');
        void remove(row.id).then(() => { setRemoving(''); setNotice('Reference removed.'); }).catch(cause => setError(referenceFailure(cause))).finally(() => setBusy(false));
      }}>Confirm removal of {row.filename}</Button><Button variant="secondary" disabled={busy} onClick={() => setRemoving('')}>Keep reference</Button></div>}
    </li>)}</ul>
    {preview && <section aria-label="Reference content preview"><h3>{preview.filename}</h3><p className="note">Plain-text content available as project context. Markdown and HTML are displayed as text.</p><pre data-testid="reference-content">{preview.content}</pre></section>}
  </section>;
}
