import { Button } from './Button';
import { useEffect, useId, useRef, type MouseEvent, type ReactNode } from 'react';

export function Modal({ open, title, onClose, children }: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (open && !element.open) element.showModal();
    if (!open && element.open) element.close();
  }, [open]);

  function closeFromBackdrop(event: MouseEvent<HTMLDialogElement>) {
    if (event.target === event.currentTarget) onClose();
  }

  return <dialog ref={dialog} className="app-modal" aria-labelledby={titleId}
    onCancel={event => { event.preventDefault(); onClose(); }}
    onClose={() => { if (open) onClose(); }}
    onClick={closeFromBackdrop}>
    <div className="modal-heading"><h2 id={titleId}>{title}</h2>
      <Button type="button" className="secondary modal-close" aria-label="Close dialog" onClick={onClose}>×</Button>
    </div>
    {children}
  </dialog>;
}
