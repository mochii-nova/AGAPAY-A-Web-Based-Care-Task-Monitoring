import { useEffect, useId, useRef } from 'react';
import { X } from 'lucide-react';

// Pop-up window. Uses the browser's <dialog>, which already handles
// Escape to close and keeps keyboard focus inside while it's open.
// size: 'sm' | 'md' | 'lg'
export default function Modal({ open, onClose, title, size = 'md', children, footer }) {
  const dialogRef = useRef(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  // Clicking the dark area outside the box closes it
  const handleClick = (e) => {
    if (e.target === dialogRef.current) onClose();
  };

  return (
    <dialog ref={dialogRef} className={`modal modal--${size}`} aria-labelledby={titleId} onClose={onClose} onClick={handleClick}>
      {open && (
        <div className="modal__box">
          <header className="modal__header">
            <h2 id={titleId}>{title}</h2>
            <button type="button" className="icon-btn icon-btn--sm" onClick={onClose} aria-label="Close">
              <X size={18} />
            </button>
          </header>
          <div className="modal__body">{children}</div>
          {footer && <footer className="modal__footer">{footer}</footer>}
        </div>
      )}
    </dialog>
  );
}
