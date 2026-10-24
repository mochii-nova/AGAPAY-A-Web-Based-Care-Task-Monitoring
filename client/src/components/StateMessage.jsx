import { LoaderCircle, CircleAlert, RefreshCw } from 'lucide-react';

// "Loading…" with a spinning icon
export function LoadingState({ label = 'Loading…' }) {
  return (
    <div className="state-msg" role="status">
      <LoaderCircle size={24} className="spin" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}

// Error message with a "Try again" button
export function ErrorState({ message, onRetry }) {
  return (
    <div className="state-msg state-msg--error" role="alert">
      <CircleAlert size={24} aria-hidden="true" />
      <span>{message}</span>
      {onRetry && (
        <button type="button" className="btn btn--outline btn--sm" onClick={onRetry}>
          <RefreshCw size={16} aria-hidden="true" /> Try again
        </button>
      )}
    </div>
  );
}

// Friendly message when there's nothing to show
export function EmptyState({ icon: Icon, children }) {
  return (
    <div className="state-msg">
      {Icon && <Icon size={24} aria-hidden="true" />}
      <span>{children}</span>
    </div>
  );
}
