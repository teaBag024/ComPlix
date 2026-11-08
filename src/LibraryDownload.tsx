import { useState } from 'react';
import type { LibraryExportSnapshot } from '../shared/libraryExport';
import type { DbConnection } from './module_bindings';
import { Button } from './components/Common/Button';
import { Modal } from './components/Compositions/Modal';

export function LibraryDownload({ projectId, connection, flush }: { projectId: bigint; connection: DbConnection; flush: () => Promise<unknown> }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [snapshot, setSnapshot] = useState<LibraryExportSnapshot>();
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  function fail(cause: unknown) {
    const text = cause instanceof Error ? cause.message : String(cause);
    const known = ['No saved component files are available to export.', 'Library export exceeds the 64 MiB prototype limit. No files were omitted.', 'Remove credentials from library files, guidance or references before exporting.', 'Your session expired. Sign in again and retry.', 'Export contains an unsafe file path. No ZIP was created.'];
    setError(known.find(message => text.includes(message)) ?? (text.startsWith('Component files conflict at ') ? text : 'Export could not be prepared. Check your connection, project access and saved draft status, then retry.'));
  }
  async function prepare() {
    setOpen(true); setBusy(true); setError(''); setNotice(''); setSnapshot(undefined);
    try {
      await flush();
      setSnapshot(await connection.procedures.prepareLibraryExport({ projectId }));
    } catch (cause) { fail(cause); }
    finally { setBusy(false); }
  }
  async function download() {
    if (!snapshot) return;
    setBusy(true); setError(''); setNotice('');
    try {
      // Recheck current access before releasing the already reviewed immutable snapshot.
      // A newer project snapshot does not silently replace the revisions shown in this dialog.
      await connection.procedures.prepareLibraryExport({ projectId });
      const { createLibraryZip } = await import('../shared/libraryExport');
      const archive = await createLibraryZip(snapshot);
      const url = URL.createObjectURL(new Blob([Uint8Array.from(archive.bytes).buffer], { type: 'application/zip' }));
      const anchor = document.createElement('a'); anchor.href = url; anchor.download = archive.filename;
      document.body.append(anchor); anchor.click(); anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 10000);
      setNotice('ZIP download started. All included components remain unverified drafts.');
    } catch (cause) { fail(cause); }
    finally { setBusy(false); }
  }
  return <>
    <Button type="button" variant="secondary" disabled={busy} onClick={() => void prepare()}>Download library ZIP</Button>
    <Modal open={open} title="Download component library" onClose={() => { if (!busy) setOpen(false); }}>
      <p>Exports the latest completed saved draft for every component, including that draft's saved manual edits. Selecting older history in the editor does not change this selection. Mock, failed and cancelled results are excluded.</p>
      {busy && <p role="status">{snapshot ? 'Building ZIP…' : 'Saving edits and preparing library snapshot…'}</p>}
      {error && <p role="alert">{error}</p>}
      {snapshot && <>
        <p>Snapshot: {snapshot.exportedAt}. {snapshot.components.length} components and all {snapshot.references.length} uploaded references.</p>
        <p className="note">Includes README.md, AGENTS.md, saved design guidance, original reference bytes and extracted text, source documentation/examples, and a checksum manifest. This is an unverified source handoff; clean-project integration has not been verified.</p>
        <ul aria-label="Export component revisions">{snapshot.components.map(component => <li key={component.id}>{component.name} — source job {component.jobId}, saved revision {component.revision}, {component.origin}, unverified</li>)}</ul>
        {snapshot.warnings.map((warning, index) => <p key={index} className="note">{warning}</p>)}
        <p>All project references are included, including original PDFs. Review before sharing this ZIP with other people or agents.</p>
        <Button type="button" disabled={busy} onClick={() => void download()}>Download ZIP</Button>
      </>}
      {!busy && error && <Button type="button" variant="secondary" onClick={() => void prepare()}>Prepare again</Button>}
      <Button type="button" variant="secondary" disabled={busy} onClick={() => setOpen(false)}>Close</Button>
      {notice && <p role="status">{notice}</p>}
    </Modal>
  </>;
}
