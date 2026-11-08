import { useState } from 'react';
import { Modal } from '..';
import { Button } from '../../../Common/Button';

// Demonstration only: the confirm handler just closes the dialog.
export default function ModalPreview() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button type="button" onClick={() => setOpen(true)}>Open modal</Button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Promote candidate draft"
        headerBadge="Promotion gate"
        footer={<>
          <Button type="button" variant="secondary" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
          <Button type="button" variant="mint" size="sm" onClick={() => setOpen(false)}>Confirm promotion</Button>
        </>}
      >
        <p>You are promoting Button.tsx to the shared library.</p>
        <p className="rounded-[2px] border border-[rgba(250,204,21,0.4)] bg-[#FEF9C3] p-2.5 font-mono text-[11.5px] text-[#854D0E] dark:bg-[rgba(250,204,21,0.16)] dark:text-[#FDE047]">
          Honesty check: no build or tests have run for this draft.
        </p>
      </Modal>
    </>
  );
}
