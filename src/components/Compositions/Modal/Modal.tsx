import { useEffect, useId, useRef, type MouseEvent, type ReactNode } from 'react';
import { Button } from '../../Common/Button';
import { Badge } from '../../Common/Badge';
import { cn } from '../../../lib/utils';

export interface ModalProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children?: ReactNode;
  headerBadge?: ReactNode;
  titleId?: string;
  className?: string;
  showClose?: boolean;
  footer?: ReactNode;
}

export interface ModalHeaderProps {
  children?: ReactNode;
  className?: string;
}

export interface ModalTitleProps {
  children?: ReactNode;
  className?: string;
  id?: string;
}

export interface ModalBodyProps {
  children?: ReactNode;
  className?: string;
}

export interface ModalFooterProps {
  children?: ReactNode;
  className?: string;
}

export function ModalHeader({ children, className }: ModalHeaderProps) {
  return <div className={cn('modal-header flex shrink-0 items-center justify-between gap-3 border-b border-subtle bg-header px-4 py-3', className)}>{children}</div>;
}

// A real heading keeps the dialog title in the document outline for assistive technology.
export function ModalTitle({ children, className, id }: ModalTitleProps) {
  return <h2 className={cn('modal-title m-0 text-[14px] font-bold normal-case tracking-tight text-ink', className)} id={id}>{children}</h2>;
}

export function ModalBody({ children, className }: ModalBodyProps) {
  return <div className={cn('modal-body min-h-0 flex-1 overflow-auto p-4 text-[12.5px] leading-relaxed text-ink-secondary', className)}>{children}</div>;
}

export function ModalFooter({ children, className }: ModalFooterProps) {
  return <div className={cn('modal-footer flex shrink-0 items-center justify-between gap-2 border-t border-subtle bg-surface px-4 py-2.5 text-xs', className)}>{children}</div>;
}

export function Modal({
  open,
  title,
  onClose,
  children,
  headerBadge,
  titleId,
  className,
  showClose = true,
  footer,
}: ModalProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  const id = useId();
  const resolvedTitleId = titleId ?? id;

  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (open && !element.open) element.showModal();
    if (!open && element.open) element.close();
  }, [open]);

  function closeFromBackdrop(event: MouseEvent<HTMLDialogElement>) {
    if (event.target === event.currentTarget) onClose();
  }

  return (
    <dialog
      ref={dialog}
      className={cn(
        // `open:flex` (not `flex`): a display utility would otherwise override the closed dialog's display: none.
        'app-modal modal-window m-auto w-full max-w-[min(540px,calc(100vw-32px))] max-h-[min(90dvh,900px)] overflow-hidden rounded-[2px] border border-strong bg-canvas p-0 text-ink shadow-[4px_4px_0px_var(--border-strong)] open:flex open:flex-col backdrop:bg-[rgba(9,9,11,0.5)]',
        className
      )}
      aria-labelledby={resolvedTitleId}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClose={() => {
        if (open) onClose();
      }}
      onClick={closeFromBackdrop}
    >
      <ModalHeader>
        <div className="modal-title-group flex min-w-0 items-center gap-2">
          {headerBadge && <Badge variant="lemon">{headerBadge}</Badge>}
          <ModalTitle id={resolvedTitleId}>{title}</ModalTitle>
        </div>
        {showClose && (
          <Button type="button" variant="secondary" size="sm" className="modal-close m-0 shrink-0 px-[7px] py-[2px] font-mono font-medium" aria-label="Close dialog" onClick={onClose}>
            ESC ✕
          </Button>
        )}
      </ModalHeader>
      <ModalBody>{children}</ModalBody>
      {footer && <ModalFooter>{footer}</ModalFooter>}
    </dialog>
  );
}
