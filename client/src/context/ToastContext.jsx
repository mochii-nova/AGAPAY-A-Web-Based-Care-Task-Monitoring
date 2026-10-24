import { createContext, useCallback, useContext, useState } from 'react';
import { CircleCheck, CircleAlert, X } from 'lucide-react';

const ToastContext = createContext();
const SHOW_MS = 4000;

// Small messages that pop up in the corner after saving ("Task marked as completed")
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => setToasts((list) => list.filter((t) => t.id !== id)), []);

  // tone: 'success' | 'error'
  const showToast = useCallback(
    (message, tone = 'success') => {
      const id = `${Date.now()}-${Math.random()}`;
      setToasts((list) => [...list, { id, message, tone }]);
      setTimeout(() => dismiss(id), SHOW_MS);
    },
    [dismiss]
  );

  return (
    <ToastContext.Provider value={showToast}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast--${t.tone}`}>
            {t.tone === 'error' ? <CircleAlert size={20} aria-hidden="true" /> : <CircleCheck size={20} aria-hidden="true" />}
            <span>{t.message}</span>
            <button type="button" className="icon-btn icon-btn--sm" onClick={() => dismiss(t.id)} aria-label="Dismiss message">
              <X size={16} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
