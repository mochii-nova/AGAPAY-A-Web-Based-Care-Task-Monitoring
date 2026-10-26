import { CircleAlert } from 'lucide-react';
import Modal from './Modal';

// "Are you sure?" pop-up. `danger` makes the confirm button red (for deactivate / delete).
// `error` shows inside the pop-up if the action failed.
export default function ConfirmModal({ open, title, children, confirmLabel, danger = false, busy = false, error, onConfirm, onClose }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <button type="button" className="btn btn--outline" onClick={onClose} disabled={busy}>Cancel</button>
          <button type="button" className={`btn ${danger ? 'btn--danger' : 'btn--primary'}`} onClick={onConfirm} disabled={busy}>
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
