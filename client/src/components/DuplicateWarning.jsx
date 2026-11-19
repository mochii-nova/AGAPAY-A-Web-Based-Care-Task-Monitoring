import { useEffect, useRef } from 'react';
import { TriangleAlert } from 'lucide-react';

// "A resident named Hannah Perez already exists (…). Add another one anyway?" shown inside a form,
// above its buttons. Cancel is the default (it gets the focus, so Enter cancels); "Add anyway" saves.
export default function DuplicateWarning({ children, confirmLabel = 'Add anyway', onCancel, onConfirm }) {
  const cancelRef = useRef(null);
  useEffect(() => {
    cancelRef.current?.focus();
  }, []);
  return (
    <div className="alert alert--warning dup-warning" role="alertdialog" aria-labelledby="dup-warning-text">
      <TriangleAlert size={18} aria-hidden="true" />
      <div className="dup-warning__body">
        <p id="dup-warning-text">{children}</p>
        <div className="dup-warning__actions">
          <button ref={cancelRef} type="button" className="btn btn--outline btn--sm" onClick={onCancel}>Cancel</button>
          <button type="button" className="btn btn--primary btn--sm" onClick={onConfirm}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}
