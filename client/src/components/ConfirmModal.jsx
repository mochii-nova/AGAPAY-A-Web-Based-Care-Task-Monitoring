import { useRef } from 'react';
import { CircleAlert } from 'lucide-react';
import Modal from './Modal';

// "Are you sure?" pop-up. `danger` makes the confirm button red (for deactivate / delete).
// `error` shows inside the pop-up if the action failed.
// A second click while onConfirm is still running is ignored, so nothing is done twice.
export default function ConfirmModal({ open, title, children, confirmLabel, danger = false, busy = false, error, onConfirm, onClose }) {
  const running = useRef(false);
  const confirm = async () => {
    if (running.current || busy) return;
    running.current = true;
    try {
      await onConfirm();
    } finally {
      running.current = false;
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <button type="button" className="btn btn--outline" onClick={onClose} disabled={busy}>Cancel</button>
          <button type="button" className={`btn ${danger ? 'btn--danger' : 'btn--primary'}`} onClick={confirm} disabled={busy}>
            {busy ? 'Saving…' : confirmLabel}
          </button>
        </>
      }
    >
      {error && (
        <div className="alert alert--error" role="alert">
          <CircleAlert size={18} aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}
      {children}
    </Modal>
  );
}
